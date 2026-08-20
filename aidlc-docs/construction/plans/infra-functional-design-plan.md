# INFRA Functional Design Plan

## Status

- **Unit**: INFRA
- **Stage**: Functional Design approved
- **Document language**: English
- **Approval timestamp**: 2026-08-20T09:07:10Z
- **Next gate**: Start Code Generation Part 1 planning in a new session; no code is generated before plan approval.

## Scope

This stage defines the minimum functional contract for provisioning, environment publication, and validation. It does not execute the skipped Infrastructure Design stage and does not generate CDK or application code.

INFRA owns IaC and environment enablement. It does not own product logic, the device stub, the discovery engine, frontend behavior, application payloads, or product-authentic fixture data.

## Inputs Reviewed

- Approved requirements and storage split
- Application Design transport-only decision and interface evolution policy
- INFRA unit definition, dependency matrix, and story map
- Live AWS account survey and account-deletion constraint
- TypeScript CDK decision and measured Bedrock availability
- Security/Resiliency extension decisions and Ponytail YAGNI rules

## Execution Plan

- [x] Analyze the INFRA unit scope, approved decision precedence, dependencies, and extension configuration.
- [x] Collect and validate every answer in this file; resolve any ambiguity before design generation.
- [x] Define the minimal provisioning lifecycle and BE handoff in `business-logic-model.md`.
- [x] Define scope, data-boundary, credential, portability, and validation rules in `business-rules.md`.
- [x] Define only the required resource and environment contract records in `domain-entities.md`.
- [x] Validate Markdown structure, traceability, contradictions, and Ponytail YAGNI compliance.
- [x] Mark every completed plan step, update `aidlc-state.md`, and append the stage result to `audit.md`.
- [x] Present the standardized INFRA Functional Design review gate.

## Decision Questions

### Question 1: DynamoDB contract handoff

The latest approved Application Design deliberately leaves storage keys and access patterns open during Construction, while INFRA must still provision DynamoDB and resource-scoped IAM. How should INFRA and BE close this dependency?

A) **BE supplies a minimal numbered access-pattern contract before table/key finalization (recommended).** It includes caller, operation, authorization owner, consistency need, fields written/read, expected result bound, and rough request rate. INFRA can build the monorepo/CDK shell and environment contract in parallel, but does not invent keys or indexes.

B) **INFRA defines a provisional schema from the requirements and BE adapts to it.** This starts CDK immediately but reverses the latest interface-evolution policy and risks provisioning unused indexes or wrong keys.

C) **Deploy placeholder tables first and decide keys at the first integration checkpoint.** This demonstrates CDK deployment early but makes the first deployment disposable and may require table replacement.

X) Other (please describe after the `[Answer]:` tag below)

[Answer]: B. 일단 인프라 가용 환경을 구성해놓고, BE에서 정의한 내용을 바탕으로 확장할수있도록 구성되면 좋을듯

**SUPERSEDED 2026-08-20T11:10:00Z by user directive.** Option A's seven-field contract (caller, operation, authorization owner, consistency need, fields, result bound, rough request rate) is **withdrawn as over-process for a demo**. Kept here as history only — do not follow it. BE states what it persists and how it reads it back, which its repository code satisfies; INFRA decides table count and keys and applies ordinary demo defaults for everything else. Current rules live in `business-rules.md` under DynamoDB Rules.

### Question 2: EC2 scope in this unit

IaC portability and one successful `cdk bootstrap` plus `cdk deploy` are mandatory before the current account disappears. Public application deployment remains optional. What should the first reusable CDK stack include?

A) **Core resources only (recommended).** Provision the finalized DynamoDB resources and required resource contracts, verify the stack in the live account, and defer EC2 until public hosting is actually chosen. No unused compute role or networking is created.

B) **Include a minimal EC2 host now.** This makes the stack closer to a deployable application but adds instance, security-group, role, bootstrap/user-data, and passcode-gate coordination within the current time box.

C) **Add EC2 behind a CDK context flag.** This keeps one codebase for both modes but introduces an untested conditional branch unless both variants are synthesized and reviewed.

