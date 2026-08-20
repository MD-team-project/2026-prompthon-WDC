import assert from 'node:assert/strict';
import test from 'node:test';
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { RuntimeStack } from '../lib/runtime-stack';

const app = new App();
const stack = new RuntimeStack(app, 'test-runtime', {
  env: { account: '000000000000', region: 'us-east-1' },
});
const template = Template.fromStack(stack);

test('no inbound path to the host: no ingress rule, no key pair', () => {
  assert.deepEqual(template.findResources('AWS::EC2::SecurityGroupIngress'), {});
  for (const group of Object.values(template.findResources('AWS::EC2::SecurityGroup'))) {
    assert.deepEqual(group.Properties.SecurityGroupIngress ?? [], []);
  }
  assert.deepEqual(template.findResources('AWS::EC2::KeyPair'), {});
  for (const instance of Object.values(template.findResources('AWS::EC2::Instance'))) {
    assert.equal(instance.Properties.KeyName, undefined);
  }
});

// One table, and its immutable part carries no domain meaning. If a future edit
// puts something like `deviceId` in the base key, changing it later means
// replacing the table, so this asserts the neutrality rather than the names.
test('single table with meaning-neutral base keys, on demand, no LSI', () => {
  const tables = Object.values(template.findResources('AWS::DynamoDB::Table'));
  assert.equal(tables.length, 1);
  const [props] = tables.map((t) => t.Properties);
  assert.deepEqual(props.KeySchema, [
    { AttributeName: 'pk', KeyType: 'HASH' },
    { AttributeName: 'sk', KeyType: 'RANGE' },
  ]);
  assert.equal(props.BillingMode, 'PAY_PER_REQUEST');
  // LSIs cannot be added after creation, so an accidental one is unfixable.
  assert.equal(props.LocalSecondaryIndexes, undefined);
});

test('table grants are scoped to the table, not to all of DynamoDB', () => {
  // grantReadWriteData emits read and write as separate statements, so this
  // checks every one of them rather than assuming a count.
  const resources = Object.values(template.findResources('AWS::IAM::Policy'))
    .flatMap((policy) => policy.Properties.PolicyDocument.Statement)
    .filter((s: { Action: string | string[] }) => JSON.stringify(s.Action).includes('dynamodb:'))
    .map((s: { Resource: unknown }) => JSON.stringify(s.Resource));

  assert.ok(resources.length > 0, 'expected at least one DynamoDB statement');
  for (const resource of resources) {
    assert.doesNotMatch(resource, /"\*"/);
    assert.match(resource, /AppTable/);
  }
});

test('ssm:GetParameter is scoped to exactly one parameter and nothing else', () => {
  const statements = Object.values(template.findResources('AWS::IAM::Policy'))
    .flatMap((policy) => policy.Properties.PolicyDocument.Statement)
    .filter((s: { Action: string | string[] }) => JSON.stringify(s.Action).includes('ssm:'));

  assert.equal(statements.length, 1, 'expected a single SSM statement');
  const [statement] = statements;
  // CDK renders a lone action as a bare string rather than a one-element array.
  assert.deepEqual([statement.Action].flat(), ['ssm:GetParameter']);
  assert.equal(statement.Resource, 'arn:aws:ssm:us-east-1:000000000000:parameter/prompthon/friendli-api-key');
});

// business-rules.md environment rules 5 and 9: no plaintext secret may reach a
// template or an output. Cheap standing guard for when User Data is added.
test('template carries no secret material', () => {
  const serialized = JSON.stringify(template.toJSON());
  for (const pattern of [/FRIENDLI_API_KEY=/, /Bearer /, /AKIA[0-9A-Z]{16}/]) {
    assert.doesNotMatch(serialized, pattern);
  }
});
