# INFRA Runtime Contract

The `RuntimeContract` record from `domain-entities.md`. State: **published**.
This is what BE consumes. Nothing here is secret.

**Published**: 2026-08-20T10:20:00Z

## Deployed runtime

| Field | Value |
|---|---|
| Account | `643922457910` |
| Region | `us-east-1` |
| Stack name | `prompthon-runtime` |
| EC2 instance | `i-0ede6aab809e7c1b0` (`t3.small`, Amazon Linux 2023, `us-east-1a`) |
| Instance role | `arn:aws:iam::643922457910:role/prompthon-runtime-BackendRole78202DE5-AcROqSKNntXL` |
| Instance profile | `prompthon-runtime-BackendHostInstanceProfile2E6808AE-5FfIv3maSr3N` |
| Security group | `sg-0715b9fa40c2c378d` — **zero inbound rules**, egress open |
| Management path | SSM Session Manager. `aws ssm start-session --target i-0ede6aab809e7c1b0 --region us-east-1` |
| SSM parameter name | `/prompthon/friendli-api-key`, `SecureString`, version 2 |
| DynamoDB table | `prompthon-app` — `ACTIVE`, keys `pk`/`sk` (String), on-demand, 0 indexes |
| Deployment status | `verified` |

## What the instance role can do

Granted to the role the host actually uses. No unused role, no IAM user, no
long-lived access key.

| Capability | Actions | Scope |
|---|---|---|
| Management | `AmazonSSMManagedInstanceCore` | AWS managed policy |
| Friendli key read | `ssm:GetParameter` | Exactly `arn:aws:ssm:us-east-1:643922457910:parameter/prompthon/friendli-api-key`. No list, no path read, no write |
| Bedrock | `InvokeModel`, `InvokeModelWithResponseStream` | `arn:aws:bedrock:*::foundation-model/*` and `inference-profile/*` in this account. The region wildcard is required because `us.` inference profiles fan out to sibling regions |
| Transcribe | `StartStreamTranscription` | `*` — streaming transcription has no resource-level permission in IAM |

| DynamoDB | read and write item operations | `prompthon-app` table ARN only. No `dynamodb:*`, no table wildcard |

**Converse needs no separate grant.** `bedrock:Converse` and `bedrock:ConverseStream` do exist as IAM actions, but Converse depends on Invoke, so the two actions above cover it. Confirmed by a real `bedrock-runtime converse` call from the instance under this exact policy. If you ever write a **Deny** policy, that asymmetry matters: denying `InvokeModel` blocks Converse, and enumerating `bedrock:Converse` explicitly is valid there.

## Non-secret environment names

Copyable form lives in `.env-example` at the repo root.

| Name | Value on the host | Notes |
|---|---|---|
| `AWS_REGION` | `us-east-1` | Must match the deployed resources |
| `BEDROCK_MODEL_ID` | `us.anthropic.claude-opus-4-6-v1` | Configurable. Fallbacks: Haiku 4.5, Nova Lite. The `us.`/`global.` prefix is mandatory |
| `FRIENDLI_API_KEY_SSM_PARAMETER` | `/prompthon/friendli-api-key` | The name, not the value |
| `FRIENDLI_API_KEY` | Injected at startup from the parameter above | Never on disk, in User Data, in an output, or in a log |
| `AWS_PROFILE` | **Not used on the host** | Local development only. The host uses instance-role credentials |

## What BE has to do

1. **Confirm the Friendli key locally.** INFRA never read it. Run the four
   first-hour verifications from `aidlc-state.md`: tool calling on the *dedicated*
   Friendli endpoint, `modelKwargs` passthrough, thinking-output shape, and
   whether `seed` is honoured. The first one can invalidate the architecture.
2. **The table already exists — just connect to it.** `APP_TABLE_NAME=prompthon-app`,
   base keys `pk` and `sk`, both String, on-demand, no index. Nothing is waiting on
   you.

   The keys deliberately carry no domain meaning, because base keys are the only
   immutable part of a table. Item-key conventions are **your data, not schema**, so
   you can change them whenever you like. Suggested, not binding:

   | Lookup | pk | sk |
   |---|---|---|
   | Character profile | `CHARACTER#pral` | `PROFILE` |
   | Skill list | `CHARACTER#pral` | `SKILL#` begins_with |
   | Usage events in a window | `CHARACTER#pral` | `EVENT#<ts>` between |
   | Feedback | `CHARACTER#pral` | `FEEDBACK#<ts>` |

   All four run off the base key, so discovery needs no index. Put a **server-known
   owner** in `pk`, never a client-supplied id. If you use the item's own id as `pk`
   you get point lookups only and lose the range queries discovery depends on.

   Tell INFRA when a lookup needs a GSI. One index per deploy — CloudFormation
   refuses more than a single index change per stack update.
3. **Before any public ingress**, the NFR-5.2 shared passcode gate has to exist.
   The security group stays closed until then.

## Not provisioned, and why

| Absent | Unlocked by |
|---|---|
| DynamoDB GSIs | A lookup that actually needs one. The table itself exists |
| User Data / boot script | An application that exists to start. Manual steps documented in `infra/README.md` |
| Public application ingress | The NFR-5.2 passcode gate |
| SSH key pair, bastion | Nothing. Session Manager replaces them permanently |
| CI/CD, monitoring, log groups, S3, CloudFront, Lambda, API Gateway, ECS | A concrete requirement. ECS additionally blocked: `iam:PassRole` excludes `ecs-tasks.amazonaws.com` |
