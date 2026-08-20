# INFRA Domain Entities

## Modeling Note

INFRA owns no product-domain entities. This artifact defines only three handoff records needed to provision and verify the environment. They are documentation contracts, not mandatory TypeScript interfaces or framework abstractions.

## Records

| Record | Required fields | Producer | Consumer |
|---|---|---|---|
| `RuntimeContract` | account, region, stack name, EC2 identifier, used role, network/security-group identifiers, management path, SSM parameter name, non-secret environment names, deployment status | INFRA/CDK | INFRA and BE |
| `BackendDataUsage` | what BE persists, and how it looks each thing up. BE's repository code satisfies this; no separate document | BE | INFRA |
| `DeploymentEvidence` | target identity, deployment stage, observed resource, status, timestamp, failure reference | INFRA | Review and handoff |

`BackendDataUsage` justifies later DynamoDB resources and role grants. Those are CDK implementation details rather than additional domain records.

**Simplified 2026-08-20T11:10:00Z by user directive.** This record was previously `BackendAccessPattern` and demanded seven fields per operation, including consistency need, result bound, and rough RPS. Withdrawn as over-process for a demo. INFRA now decides table count and keys from BE's stated usage and applies ordinary demo defaults for everything else.

## Environment Contract

| Name | Scope | Secret | Initial state | Rule |
|---|---|---:|---|---|
| `AWS_PROFILE` | Local only | No | `prompthon` | Never used as hosted credentials |
| `AWS_REGION` | Local and hosted | No | `us-east-1` | Must match deployed resources |
| `BEDROCK_MODEL_ID` | Backend | No | `us.anthropic.claude-opus-4-6-v1` | Configurable; never hard-coded in agent logic |
| `FRIENDLI_API_KEY` | Local backend/process memory | Yes | Root `.env` locally; runtime injection on EC2 | Never committed, output, logged, or persisted on EC2 |
| `FRIENDLI_API_KEY_SSM_PARAMETER` | Hosted backend | No | `/prompthon/friendli-api-key` | Names one standard `SecureString`; CDK handles only the name and read permission |
| DynamoDB resource names | Backend | No | Absent initially | Added only after BE contract approval and successful deployment |

## Hosted Secret Lifecycle

1. An operator creates or updates `/prompthon/friendli-api-key` as a standard `SecureString` outside CDK.
2. Parameter Store encrypts it with the default AWS managed `alias/aws/ssm` key.
3. The EC2 role can call `ssm:GetParameter` only on that parameter ARN.
4. The startup path requests decryption and injects the value as `FRIENDLI_API_KEY` into backend process memory.
5. The plaintext is never written to CDK inputs, User Data, stack outputs, committed files, application logs, or EC2 disk.

## State

- Runtime: `planned` -> `synthesized` -> `diff-reviewed` -> `deployed` -> `verified` -> `published`.
- BE data usage: `stated` -> `modeled` -> `provisioned` -> `published`.

A runtime is not published before verification. BE data usage is `stated` as soon as its repository code shows what is persisted and how it is read back.

## Excluded Entities

Character, device, skill, usage event, feedback, conversation, and application API payloads belong to BE/FE. This artifact constrains where they may be persisted but does not define their application schema.
