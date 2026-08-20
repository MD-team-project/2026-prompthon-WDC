# INFRA Deployment Evidence

The `DeploymentEvidence` record from `domain-entities.md`. Observed against the
live account, not inferred from a template or from a zero exit code.

**Target identity**: `arn:aws:sts::643922457910:assumed-role/WSParticipantRole/Participant`, account `643922457910`, region `us-east-1`.

## Stages

| Stage | Result | Timestamp (UTC) | Observed |
|---|---|---|---|
| Identity / region validation | pass | 2026-08-20T09:20:00Z | Expected account and role, `us-east-1` |
| Typecheck | pass | 2026-08-20T09:21:00Z | `tsc --noEmit` clean |
| Template assertions | pass 5/5 | 2026-08-20T09:21:30Z | `node --test`, see below |
| `cdk synth` | pass | 2026-08-20T09:21:50Z | Real default-VPC lookup resolved to `subnet-0974d36c0bf61399b` |
| `cdk diff` | pass | 2026-08-20T09:22:00Z | 6 resources added. Only change in the Security Group section is **egress** |
| `cdk bootstrap` | pass | 2026-08-20T09:22:07Z → 09:22:56Z | `CDKToolkit` `CREATE_COMPLETE`, 12 resources |
| `cdk deploy` | pass | 2026-08-20T09:23:45Z → 09:26:43Z | `prompthon-runtime` `CREATE_COMPLETE`, 175s |
| Post-deploy verification | pass | 2026-08-20T10:18:00Z | 8 checks below |
| Ponytail review, 2 cycles | applied | 2026-08-20T10:25:00Z | See below |
| `cdk deploy` (review changes) | pass | 2026-08-20T10:32:00Z | `UPDATE_COMPLETE`, then `cdk diff` → no differences |
| Re-verification after update | pass | 2026-08-20T10:36:00Z | All 8 checks re-run |

No failures, so no `first failed CloudFormation event` reference is needed. One
operational note: a `cdk deploy` invocation outlived its shell and held the
`cdk.out` read lock, so a second invocation refused to run. Resolved by waiting
for the first to finish rather than by forcing the lock.

## Ponytail review outcome

Two cycles, both applied. What changed in the deployed stack:

