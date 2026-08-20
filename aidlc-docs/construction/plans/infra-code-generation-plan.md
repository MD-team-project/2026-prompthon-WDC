# INFRA Code Generation Plan

**Unit**: INFRA
**Stage**: CONSTRUCTION - Code Generation, Part 1 (Planning)
**Created**: 2026-08-20T10:05:00Z
**Branch**: `construction/infra`
**Status**: APPROVED 2026-08-20T10:12:00Z (Step 3b = option A). Part 2 executed and complete; every step below is done.

This plan is the single source of truth for INFRA Code Generation. Part 2 executes these steps in order and nothing else.

---

## 1. Unit Context

| Item | Value |
|---|---|
| Workspace root | `/Users/hyunjin/prompthon/2026-prompthon-WDC` |
| Unit scope | IaC, environment contract, deployment preparation. No product logic |
| Stories owned | **Zero.** INFRA is an enabling unit; every story depends on it, none belongs to it |
| Depends on | Nothing inside the project. Depends on the live AWS account and the local toolchain |
| Depended on by | BE (runtime contract, environment names, later DynamoDB), FE (indirectly) |
| Language | TypeScript. `aws-cdk-lib` pinned exactly at `2.266.0` |
| Hard deadline | AWS account is deleted around **2026-08-23**. One real `cdk bootstrap` + `cdk deploy` must complete before then |

### Inputs
- `aidlc-docs/construction/infra/functional-design/{business-logic-model,business-rules,domain-entities}.md` (approved 2026-08-20T09:07:10Z)
- `aidlc-docs/aidlc-state.md` measured environment facts and account-deletion constraint
- `aidlc-docs/inception/application-design/unit-of-work.md` code organization

### Live account state re-verified 2026-08-20T10:00:00Z
- Identity `arn:aws:sts::643922457910:assumed-role/WSParticipantRole/Participant`, region `us-east-1`.
- **CDK not bootstrapped** (0 S3 buckets). **DynamoDB 0 tables** (matches the no-placeholder rule).
- `ssm:DescribeInstanceInformation` and `ssm:GetParameter` are **permitted** for this principal. `/prompthon/friendli-api-key` returns `ParameterNotFound`, which is the expected pre-operator state.
- Default VPC `vpc-0e879b6764ca8fc90` has six public subnets (`MapPublicIpOnLaunch=true`) across `us-east-1a-f`.
- **State-file correction to apply in Step 13**: `aidlc-state.md` records the workspace root as `/Users/sehoonbyun/Documents/prompthon`. The real root on this machine is `/Users/hyunjin/prompthon/2026-prompthon-WDC`.

### Decisions this stage must make, that Functional Design deferred
1. **Management path** (`business-rules.md` EC2 rule 5 leaves this to Code Generation): **SSM Session Manager**. The instance role carries `AmazonSSMManagedInstanceCore`, the security group has **zero inbound rules**, and no EC2 key pair is created. This satisfies "no world-open SSH" by having no SSH at all, and the permission probe above confirms the principal can use it.
2. **CDK CLI pin** (`business-rules.md` portability rule 2): pin `aws-cdk` as an `infra` devDependency at **`2.1135.0`**, the version already verified working locally. Commands run through `npx cdk` so the pin is what actually executes.

---

## 2. Deliberate Omissions (ponytail / YAGNI)

Each line is a thing a normal CDK scaffold would create and this plan will not.

- **No DynamoDB table, key, or index.** Question 5 = A. Added in a later stack update once BE's data-access code shows what it stores and how it reads it back. *(The seven-field access-pattern contract this line originally referenced was simplified away 2026-08-20T11:10:00Z; see `business-rules.md`.)*
- **No custom VPC, subnets, NAT, or IGW.** The default VPC already has public subnets with egress. Reuse it.
- **No EC2 key pair, no bastion, no SSH ingress rule.** Session Manager replaces all three.
- **No User Data / bootstrap script.** No application exists to start yet, and hosting is "local first, EC2 only if time remains". The Node install and the `FRIENDLI_API_KEY` retrieval one-liner are **documented in `infra/README.md`** instead of being written as an untested shell script against a nonexistent app. Add User Data when BE actually deploys.
- **No `cdk init` scaffold.** No `.npmignore`, `jest.config.js`, `test/*.test.ts` boilerplate, `README.md` placeholder, or `source.bash`. Files are written directly.
- **No Jest.** The one runnable check uses `node:test` + `node:assert` with `aws-cdk-lib/assertions`, both already present.
- **No root `tsconfig.json`, no shared ESLint/Prettier config.** `infra` has one tsconfig. BE and FE add theirs when they arrive.
- **No `packages/*` directories.** BE and FE create their own. The root workspace glob simply covers them in advance.
- **No SSM parameter resource in CDK.** CDK references the name only. An operator creates the `SecureString` out of band, per the approved secret boundary.
- **No CI/CD, monitoring, alarms, S3, CloudFront, Lambda, API Gateway, ECS, Secrets Manager, or customer-managed KMS key.**
- **No CloudWatch agent or log group.** Nothing writes logs yet.

