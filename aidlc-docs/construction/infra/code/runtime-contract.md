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
| SSM parameter name | `/prompthon/friendli-api-key` (metadata absent until an operator creates it) |
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

**Not granted**: DynamoDB. Added in the same later update that creates the tables.

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
2. **To unlock DynamoDB, just write the data-access code.** Point it at a table name
   from an environment variable and say what you store and how you look each thing
   up. That is the whole handoff — no form, no contract document. INFRA reads the
   code and decides table count and keys; capacity, encryption, Streams, TTL, PITR,
   deletion protection and removal policy all take ordinary demo defaults and are
   not discussed per table. `Scan` is fine at demo volume.

   One constraint worth knowing before you pick an ID: **keys must come from a
   server-known owner, never a client-supplied identifier**, and partition/sort keys
   cannot be changed after creation without replacing the table. Everything else is
   one `cdk deploy` away.
3. **Before any public ingress**, the NFR-5.2 shared passcode gate has to exist.
   The security group stays closed until then.

## Not provisioned, and why

| Absent | Unlocked by |
|---|---|
| DynamoDB tables, keys, indexes | BE's data-access code showing what it stores and how it reads it |
| User Data / boot script | An application that exists to start. Manual steps documented in `infra/README.md` |
| Public application ingress | The NFR-5.2 passcode gate |
| SSH key pair, bastion | Nothing. Session Manager replaces them permanently |
| CI/CD, monitoring, log groups, S3, CloudFront, Lambda, API Gateway, ECS | A concrete requirement. ECS additionally blocked: `iam:PassRole` excludes `ecs-tasks.amazonaws.com` |
