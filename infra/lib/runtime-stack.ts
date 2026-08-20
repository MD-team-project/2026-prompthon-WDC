import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/** Non-secret name of the SecureString an operator creates outside CDK. */
const FRIENDLI_API_KEY_SSM_PARAMETER = '/prompthon/friendli-api-key';

/** Backend runtime host. What it deliberately omits, and why: infra/README.md. */
export class RuntimeStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', { isDefault: true });

    // No ingress rules are added. Administration goes through Session Manager,
    // and application ingress stays closed until the NFR-5.2 passcode gate exists.
    const securityGroup = new ec2.SecurityGroup(this, 'BackendSecurityGroup', {
      vpc,
      description: 'prompthon backend host: egress only, no inbound',
      allowAllOutbound: true,
    });

    const role = new iam.Role(this, 'BackendRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'prompthon backend host: Session Manager, Bedrock, Transcribe, one SSM parameter',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParameter'],
        resources: [
          `arn:aws:ssm:${this.region}:${this.account}:parameter${FRIENDLI_API_KEY_SSM_PARAMETER}`,
        ],
      }),
    );

    role.addToPolicy(
      new iam.PolicyStatement({
        // Converse and ConverseStream authorize on these two actions; there is no
        // `bedrock:Converse` IAM action.
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: [
          // Region wildcard is required, not sloppy: the `us.` inference profiles
          // this project uses fan out to sibling regions, and the call fails
          // without foundation-model permission in the destination region.
          'arn:aws:bedrock:*::foundation-model/*',
          `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/*`,
        ],
      }),
    );

    role.addToPolicy(
      new iam.PolicyStatement({
        // Streaming transcription has no resource-level permission, so `*` is
        // the only option AWS offers here.
        actions: ['transcribe:StartStreamTranscription'],
        resources: ['*'],
      }),
    );

    const instance = new ec2.Instance(this, 'BackendHost', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup,
      role,
      requireImdsv2: true,
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(20, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
            encrypted: true,
          }),
        },
      ],
    });

    // Identifiers CloudFormation generates and nothing else can predict.
    // Everything derivable from a constant lives in README.md / .env-example.
    new CfnOutput(this, 'InstanceId', { value: instance.instanceId });
    new CfnOutput(this, 'SecurityGroupId', { value: securityGroup.securityGroupId });
    new CfnOutput(this, 'BackendRoleArn', { value: role.roleArn });
  }
}