**One item flagged for your call rather than silently decided** — see Step 3b: whether the instance role gets its Bedrock and Transcribe grants now, or only when BE deploys.

---

## 3. Execution Steps

### Step 1: Root npm workspace
- [x] Create `package.json` at workspace root: `private: true`, `workspaces: ["infra", "packages/*"]`, `engines.node: ">=22"`, no dependencies.
- [x] Extend `.gitignore` with `node_modules/`, `cdk.out/`, `*.d.ts`/`*.js` build output under `infra/`, `.DS_Store`.
- [x] Do not create `packages/` subdirectories.

**Traceability**: `unit-of-work.md` code organization. Corrects the state-file note that the monorepo was already initialised.

### Step 2: `infra/` workspace shell
- [x] `infra/package.json` — name `@prompthon/infra`, private, `aws-cdk-lib` **exact `2.266.0`**, `constructs` `^10.0.0`, devDeps `aws-cdk` exact `2.1135.0`, `typescript` `^5.9.3`, `tsx` (CDK app executor), `@types/node` `^22`. Scripts: `synth`, `diff`, `deploy`, `bootstrap`, `typecheck`, `test`.
- [x] `infra/tsconfig.json` — strict, `target`/`lib` ES2022, `module` node16/nodenext, no emit needed for `tsx`.
- [x] `infra/cdk.json` — `app: "npx tsx bin/prompthon-infra.ts"`, minimal context, no feature-flag dump beyond what the pinned version requires.
- [x] `npm install` at root and confirm the lockfile resolves with no peer conflicts.

**Traceability**: portability rules 1-2.

### Step 3: Runtime stack
- [x] `infra/bin/prompthon-infra.ts` — app entry, explicit `env` from `CDK_DEFAULT_ACCOUNT`/`CDK_DEFAULT_REGION` (required because the VPC lookup is not region-agnostic), stack name `prompthon-runtime`.
- [x] `infra/lib/runtime-stack.ts` — the whole stack in one file:
  - Default VPC via `Vpc.fromLookup({ isDefault: true })`.
  - `SecurityGroup`, `allowAllOutbound: true`, **no ingress rules added**.
  - `Role` for `ec2.amazonaws.com` with managed policy `AmazonSSMManagedInstanceCore`.
  - Inline grant: `ssm:GetParameter` on **exactly** `arn:aws:ssm:us-east-1:<account>:parameter/prompthon/friendli-api-key`. No `GetParametersByPath`, no wildcard, no write.
  - `Instance` — `t3.small`, Amazon Linux 2023 latest via SSM AMI parameter, public subnet, encrypted gp3 root volume, **no key pair**.
  - `CfnOutput`s: instance id, region, security-group id, role ARN, `FRIENDLI_API_KEY_SSM_PARAMETER` name, and the `aws ssm start-session` command. **No secret, token, or key in any output.**

**Traceability**: EC2/network rules 1-6, IAM rules 2-3 and 5-6, environment rules 3 and 9.

### Step 3b: DECISION REQUIRED - Bedrock and Transcribe grants
`business-rules.md` IAM rule 4 grants these "only when the runtime needs them". Two readings, pick one:

