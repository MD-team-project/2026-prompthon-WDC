# prompthon infrastructure

TypeScript CDK. One stack, `prompthon-runtime`: an EC2 backend host with an
instance role, an egress-only security group, and no inbound rules at all.

**Read this before applying the stack in a new account.** Three things the IaC
cannot express will make a perfect deploy still fail to run the app.

---

## Prerequisites the IaC cannot create

### 1. Bedrock model access is a console action

No entitlement API exists, and no CloudFormation or Terraform resource covers
it. A new account applies this stack cleanly and then fails at the first model
call, with nothing in the CDK logs to explain why.

In the Bedrock console, under **Model access**, enable at minimum:

| Purpose | Model ID to invoke |
|---|---|
| Default (Agentic Control) | `us.anthropic.claude-opus-4-6-v1` |
| Faster fallback | `us.anthropic.claude-haiku-4-5-20251001-v1:0` |
| Cheapest floor | `amazon.nova-lite-v1:0` |

**The `us.` prefix is mandatory** for the Anthropic models. These are
`INFERENCE_PROFILE` models: the bare ID (`anthropic.claude-...`) fails with
"Invocation of model ID ... with on-demand throughput isn't supported". Verified
against account `643922457910` on 2026-08-20.

Entitlements are per-account. The census in `aidlc-docs/aidlc-state.md` describes
the current account only and does not transfer.

### 2. `FRIENDLI_API_KEY` comes from Friendli, not AWS

Local development: paste the value into the gitignored workspace-root `.env`.

Hosted execution: an operator creates the SecureString **outside CDK**. CDK only
references the name and grants the role permission to read it.

```sh
# Reads the value from a prompt, so it does not land in shell history.
read -rs FRIENDLI_KEY
aws ssm put-parameter \
  --name /prompthon/friendli-api-key \
  --type SecureString \
  --value "$FRIENDLI_KEY" \
  --overwrite --region us-east-1
unset FRIENDLI_KEY
```

This uses the default AWS managed key `alias/aws/ssm`. Secrets Manager, a
customer-managed KMS key, and rotation are out of scope until something needs
them.

### 3. The account permission boundary is not ours

The current account is AWS Workshop Studio (`WSParticipantRole`) and carries a
boundary this stack works within rather than against:

- **Region lock.** Everything outside `us-east-1` is denied, with a NotAction
  exception list. The stack has no hard-coded region, so it can be reused
  elsewhere; in *this* account any other region simply fails on the first call.
- `iam:CreateRole` and `iam:CreatePolicy` are allowed. **`iam:CreateUser` is not.**
- **`iam:PassRole` excludes `ecs-tasks.amazonaws.com`**, which is why the runtime
  is EC2 rather than Fargate. If a future account allows it, that choice is worth
  revisiting.

A corporate account may need approval for IAM role creation. That is the one
place `cdk bootstrap` can be blocked.

### Local toolchain

Node **22 or newer** (`@langchain/openai` requires it). AWS credentials resolving
to `us-east-1`.

---

## Commands

Run from this directory. `cdk` resolves to the pinned `2.1135.0` CLI in
`devDependencies`, not whatever is installed globally.

```sh
npm install --workspaces --include-workspace-root   # from the repo root
npm run typecheck
npm test          # template assertions: no ingress, no DynamoDB, no key pair, no secrets
npm run synth
npx cdk diff
npx cdk bootstrap  # first time in an account/region only - see the warning below
npm run deploy
```

`aws-cdk-lib` is pinned exactly at `2.266.0` and the CLI at `2.1135.0`. Keep both
pinned; a CLI newer than the bootstrap stack it targets will refuse to deploy.

### `cdk bootstrap` creates account-level resources

It creates a `CDKToolkit` stack: an S3 staging bucket, an ECR repository, an SSM
parameter, and **five IAM roles**. This is per account and region, it is a
prerequisite for any CDK deploy, and it dies with the account. Any future account
needs it again. There is no way to skip it with CDK.

### Teardown

```sh
npx cdk destroy prompthon-runtime
```

During idle hours, stopping the instance is enough and cheaper than redeploying.
`t3.small` is roughly $0.023/hr on demand.

---

## What the stack does not do

Two startup steps are documented here instead of being written as User Data.
There is no application to start yet, and an untested boot script against a
nonexistent app is worse than a checklist.

After `aws ssm start-session --target <instance-id>`:

```sh
# 1. Node 22 on Amazon Linux 2023
sudo dnf install -y nodejs22 && node -v

# 2. Inject the Friendli key into the backend process only. Not into a file,
#    not into the shell profile, not into a log.
export FRIENDLI_API_KEY=$(aws ssm get-parameter \
  --name /prompthon/friendli-api-key --with-decryption \
  --query Parameter.Value --output text --region us-east-1)
```

Also deliberately absent, each waiting on a concrete need rather than a guess:

- **DynamoDB.** Added once BE supplies validated access patterns with caller,
  operation, owner boundary, consistency, result bound, and rough request rate.
  No placeholder table, because the base key is immutable once created.
- **Public application ingress.** The security group has zero inbound rules.
  Opening one requires the NFR-5.2 shared passcode gate to exist first.
- **SSH key pair and bastion.** Session Manager covers administration, so there
  is no inbound port and no private key to lose.
- **Custom VPC.** The default VPC already has public subnets with egress.
- CI/CD, monitoring, alarms, log groups, S3, CloudFront, Lambda, API Gateway, ECS.

---

## Environment contract

Names only. See `.env-example` at the repo root for the copyable form.

| Name | Scope | Secret |
|---|---|---|
| `AWS_PROFILE` | Local only. Hosted uses the instance role | No |
| `AWS_REGION` | Both. Must be `us-east-1` | No |
| `BEDROCK_MODEL_ID` | Backend. Never hard-code it in agent logic | No |
| `FRIENDLI_API_KEY` | Local `.env`, or injected into process memory on the host | **Yes** |
| `FRIENDLI_API_KEY_SSM_PARAMETER` | Hosted. The name is not the value | No |

The plaintext Friendli key never enters CDK context, a CloudFormation template
or output, User Data, the repository, or a log. Stack outputs carry identifiers
and names only.
