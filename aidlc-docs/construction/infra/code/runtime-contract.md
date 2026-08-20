# INFRA Runtime Contract

The `RuntimeContract` record from `domain-entities.md`. State: **published**.
This is what BE consumes. Nothing here is secret.

**Published** 2026-08-20T10:20Z, **revised** 2026-08-20T12:20Z after reading BE's
PR #7. The DynamoDB section changed materially — the previous `pk`/`sk` schema was
replaced with the key schema BE's code actually uses.

## Deployed runtime

| Field | Value |
|---|---|
| Account | `643922457910` |
| Region | `us-east-1` |
| Stack name | `prompthon-runtime` |
| EC2 instance | `i-0ede6aab809e7c1b0` (`t3.small`, Amazon Linux 2023, `us-east-1a`) |
| Public IP | `3.94.193.235` — changes if the instance is stopped and started |
| Instance role | `arn:aws:iam::643922457910:role/prompthon-runtime-BackendRole78202DE5-AcROqSKNntXL` |
| Instance profile | `prompthon-runtime-BackendHostInstanceProfile2E6808AE-5FfIv3maSr3N` |
| Security group | `sg-0715b9fa40c2c378d` — **zero inbound rules**, egress open |
| Management path | SSM Session Manager. `aws ssm start-session --target i-0ede6aab809e7c1b0 --region us-east-1` |
| SSM parameter | `/prompthon/friendli-api-key`, `SecureString`, `alias/aws/ssm`, version 2 |
| DynamoDB table | `prompthon-runtime-AppTable815C50BC-1O831W9BLPJNG` |
| DynamoDB ARN | `arn:aws:dynamodb:us-east-1:643922457910:table/prompthon-runtime-AppTable815C50BC-1O831W9BLPJNG` |
| Deployment status | `verified` |

## DynamoDB

One table. Partition key **`id` (String), no sort key, no index**, on-demand,
`ACTIVE`, 0 items.

The schema comes from `packages/backend/src/data/skills.ts`, which addresses items by
`id` alone. An earlier revision of this contract specified a generic `pk`/`sk` pair;
that was wrong for this codebase and every `Key: { id }` call would have failed with
`ValidationException`. BE's data-access code is the contract, so the table was
replaced to match.

**The table name is generated, not fixed.** A custom-named table cannot be replaced
by CloudFormation — it would have to create the replacement before deleting the
original and the names collide, so the deploy fails outright. This was hit for real
during the key-schema change. The name travels as `DDB_TABLE_NAME`, so nothing in
the code depends on it.

Verified from the instance, under instance-role credentials, using the same call
shapes as `skills.ts`: `putSkill`, `getSkill`, `listSkills` (Scan + `productId`
filter), `updateSkillContent` (`attribute_exists(id)`), `deleteSkill`. All five pass.

**One table is enough for the whole demo.** Only skills are persisted today; usage
events and app context are in-memory by BE's own deliberate deferral, and progression
and feedback have no storage layer yet. If they move to DynamoDB later, they fit this
same table by id prefix — `PROGRESSION#pral` for a point lookup, `FEEDBACK#<uuid>`
with a Scan filter. No infra change, no new table. The one exception is usage events
queried by *time range*, which needs a sort key and therefore a separate table; that
would not touch this one.

## What the instance role can do

Granted to the role the host actually uses. No unused role, no IAM user, no
long-lived access key.

| Capability | Actions | Scope |
|---|---|---|
| Management | `AmazonSSMManagedInstanceCore` | AWS managed policy |
| Friendli key read | `ssm:GetParameter` | Exactly `arn:aws:ssm:us-east-1:643922457910:parameter/prompthon/friendli-api-key`. No list, no path read, no write |
| Bedrock | `InvokeModel`, `InvokeModelWithResponseStream` | `arn:aws:bedrock:*::foundation-model/*` and `inference-profile/*` in this account. The region wildcard is required because `us.` inference profiles fan out to sibling regions |
| Transcribe | `StartStreamTranscription` | `*` — streaming transcription has no resource-level permission in IAM |
| DynamoDB | `GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`, `Query`, `Scan`, `BatchGetItem`, `BatchWriteItem`, `ConditionCheckItem`, `DescribeTable` | The table ARN above only. No `dynamodb:*`, no table wildcard |

**Converse needs no separate grant.** `bedrock:Converse` and `bedrock:ConverseStream`
do exist as IAM actions, but Converse depends on Invoke, so the two actions above
cover it. Confirmed by a real `bedrock-runtime converse` call from the instance under
this exact policy. If you ever write a **Deny** policy, that asymmetry matters:
denying `InvokeModel` blocks Converse, and enumerating `bedrock:Converse` explicitly
is valid there.

**Transcribe streaming is granted but not exercised.** `StartStreamTranscription`
cannot be verified without a real audio stream, and `list-transcription-jobs` is
correctly denied because it was not granted. The first voice request is the test.