- **(A) Grant now** (~12 lines): `bedrock:InvokeModel`, `InvokeModelWithResponseStream`, `Converse`, `ConverseStream` scoped to `foundation-model/*` and `inference-profile/*` in `us-east-1`, plus `transcribe:StartStreamTranscription` (no resource-level scoping exists for Transcribe streaming, so `*` is unavoidable there). The reusable IaC asset is then complete, and after the account dies nobody has to rediscover which actions the backend needed.
- **(B) Defer** to the same later update that adds DynamoDB. Strictly minimal today, but the artifact that outlives the account is then incomplete on the exact point that is hardest to reconstruct.

**Recommendation: A**, because the deliverable's value is portability past account deletion, and the marginal cost is a dozen declarative lines. Say "B" to defer.

### Step 4: One runnable check
- [x] `infra/test/runtime-stack.test.ts` using `node:test` + `aws-cdk-lib/assertions` on the synthesized template, asserting:
  - zero `SecurityGroupIngress` entries anywhere,
  - zero `AWS::DynamoDB::Table` resources (validation rule 4, proves no placeholder),
  - the `ssm:GetParameter` statement resource ends in `parameter/prompthon/friendli-api-key` and the statement has no other action,
  - no `AWS::EC2::KeyPair` and no `KeyName` property,
  - the serialized template contains no string matching a secret-ish pattern (`FRIENDLI_API_KEY=`, `Bearer `, `AKIA`) — validation rule 5's "no plaintext" made mechanical.

**Traceability**: validation rules 3-5. This is the ponytail-required check: assertions only, no framework, no fixtures.

### Step 5: `.env-example` and environment contract
- [x] Extend `.env-example` with the non-secret contract, comments only, no values that are secret: `AWS_PROFILE`, `AWS_REGION=us-east-1`, `BEDROCK_MODEL_ID=us.anthropic.claude-opus-4-6-v1`, `FRIENDLI_API_KEY=` (empty placeholder), `FRIENDLI_API_KEY_SSM_PARAMETER=/prompthon/friendli-api-key`.
- [x] Confirm `.env` stays gitignored and is **never read** during this stage.

**Traceability**: environment rules 1-2 and 7-8, `domain-entities.md` environment contract table.

### Step 6: `infra/README.md`
- [x] Prerequisite checklist that IaC cannot express: **Bedrock model IDs to enable in the console** (Opus 4.6 default, Haiku 4.5 and Nova Lite fallbacks, with the `us.`/`global.` inference-profile prefix gotcha), required region, required IAM permissions, `iam:PassRole` whitelist caveat, `FRIENDLI_API_KEY` origin.
- [x] Command sequence: `npm install` → `typecheck` → `test` → `synth` → `diff` → `bootstrap` → `deploy`.
- [x] Operator procedure for creating the `SecureString` (`aws ssm put-parameter --type SecureString`), stated so the value never lands in a file or in shell history-visible form.
- [x] The two documented-not-automated startup steps: install Node 22 on the host; fetch the parameter with decryption and export it into the backend process only.
- [x] New-account differences: bootstrap must be re-run, entitlements re-enabled, permission boundary may differ.
- [x] Teardown: `cdk destroy`, and the note that stopping the instance is enough during idle hours.

**Traceability**: portability rules 4-5, account-deletion constraint, secret lifecycle steps 1-5.

### Step 7: Pre-deploy validation
- [x] `aws sts get-caller-identity` and region assertion (validation rule 1).
- [x] `npm run typecheck` in `infra`.
- [x] `npm test` in `infra` (Step 4 check).
- [x] `npm run synth` and read the template for ingress, DynamoDB, key pair, and secret leakage.

### Step 8: `cdk bootstrap` — creates account-level resources
- [x] Run `npx cdk bootstrap aws://643922457910/us-east-1`.

**Explicit heads-up**: this creates the `CDKToolkit` stack — an S3 staging bucket, an ECR repository, an SSM parameter, and **five IAM roles**. It is account-level, not project-level, and it is a prerequisite for any CDK deploy. It is reversible (`cdk bootstrap` resources can be deleted with the stack) and it is inside the approved scope, but I will state it again before running it.

### Step 9: `cdk deploy`
- [x] `npx cdk diff` then `npx cdk deploy prompthon-runtime`.
- [x] On failure, read the **first** failed CloudFormation event before retrying (failure-behavior rule).

**Cost note**: `t3.small` on-demand is roughly $0.023/hr, so about $1.70 for three days if left running. Stop the instance when idle.

