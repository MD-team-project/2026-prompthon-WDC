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

// business-rules.md validation rule 4: the runtime-first deployment must prove
// no placeholder table was created before BE supplied access patterns.
test('no DynamoDB placeholder', () => {
  assert.deepEqual(template.findResources('AWS::DynamoDB::Table'), {});
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
