# Account mismatch between BE and INFRA — resolution

Answers the blocker BE raised on PR #6, 2026-08-20T13:17Z.

**Resolution: BE's option 2. Account `643922457910` is canonical and the team shares
one set of credentials for it.** Setup and verification are in section 3 below.

| | Account | Principal |
|---|---|---|
| BE local | `466501979672` | `arn:aws:sts::466501979672:assumed-role/WSParticipantRole/Participant` |
| INFRA deployed | `643922457910` | `arn:aws:sts::643922457910:assumed-role/WSParticipantRole/Participant` |

## 1. Nothing is misconfigured on BE's side

Two separate Workshop Studio sandboxes, not a credential paste error. The ARN shape is
identical on both sides — `WSParticipantRole/Participant` — which is what Workshop
Studio issues per participant, so BE really does hold its own sandbox.

`ResourceNotFoundException` is the correct answer to a cross-account table lookup by
name: DynamoDB table names are account-scoped, so BE's client resolved the name inside
`466501979672` and found nothing. `ddbClient.ts` and `config.ts` are right as written.

## 2. Why option 2 and not the other two

**Option 1's resource-policy form is impossible.** Not "probably blocked" — probed
against the live table and refused by an SCP:

```
$ dynamodb:PutResourcePolicy on
  arn:aws:dynamodb:us-east-1:643922457910:table/prompthon-runtime-AppTable815C50BC-1O831W9BLPJNG
AccessDeniedException: ... with an explicit deny in a service control policy:
  arn:aws:organizations::733415556254:policy/o-1ua8520d1t/service_control_policy/p-a4aol0sp
```

The probe granted nothing: the principal was this account's own root, the action was
`DescribeTable` alone, and it was to be deleted immediately. It never got that far. An
explicit SCP deny cannot be overridden by any identity or resource policy, so no
version of a table policy works here. `dynamodb:GetResourcePolicy` is permitted and
confirms the table carries none.

**Option 1's assumable-role form would probably work but costs more than it returns.**
`iam:CreateRole` is permitted — probed with a deliberately malformed trust document
and got `MalformedPolicyDocument: Policy has no statements`, meaning authorization
passed before validation ran. No role was created. But a cross-account role needs both
halves, and the half not observable from here is whether `466501979672`'s SCP lets its
`WSParticipantRole` call `sts:AssumeRole` outward. Given that the same org denies
`PutResourcePolicy`, that is not safe to assume. It also solves a narrower problem than
option 2: a role scoped to the table leaves BE without Bedrock or the Friendli
parameter, both of which BE needs, so it would have to be widened until it is option 2
with extra steps.

**Option 3 is viable and stays on the list.** The instance is SSM-managed and reachable
now — `PingStatus: Online`, agent `3.3.4624.0`, `i-0ede6aab809e7c1b0`. But it is not a
substitute for local access; see section 5.

Option 2 wins because one credential set reaches everything BE needs in one step, and
because the alternative to sharing is not "per-person IAM users" — that option does not
exist here, see section 4.

## 3. Setup

Everyone points at `643922457910` in `us-east-1`.

### What gets shared

Three values from the Workshop Studio portal, under its AWS CLI / credentials tab:

```
aws_access_key_id
aws_secret_access_key
aws_session_token
```

**These are temporary.** They expire when the workshop session does, and the portal is
the only source of fresh ones. Nothing local records the expiry.

**Send them over a private channel — DM or a call.** Never a commit, a PR body, a PR
comment, an issue, or a shared doc. `.env` is gitignored and must stay that way.

### Per person

Use the profile name `prompthon` exactly. `.env` and every command in this repo assume
it, so a different name breaks things quietly.

```sh
aws configure set aws_access_key_id     "<paste>" --profile prompthon
aws configure set aws_secret_access_key "<paste>" --profile prompthon
aws configure set aws_session_token     "<paste>" --profile prompthon
aws configure set region us-east-1                --profile prompthon
```

Then in `.env` at the repo root:

```
AWS_PROFILE=prompthon
AWS_REGION=us-east-1
DDB_TABLE_NAME=prompthon-runtime-AppTable815C50BC-1O831W9BLPJNG
```

### Verify before starting work

Four checks. All four were run against the live account while writing this, so the
expected outputs below are observed rather than predicted. If any fails, the
credentials are wrong or expired.