### Step 10: Post-deploy verification, not "the command exited 0"
- [x] Stack status `CREATE_COMPLETE`.
- [x] Instance `running`, with the expected instance profile attached.
- [x] Security group has **zero** inbound rules, confirmed from the live API, not from the template.
- [x] `aws dynamodb list-tables` still returns empty (proves no placeholder was created).
- [x] `aws ssm describe-instance-information` lists the instance as `Online`, which proves the management path actually works rather than merely being configured.
- [x] SSM parameter check with output suppressed: report existence only. `ParameterNotFound` is an acceptable result and blocks **hosted-backend readiness**, not this deployment (validation rule 6).
- [x] Confirm no stack output contains a credential.

### Step 11: Deployment evidence document
- [x] Write `aidlc-docs/construction/infra/code/deployment-evidence.md` — the `DeploymentEvidence` record from `domain-entities.md`: target identity, stage, observed resources, status, timestamps, failure references. Markdown only, no secrets, no account-sensitive tokens.
- [x] Write `aidlc-docs/construction/infra/code/runtime-contract.md` — the `RuntimeContract` record BE consumes: account, region, stack name, instance id, role, SG, management path, SSM parameter name, non-secret env names, deployment status.

**Traceability**: `domain-entities.md` records 1 and 3, state `deployed` → `verified` → `published`.

### Step 12: Ponytail review pass
- [x] Dispatch the `ponytail-reviewer` sub-agent over the generated files, apply findings directly, re-dispatch. Hard cap of two cycles.

### Step 13: Progress and state
- [x] Mark every step above `[x]` as it completes, in the same interaction as the work.
- [x] Update `aidlc-state.md`: INFRA Code Generation status, **correct the stale workspace-root path**, record the runtime contract location and that DynamoDB remains deliberately absent.
- [x] Append to `audit.md` (append-only, never rewrite).

### Step 14: Present the standardized two-option completion gate
- [x] Completion message per `code-generation.md` Step 14. No third option, no invented navigation.

---

## 4. What "done" means for this unit

1. Root workspace and `infra/` workspace exist, install cleanly, and typecheck.
2. One CDK stack deploys an EC2 host with a used instance role, zero inbound rules, and a Session-Manager-reachable state.
3. `cdk bootstrap` and `cdk deploy` have **actually run to completion** against account `643922457910` — an unapplied template is a draft, not an asset.
4. Non-secret environment contract published in `.env-example` and `infra/README.md`. The real Friendli key is never read, printed, committed, or deployed.
5. No DynamoDB resource exists, and the deployment proves it.
6. Prerequisites that IaC cannot capture are written down for the next account.

## 5. Out of scope, restated

DynamoDB tables, device stub, agents, discovery engine, application API, frontend, product fixtures, CI/CD, monitoring, and public application ingress. Public ingress specifically stays closed until the application implements the NFR-5.2 passcode gate.

---

## Execution Record (Part 2, completed 2026-08-20T10:36:00Z)

All 39 plan checkboxes above are complete. Two things resolved differently from
the plan text, both recorded rather than silently absorbed:

1. **Step 3b decided as option A** by the user. Bedrock and Transcribe grants are
   on the role now. During the ponytail review `bedrock:Converse` and
   `bedrock:ConverseStream` were removed, because in an **Allow** policy they grant
   nothing — Converse authorizes on `InvokeModel` / `InvokeModelWithResponseStream`.
   The capability the user approved is fully present, and a real `converse` call from
   the instance confirmed it. **Correction**: the removal was first justified by
   claiming those two are not IAM action names. They are. The claim only holds for the
   Allow direction; in a **Deny** policy enumerating `bedrock:Converse` is valid.
2. **The `us-east-1` hard guard in `bin/prompthon-infra.ts` was dropped**, having
   been added earlier in the same session. The account SCP already denies other
   regions, and pinning one region in code works against the portability that is
   this unit's entire reason to exist. The account/region *resolution* guard stays,
   because `Vpc.fromLookup` genuinely cannot run without them.

Deployment ran twice: `CREATE_COMPLETE` at 09:26:43Z, then `UPDATE_COMPLETE` after
the review changes, with `cdk diff` confirming zero drift between the reviewed code
and the live stack. Evidence: `aidlc-docs/construction/infra/code/deployment-evidence.md`.
