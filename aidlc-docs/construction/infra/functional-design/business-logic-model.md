# INFRA Business Logic Model

## Purpose

INFRA is an enabling unit and owns no product business logic. Its functional responsibility is to make a reproducible AWS runtime available, publish a safe environment contract, and extend persistence only after BE supplies concrete access patterns.

## Decision Resolution

Question 1 selected provisional INFRA ownership, while its explanation required later expansion from BE definitions. Question 5 resolves the apparent conflict: **the initial provisioned environment contains no placeholder DynamoDB table or provisional immutable key**. INFRA provisions the runtime environment first, then adds DynamoDB from BE's access-pattern contract in a later CDK update.

Question 2 requires a minimal EC2 host now. Question 4 means the local backend continues to use profile `prompthon`, while the selected EC2 host receives a role that it actually uses. No unused standalone role or managed policy is created.

## Flow 1: Runtime-First Provisioning

1. Validate the selected AWS identity, account, and `us-east-1` region before synthesis or deployment.
2. Bootstrap the target account and region when the required CDK bootstrap stack is absent.
3. Synthesize and inspect a runtime-first stack containing the EC2 host, its used instance role, network placement, security group, and non-secret outputs.
4. Keep public application ingress closed until the application has the required shared passcode gate.
5. Deploy the stack and publish only non-secret outputs required by BE and local operators.
6. Verify the host is running and administrable without creating static AWS credentials.

## Flow 2: BE Persistence Handoff

**Simplified 2026-08-20T11:10:00Z by user directive.** The earlier seven-field
access-pattern contract is withdrawn as over-process for a demo. BE says what it
stores and how it reads it; INFRA decides the rest at ordinary demo defaults.

1. BE writes its data-access code against a table name supplied as an environment variable. That code is the statement of intent — there is no separate contract document to fill in.
2. INFRA reads it and derives table boundaries, partition and sort keys, and any index the lookups actually require.
3. Capacity, encryption, Streams, TTL, PITR, deletion protection, and removal policy take the fixed demo default and are not decided per table.
4. INFRA extends the same CDK stack and EC2 role with the resulting tables and resource-scoped grants.
5. The updated stack is synthesized, diffed, deployed, and smoke-checked before table names are published to BE.

Two things still get checked rather than defaulted, because both are expensive to
correct later: keys must be derived from a server-known owner rather than a
client-supplied identifier, and partition/sort keys are immutable once created.

## Flow 3: Environment and Secret Publication

1. Maintain one documented variable-name contract for local and hosted execution.
2. Keep `.env` uncommitted and place names or safe placeholders only in `.env-example`.
3. Use `AWS_PROFILE=prompthon` only for local execution; hosted execution obtains temporary AWS credentials from the EC2 instance role.
4. Keep `BEDROCK_MODEL_ID` configurable, defaulting to the approved Opus model with documented Haiku and Nova fallbacks.
5. Local execution reads the actual `FRIENDLI_API_KEY` only from the workspace-root `.env`.
6. Hosted execution references the standard SSM Parameter Store `SecureString` named `/prompthon/friendli-api-key`, encrypted with the default AWS managed `alias/aws/ssm` key.
7. The EC2 startup path requests that exact parameter with decryption and injects the result into the backend process as `FRIENDLI_API_KEY` without writing the plaintext to disk, User Data, logs, or stack outputs.
8. CDK owns the parameter name reference and the EC2 role's read permission, but never receives or provisions the plaintext value. An operator creates or updates the `SecureString` separately before the hosted backend starts.
9. Add DynamoDB resource-name variables only after Flow 2 completes.

## Failure and Recovery Behavior

- Identity, region, synthesis, diff, or deployment failure stops publication; partial success is not reported as a usable environment.
- A missing BE access-pattern contract delays only DynamoDB creation, not runtime-first provisioning.
- A missing or unreadable `/prompthon/friendli-api-key` parameter blocks hosted backend startup but does not block provisioning the EC2 runtime.
- There is no fallback that copies the local `.env` key to EC2 or embeds it in deployment inputs.
- Missing Bedrock entitlement is reported as a prerequisite failure, not hidden by infrastructure changes.
- A failed stack update relies on CloudFormation rollback; INFRA inspects the first failed event before retrying.
- The pre-existing `bedrock-apikey` stack is neither imported, modified, nor used.

## Completion Conditions

Runtime-first provisioning is complete when CDK bootstrap and deploy have succeeded in the live account, the EC2 host and used role exist, no unauthenticated application ingress is open, non-secret outputs are published, and prerequisites are documented. Hosted-secret readiness additionally requires the named `SecureString` to exist and the EC2 role to retrieve it without printing or persisting the plaintext. DynamoDB completion is a later update gated by BE's accepted access-pattern contract.