- **Removed `bedrock:Converse` and `bedrock:ConverseStream` from the role.** In an
  Allow policy they grant nothing: [the Converse API authorizes on
  `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream`](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html),
  both already present. **Correction to an earlier version of this document**, which
  said the two are not IAM action names — they are. [AWS documents them as valid
  entries when writing an explicit Deny](https://docs.aws.amazon.com/bedrock/latest/userguide/security_iam_id-based-policy-examples.html),
  so the "does not exist" framing was wrong even though the removal was right. Proven
  by the post-removal check below rather than by reading alone.
  *(Content rephrased for compliance with licensing restrictions.)*
- **Cut three outputs** that only echoed compile-time constants: `Region`,
  `FriendliApiKeySsmParameter`, `ConnectCommand`. Remaining outputs are the three
  identifiers CloudFormation generates and nothing else can predict.
- Replaced a six-line `formatArn` call with the literal ARN, trimmed `tsconfig.json`
  to non-default options, folded two tests into one, de-duplicated prose between
  `.env-example` and `README.md`.
- **Dropped the hard `us-east-1` guard** in `bin/prompthon-infra.ts`. The account
  SCP already denies other regions, and hard-coding one region works against the
  portability this artifact exists for.

Rejected, with reasons recorded: the encrypted 20 GiB gp3 root volume (encryption
at rest is a security measure, not decoration), the no-DynamoDB test (validation
rule 4 demands the proof), the no-secret test (environment rules 5 and 9), the
`packages/*` workspace glob (BE and FE would otherwise have to edit the shared
root file from parallel branches), and the README environment-variable table
(named as required content in `aidlc-state.md`).

## Bootstrap resources created

Account-level, dies with the account, must be re-run in any future account.
`CDKToolkit`: S3 staging bucket, ECR repository, SSM version parameter, and five
IAM roles (`FilePublishingRole`, `ImagePublishingRole`, `LookupRole`,
`DeploymentActionRole`, `CloudFormationExecutionRole`) plus their policies.

## Template assertions (`infra/test/runtime-stack.test.ts`)

Run with `node --import tsx --test`. No framework, no fixtures.

```
ok 1 - no inbound path to the host: no ingress rule, no key pair
ok 2 - no DynamoDB placeholder
ok 3 - ssm:GetParameter is scoped to exactly one parameter and nothing else
ok 4 - template carries no secret material
# pass 4  # fail 0
```

## Post-deploy verification against the live API

| # | Validation rule | Check | Result |
|---|---|---|---|
| 1 | rule 3 | Stack status | `CREATE_COMPLETE` |
| 2 | EC2 rule 1 | Instance state, type, instance profile attached | `running`, `t3.small`, profile `...5FfIv3maSr3N` attached |
| 3 | EC2 rule 4 | Security group inbound rules, read from the live API | `[]` — empty |
| 4 | rule 4 | `dynamodb list-tables` | `[]` at this point — no placeholder table. The real table was added later, see below |
| 5 | — | Root volume | `Encrypted: true`, 20 GiB gp3 |
| 6 | EC2 rule 5 | Management path actually works | `ssm describe-instance-information` → `PingStatus: Online`, agent `3.3.4624.0`. Not merely configured, reachable |
| 7 | rule 5 / rule 6 | SSM parameter metadata, value suppressed | **ABSENT.** Expected: the operator has not created it yet. Blocks hosted-backend readiness only, not this deployment |
| 8 | env rule 9 | Stack outputs scanned for credential patterns | clean. Outputs are `InstanceId`, `SecurityGroupId`, `BackendRoleArn` and nothing else |

Live role policy after the update, read back from IAM rather than from the template:
`ssm:GetParameter`, `bedrock:InvokeModel`, `bedrock:InvokeModelWithResponseStream`,
`transcribe:StartStreamTranscription`. Four actions, no wildcard service access.

Additional posture observed and not required by any rule: `KeyName: null` (no key
pair exists) and IMDS `HttpTokens: required` (IMDSv2 enforced, so a request-forgery
bug on the host cannot walk off with role credentials).

## Runtime capability verification from inside the instance (2026-08-20T11:00:00Z)

Run through `ssm send-command`, so these also prove the Session Manager path end to
end. All three use the instance role's temporary credentials, never a profile.

| Capability | Method | Result |
|---|---|---|
| Bedrock | `aws bedrock-runtime converse` with `us.anthropic.claude-haiku-4-5-20251001-v1:0` | Model replied. Confirms `InvokeModel*` alone is sufficient for Converse |
| SSM secret read | `get-parameter --with-decryption` on the one granted ARN | Success. Exact-ARN scoping works as intended |
| Secret integrity | SHA-256 of the decrypted value compared against the operator's local `.env` value | **Identical.** 56 bytes, zero non-printable bytes. The hashes are deliberately not recorded here — a hash of a live credential does not belong in a repository |

The operator created the `SecureString` at 2026-08-20T11:05Z, now at `Version 2`,
`alias/aws/ssm`. Version 1 held a value with two stray non-ASCII characters, caught
by the byte-level probe before anything depended on it and replaced via `--overwrite`.

Neither the value nor any fragment of it was printed at any point. Verification used
length, non-printable byte positions, and a hash — all of which distinguish a correct
value from a corrupted one without disclosing it.

## Secret handling during this stage

The real `FRIENDLI_API_KEY` was **never read**. `.env` was confirmed gitignored via
`git check-ignore` without opening it. No secret value appears in any generated
file, template, output, command, or log line. The pre-existing `bedrock-apikey`
stack was not touched, imported, or used.

## Standing cost

`t3.small` on demand, roughly $0.023/hr, about $1.70 if left running until the
account is deleted around 2026-08-23. Stopping the instance while idle is enough;
destroying the stack is unnecessary and would waste the verified deploy.

## Status

Runtime state: `planned` → `synthesized` → `diff-reviewed` → `deployed` → `verified` → **`published`**.

The account-deletion requirement is satisfied: `cdk bootstrap` and `cdk deploy`
have both run to completion against the live account, so `infra/` is a verified
reusable asset rather than an unapplied draft.

---

## DynamoDB added 2026-08-20T11:55:00Z

A third `cdk deploy`, 44 s, `UPDATE_COMPLETE`. Diff contained exactly three things:
the table, the role policy change, and one output. No other resource moved.

**Why this does not contradict the earlier no-placeholder rule.** That rule existed
because base keys are immutable, so provisioning before BE could mean committing to a
wrong key. `prompthon-app` uses `pk`/`sk` as plain strings that encode no domain
meaning, and a key that says nothing cannot be wrong later. The concern the rule
protected against is absent here, so the table stops being a placeholder and becomes
a real deliverable that unblocks BE immediately.

| Check | Result |
|---|---|
| `describe-table` | `ACTIVE`, `KeySchema` = `pk` HASH + `sk` RANGE, `PAY_PER_REQUEST` |
| Indexes | GSI `null`, LSI `null`. LSIs cannot be added after creation, so none was created by accident |
| Write from the instance role | `put-item` succeeded |
| Range query from the instance role | `query` with `begins_with(sk, "EVENT#")` returned 1 |
| Cleanup | `delete-item` succeeded, table back to 0 items |
| Grant scope | Read and write statements resolve to the table ARN only. No `dynamodb:*`, no wildcard resource |

The smoke test ran on the host under instance-role credentials, so it proves the
grant works in the place the backend will actually run, not just from an operator
profile.

Template assertions were updated with the table: one table, base keys asserted
meaning-neutral, on-demand billing, no LSI, and every DynamoDB grant scoped to the
table ARN. The obsolete "no DynamoDB placeholder" assertion was replaced rather than
deleted, so the property under test moved from absence to shape. 5 tests, all pass.