X) Other (please describe after the `[Answer]:` tag below)

[Answer]: B.

### Question 3: DynamoDB operational profile

Unless BE identifies a real operational difference between persisted aggregates, which table-level posture should the scaffolding phase use?

A) **Lean disposable demo profile (recommended for the three-day account).** On-demand capacity, AWS-owned encryption, no Streams, no TTL, no PITR, no deletion protection, and CDK `DESTROY` removal behavior. This is the smallest portable stack and easiest to recreate.

B) **Data-preserving profile.** On-demand capacity, AWS-owned encryption, no Streams or TTL, with PITR, deletion protection, and CDK `RETAIN` behavior. This reduces accidental-loss risk but complicates teardown and creates retained resources outside the stack lifecycle.

C) **Decide separately per aggregate after BE provides the contract.** Run the full per-aggregate operational interview for backup, Streams, capacity, TTL, encryption, and restore isolation before deciding table boundaries. This is more defensible for production but adds coordination to a hackathon stack.

X) Other (please describe after the `[Answer]:` tag below)

[Answer]: A

### Question 4: Local runtime IAM

The local backend currently authenticates through AWS profile `prompthon`; a dedicated compute principal does not exist until a deployment target is chosen. Which IAM approach should the first INFRA unit use?

A) **Use the existing profile locally and create no unused runtime role (recommended).** Document the exact DynamoDB, Bedrock streaming, and Transcribe actions the backend needs; attach them to a compute role only when EC2 or another runtime is selected.

B) **Create an assumable backend role now and require local STS role assumption.** This tests least privilege earlier but adds trust-policy and credential-switching setup for every developer.

C) **Create a managed policy now without a consuming role.** It can be attached later, but it is an unused resource until deployment and does not constrain current profile access.

X) Other (please describe after the `[Answer]:` tag below)

[Answer]: A

### Question 5: Initial DynamoDB level implied by Question 1

Question 1 selected option B, but the explanation says the environment should later expand from BE's definitions rather than requiring BE to conform to an INFRA-authored schema. What should the first deployed stack contain before BE provides its access patterns?

A) **Deploy the runtime environment first and add DynamoDB after BE's contract (recommended).** CDK bootstrap, EC2, its used instance role, networking, and environment publication are deployable first. DynamoDB is added in the next stack update without inventing immutable base keys.

B) **Deploy one minimal requirement-derived DynamoDB table now.** Use a generic composite base key with no GSI, then add attributes and indexes from BE's access patterns. This gives BE a table immediately but commits the immutable base key before its access patterns exist.

C) **Deploy separate minimal tables for the known data classes now.** Create usage-event and character-domain tables from the requirements, then extend each from BE's access patterns. This commits both table boundaries and base keys before BE confirms them.

X) Other (please describe after the `[Answer]:` tag below)

[Answer]: A

## Deliberate Omissions

- No concrete DynamoDB table, key, or GSI design before Question 1 is resolved and BE provides the selected input.
- No frontend artifact; INFRA has no UI scope.
- No CI/CD, multi-account framework, custom CDK constructs, S3, CloudFront, ECS, Lambda, API Gateway, VPC redesign, monitoring stack, or cost model without a concrete requirement.
- No duplication of `infra/README.md`; prerequisite and deploy commands belong there during Code Generation.

## Review Change 1: Hosted Friendli Secret

**User directive**: `SSM방식으로 반영`

- Local development keeps the actual `FRIENDLI_API_KEY` only in the gitignored workspace-root `.env`.
- Hosted execution uses the standard SSM Parameter Store `SecureString` `/prompthon/friendli-api-key` with the default AWS managed `alias/aws/ssm` key.
- An operator creates or updates the plaintext value outside CDK.
- CDK handles only the non-secret parameter name and an exact-ARN `ssm:GetParameter` grant for the used EC2 role.
- The EC2 startup path requests decryption and injects `FRIENDLI_API_KEY` into process memory without writing plaintext to disk, User Data, templates, outputs, source, or logs.
- Secrets Manager, a customer-managed KMS key, automatic rotation, and path-wide SSM permissions remain out of scope until a concrete need exists.