## Credentials — no code change needed

`packages/backend/src/data/ddbClient.ts` and `models/bedrock.ts` both construct
clients with a region and no explicit credentials, which is correct. Locally that
resolves through `AWS_PROFILE`; on the host it resolves to instance-role credentials.
Never put an access key in code, a file, or an environment variable.

---

# MANDATORY for BE before this runs

Four items. The first three are blocking; the fourth only matters on the host.

## 1. Set `DDB_TABLE_NAME` — no default works

`config.ts` falls back to `"prompthon-local"`, which does not exist. Every DynamoDB
call fails until this is set.

```
DDB_TABLE_NAME=prompthon-runtime-AppTable815C50BC-1O831W9BLPJNG
```

Or read it from the stack so it survives a redeploy:

```sh
aws cloudformation describe-stacks --stack-name prompthon-runtime \
  --query 'Stacks[0].Outputs[?OutputKey==`DdbTableName`].OutputValue' \
  --output text --profile prompthon --region us-east-1
```

## 2. `engines.node` must be `>=22`, not `>=20`

Root `package.json` on `construction/be` says `">=20"`. BE depends on
`@langchain/openai@^1.5.9`, which requires Node 22 or newer. The local toolchain was
upgraded to 22.23.2 for exactly this reason. As written, `npm install` passes the
engine check and then the package fails to work.

## 3. Root `workspaces` must include `infra`

`construction/be` has `"workspaces": ["packages/*"]`, which drops the `infra`
workspace entirely — `npm install` stops installing CDK dependencies and
`npm -w @prompthon/infra` stops resolving.

```json
"workspaces": ["infra", "packages/*"]
```

Related: the root sets `"type": "module"` while `infra` needs CommonJS for the CDK
app. `infra/package.json` now declares `"type": "commonjs"` explicitly so the two
coexist.

## 4. `.env-example` is missing a variable the backend requires at boot

`config.ts` wraps both `FRIENDLI_API_KEY` and `FRIENDLI_ENDPOINT_ID` in `required()`,
so a missing value throws at startup rather than failing later. The `.env-example` on
`construction/be` lists only `AWS_PROFILE` and `DDB_TABLE_NAME`, so anyone who copies
it gets a backend that will not start.

Missing: `FRIENDLI_ENDPOINT_ID` (**required**), `AWS_REGION`, `BEDROCK_MODEL_ID`,
`FRIENDLI_API_KEY`, `FRIENDLI_BASE_URL`, `PORT`, `DEVICE_API_URL`. The merged
contract is published in `.env-example` on `construction/infra`.

## 5. On EC2 only: the Friendli key comes from SSM, not `.env`

Do not copy `.env` to the host. The startup path must fetch and inject it:

```sh
export FRIENDLI_API_KEY=$(aws ssm get-parameter \
  --name /prompthon/friendli-api-key --with-decryption \
  --query Parameter.Value --output text --region us-east-1)
```

The parameter's value is byte-identical to the local `.env` value — verified by
hash comparison without either side printing it.

---

# Advisory, not blocking

- **`bedrockChat` has no `maxTokens` cap.** Opus 4.6's wall clock is competitive
  because it answers tersely; `aidlc-state.md` recommends pinning that with
  `maxTokens` around 300 plus a 2-3 sentence instruction in the system prompt rather
  than relying on it.
- **Progression has no storage layer**, so level and exp reset on every restart.
  Usage events reseed from a fixture, skills persist, progression does not. Fine for
  a single demo run, visible during repeated rehearsals. Adding it needs no infra
  change: same table, `id = "PROGRESSION#<product>"`, permissions already granted.
- **Run the four first-hour Friendli verifications** from `aidlc-state.md`. INFRA
  confirmed the parameter exists and the instance role can decrypt it, never that the
  value is valid or that tool calling works on the dedicated endpoint. That first one
  can invalidate the architecture.

---

## Not provisioned, and why

| Absent | Unlocked by |
|---|---|
| DynamoDB GSI | A lookup that actually needs one. The table exists; `Scan` with a `productId` filter is fine at demo volume |
| Second table | Usage events queried by time range, which needs a sort key |
| User Data / boot script | An application that exists to start. Manual steps in `infra/README.md`. The host has no Node installed |
| Public application ingress | The NFR-5.2 passcode gate. One rule on `PORT` when it exists |
| HTTPS, domain, Route 53, ACM, ALB | Out of scope for the demo. Note that browser microphone access needs a secure context, so voice input works on localhost but is blocked over `http://<public-ip>` |
| SSH key pair, bastion | Nothing. Session Manager replaces them permanently |
| CI/CD, monitoring, log groups, S3, CloudFront, Lambda, API Gateway, ECS | A concrete requirement. ECS additionally blocked: `iam:PassRole` excludes `ecs-tasks.amazonaws.com` |