```sh
export AWS_PROFILE=prompthon AWS_REGION=us-east-1

# 1. Right account, and the role is WSParticipantRole
aws sts get-caller-identity

# 2. The table is reachable
aws dynamodb describe-table \
  --table-name "$(aws cloudformation describe-stacks --stack-name prompthon-runtime \
    --query 'Stacks[0].Outputs[?OutputKey==`DdbTableName`].OutputValue' --output text)" \
  --query 'Table.{status:TableStatus,keys:KeySchema[].AttributeName}'

# 3. Bedrock answers with the model the app uses
aws bedrock-runtime converse \
  --model-id us.anthropic.claude-opus-4-6-v1 \
  --messages '[{"role":"user","content":[{"text":"say OK"}]}]' \
  --inference-config maxTokens=5 --query output.message.content[0].text --output text

# 4. The Friendli key is present — prints the length, not the value
aws ssm get-parameter --name /prompthon/friendli-api-key --with-decryption \
  --query 'length(Parameter.Value)' --output text
```

| Check | Observed |
|---|---|
| 1 | `643922457910`, `assumed-role/WSParticipantRole/Participant` |
| 2 | `ACTIVE`, keys `["id"]` |
| 3 | `OK` on `us.anthropic.claude-opus-4-6-v1`, and on `us.anthropic.claude-haiku-4-5-20251001-v1:0` |
| 4 | `56` — `SecureString`, version 2 |

### When they expire

Symptom: `ExpiredToken` or `InvalidClientTokenId` on any AWS call, `cdk deploy`
included.

Fix: whoever holds the portal re-copies the three values and re-shares them, everyone
re-runs the three `aws configure set` commands. Nothing else changes — table name,
role, instance and parameter are account resources and survive a credential rotation.

## 4. What sharing costs, stated plainly

Per-person IAM users are not an available alternative. `iam:CreateUser` is denied:
`WSParticipantRole` carries `PowerUserAccess`, which excludes IAM writes. Verified by
attempting it. The pre-existing `bedrock-apikey` IAM user is not a substitute either —
`AmazonBedrockLimitedAccess` is its only policy, so it cannot reach DynamoDB or
Parameter Store. So the real choice was shared credentials or separate accounts, and
separate accounts is what caused this blocker.

Two consequences to accept rather than discover later:

**Everyone holds PowerUserAccess.** Any team member can delete the table, the stack or
the instance. `cdk destroy` in particular would discard the verified deployment that
the three-day account-deletion constraint exists to protect. Don't run it.

**There is no attribution.** CloudTrail records every action as
`WSParticipantRole/Participant` and cannot distinguish between people.

If either becomes unacceptable, the fix is a role per person — `iam:CreateRole` is
permitted, so it is buildable — but it needs each developer to already have an AWS
identity to assume from, which is why it is not the choice today.

## 5. What local access does and does not prove

Shared credentials give BE the same local loop INFRA has had, against the real table,
real Bedrock and the real Friendli parameter. What they do not exercise is the EC2
instance role, because a local run uses the shared participant credentials rather than
`table.grantReadWriteData(role)`. Only a run on the host shows that the grant resolves.

| Claim | Local, shared credentials | On the host |
|---|---|---|
| `Key: { id }` call shapes work | yes | yes |
| Marshalling, error handling, save path | yes | yes |
| Region and endpoint resolution | yes | yes |
| Bedrock and Friendli reachable | yes | yes |
| Instance-role grant is sufficient | no | yes |

So option 3 is not a fallback that option 2 replaces. It is the last mile, and it stays
on the list.

## 6. Fixed alongside this

`.env-example` carried `DDB_TABLE_NAME=prompthon-app`, a name from the withdrawn
fixed-name revision. No table by that name exists, so anyone copying the template got a
backend that failed on every DynamoDB call — the same class of failure BE hit, from a
different cause. It now carries the real generated name and notes that the name is
CloudFormation-generated and comes from the `DdbTableName` stack output.
`runtime-contract.md` and `ARCHITECTURE.md` were already correct.

## 7. Live state at time of writing

Probed, not recalled.

| | |
|---|---|
| Stack `prompthon-runtime` | `UPDATE_COMPLETE` |
| Table | `prompthon-runtime-AppTable815C50BC-1O831W9BLPJNG`, `ACTIVE`, `id` HASH only, 0 GSI, 0 items |
| Instance `i-0ede6aab809e7c1b0` | SSM `Online`, agent `3.3.4624.0` |
| SSM `/prompthon/friendli-api-key` | `SecureString`, version 2, 56 characters |
| Table resource policy | none, and cannot be created |
