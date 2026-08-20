import { App } from 'aws-cdk-lib';
import { RuntimeStack } from '../lib/runtime-stack';

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;

// The default-VPC lookup cannot run against an environment-agnostic stack.
if (!account || !region) {
  throw new Error(
    'Account and region must resolve from AWS credentials. Set AWS_PROFILE and AWS_REGION, then retry.',
  );
}

const app = new App();
new RuntimeStack(app, 'prompthon-runtime', { env: { account, region } });
