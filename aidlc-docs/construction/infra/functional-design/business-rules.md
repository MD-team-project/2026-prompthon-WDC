# INFRA Business Rules

## Scope Rules

1. INFRA provisions and configures AWS runtime resources; it does not implement agents, discovery, the device stub, application APIs, frontend behavior, or product fixtures.
2. The Infrastructure Design stage remains skipped. This Functional Design records only behavior, handoffs, constraints, and acceptance conditions required for Code Generation.
3. The initial deployment includes a minimal EC2 runtime but no placeholder DynamoDB table.
4. DynamoDB is added once BE's data-access code shows what it persists and how it reads it back. See the simplification note under DynamoDB Rules.
5. No CI/CD platform, multi-account framework, custom construct library, S3, CloudFront, ECS, Lambda, API Gateway, or monitoring stack is added without a concrete requirement.

## Portability Rules

1. Infrastructure is authored with TypeScript CDK under the `infra/` workspace.
2. `aws-cdk-lib` is pinned exactly to `2.266.0`; the CDK CLI version is pinned during Code Generation.
3. The target region is `us-east-1` because the current account denies relevant regional services elsewhere.
4. `infra/README.md` must document bootstrap, synthesis, diff, deployment, manual prerequisites, and future-account differences.
5. Bedrock model entitlement, `FRIENDLI_API_KEY`, account permission boundaries, and `iam:PassRole` restrictions are prerequisites rather than IaC-managed resources.
6. `cdk bootstrap` and `cdk deploy` must complete successfully against the current live account before it is deleted.

## EC2 and Network Rules

1. The EC2 instance role must be consumed by the provisioned host; no unused role or unattached managed policy is created.
2. Local execution continues to use AWS profile `prompthon` and does not require STS role assumption.
3. Hosted execution uses temporary instance-role credentials; static AWS access keys are never copied to the host, repository, output, or browser.
4. No publicly reachable application ingress is enabled until the application implements the shared passcode gate required by NFR-5.2.
5. Administrative access must not require a world-open SSH rule. The concrete native management path is selected during Code Generation.
6. ECS/Fargate is excluded because the measured `iam:PassRole` whitelist does not include `ecs-tasks.amazonaws.com`.

## Environment and Secret Rules

1. `.env` remains gitignored and `.env-example` contains variable names and safe placeholders only.
2. Local execution reads the actual `FRIENDLI_API_KEY` only from the workspace-root `.env`.
3. Hosted execution uses the standard SSM Parameter Store `SecureString` `/prompthon/friendli-api-key`; the non-secret parameter name is exposed as `FRIENDLI_API_KEY_SSM_PARAMETER`.
4. The `SecureString` uses the default AWS managed `alias/aws/ssm` KMS key. A customer-managed KMS key and Secrets Manager are excluded until rotation, cross-account use, or finer KMS policy control is required.
5. The plaintext Friendli key is created or updated separately by an operator. It never enters CDK context, CloudFormation templates or outputs, User Data, source, committed files, or logs.
6. The EC2 startup path requests the parameter with decryption and injects it into the backend process as `FRIENDLI_API_KEY` without persisting plaintext to disk.
7. The remaining contract includes `AWS_PROFILE=prompthon` for local use only, `AWS_REGION=us-east-1`, and configurable `BEDROCK_MODEL_ID`.
8. `BEDROCK_MODEL_ID` defaults to `us.anthropic.claude-opus-4-6-v1`; Haiku 4.5 and Nova Lite remain documented fallbacks.
9. Stack outputs contain no credentials, bearer tokens, API keys, or raw sensitive data.
10. The pre-existing `bedrock-apikey` stack and its bearer token remain untouched and unused.

## DynamoDB Rules for the Later Update

**Simplified 2026-08-20T11:10:00Z by user directive.** The previous version required a
seven-field access-pattern contract from BE. That was over-process for a demo. **BE
states what it uses DynamoDB for; INFRA decides table count and keys from that;
everything else takes ordinary demo defaults.**

1. **BE's only obligation is to say which data it persists and how it looks that data up.** Its repository code counts as the statement — no form, no separate document. INFRA derives table boundaries, keys, and any index from it.
2. Table count and key design are INFRA's call, made from BE's stated usage. Table count is an output of that, not a preset target.
3. Current device state, conversation history, speech audio, and committed JSON fixtures are not stored in DynamoDB.
4. Persisted scope is limited to accumulated usage events, character progression, discovered skills with provenance and revisions, and feedback.
5. Everything not named above takes the ordinary demo default: on-demand capacity, AWS-owned encryption, no Streams, no TTL, no PITR, no deletion protection, CDK `DESTROY`. These are not re-litigated per table. BE overrides one only by naming a concrete need.
6. Keys must reflect the server-known owner or authorization boundary rather than an untrusted client-supplied identifier. **Kept as a hard rule** — it is a security property, not a performance preference, and it is the one key-design mistake that is expensive after the fact.
7. `Scan` is acceptable at demo volume. It is a note for the reviewer, not a rejection.
8. Resource names are published to BE only after the corresponding deployment and smoke check succeed.

**The one thing that genuinely has to be right first**: partition and sort keys are
immutable, so changing them means replacing the table. Everything else on this list
is a later `cdk deploy` away. That, and nothing else, is why provisioning waits for
BE's usage rather than guessing it.

## IAM Rules

1. Grants follow actual backend API operations and deployed resources; wildcard service access is not used where resource scoping is supported.
2. The EC2 role receives `ssm:GetParameter` only for the exact `/prompthon/friendli-api-key` parameter ARN; it receives no parameter list, path-wide read, or write permission.
3. The startup request must enable decryption. No explicit customer-managed-key `kms:Decrypt` grant is added while the standard parameter uses the default AWS managed `alias/aws/ssm` key.
4. Bedrock streaming, Transcribe streaming, and later DynamoDB access are granted to the used EC2 role only when the runtime needs them.
5. `iam:PassRole` is scoped to the EC2 role and EC2 service path required by the deployment.
6. No IAM user, long-lived access key, redundant bearer-token path, or unused credential resource is created.
7. Local profile permissions are documented as an external account prerequisite; CDK does not attempt to rewrite the Workshop Studio permission boundary.

## Validation Rules

1. Validate caller identity and region before every bootstrap or deploy.
2. Run type checking, CDK synthesis, and CDK diff before deployment.
3. Treat a successful command as insufficient until the expected CloudFormation stack, EC2 host, role attachment, security posture, and outputs are observed.
4. The runtime-first deployment must prove that no DynamoDB placeholder was created.
5. Validate that the SSM parameter metadata exists at the exact name and that the EC2 role can request it with decryption, while suppressing the plaintext from command output and logs.
6. A missing parameter may leave the EC2 runtime deployed but must prevent the hosted backend from being reported as ready.
7. The later persistence update must prove table status, key schema, and EC2 role grants match what BE's data-access code actually needs. The operational profile is the fixed demo default and needs no per-table justification.
8. Any public deployment must demonstrate the passcode gate before application ingress is opened.
