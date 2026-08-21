# Build Instructions

**Stage**: CONSTRUCTION - Build and Test
**Created**: 2026-08-21T00:20:00Z
**Status**: COMPLETE. Stage approved 2026-08-21T01:40:00Z
**Covers**: all three units - INFRA, BE, FE

---

## 1. Prerequisites

| Requirement | Value | Why it is not negotiable |
|---|---|---|
| Node | **22 or newer** | `@langchain/openai` requires it, and that is the mandated EXAONE path. `engines.node` is `>=22` at the root. Node 20 installs and then fails |
| npm | 10.x | Comes with Node 22 |
| AWS profile | `prompthon`, region `us-east-1` | The account denies DynamoDB, Transcribe and EC2 outside `us-east-1` |
| `.env` | copied from `.env-example` | `FRIENDLI_API_KEY` and `FRIENDLI_ENDPOINT_ID` are read with a **loud failure at boot**, not lazily |
| Bedrock model access | console action, per account | **Not IaC-manageable.** No entitlement API exists. A fresh account can apply the IaC perfectly and still fail to run the app. Checklist in `infra/README.md` |

`pnpm` and Docker are deliberately not used. npm workspaces satisfies the monorepo decision and nothing here needs a container - `ecs-tasks.amazonaws.com` is absent from the account's `iam:PassRole` whitelist, so there is no container target anyway.

## 2. Install

```bash
npm ci        # from the repo root
```

The root `workspaces` array is `["infra", "packages/*"]`. **`infra` has to be in it** - drop it and CDK's dependencies stop installing, which fails at synth rather than at install and is therefore confusing.

## 3. Build order, and why it is fixed

```
packages/shared  ->  packages/device-stub  ->  packages/backend
                 ->  packages/frontend                       (independent)
infra                                                        (independent)
```

`shared` first, always. Both `device-stub` and `backend` import it, and `tsc -b` resolves project references rather than source.

### Backend side, and the stub

```bash
npm run build      # shared, then device-stub, then backend
npm run check      # tsc -b across the same three, no emit
```

### Frontend

```bash
npm run build:fe   # tsc --noEmit, then vite build
```

Separate because FE is on its own toolchain and does not share the `tsc -b` graph.

### Infrastructure

```bash
npm run typecheck --workspace infra
npm run synth --workspace infra     # cdk synth
npm run deploy --workspace infra    # cdk deploy
```

**`cdk bootstrap` is required once per account and region** before the first deploy. It creates a `CDKToolkit` stack - S3 bucket, ECR repo, SSM parameter, five IAM roles - which **dies with the account** and must be re-established in any future one. This is the single axis on which Terraform would have been simpler, and it is written down here because it appears nowhere in the IaC itself.

## 4. Running it

```bash
npm run dev        # device-stub :4000 and backend :3000 together
npm run dev:fe     # frontend dev server
```

Or from the built output:

```bash
npm run start      # both compiled processes
```

**Start order matters less than it looks.** `device-stub` seeds its fixture history into the backend at boot and **retries five times at one-second intervals** if the backend is not listening yet, logging loudly on final failure rather than swallowing it. A fixture that never loads is the quiet-failure risk this retry exists to make noisy.

## 5. Environment variables

Full list with notes in `.env-example` and `packages/backend/README.md`. The three that actually bite:

- **`DDB_TABLE_NAME`** - the `prompthon-local` default **does not exist**. The real value is CloudFormation-generated, so never guess it:
  ```bash
  aws cloudformation describe-stacks --stack-name prompthon-runtime --profile prompthon
  ```
  Read `DdbTableName` from the outputs. The name is generated rather than fixed on purpose: a custom-named table **cannot be replaced by CloudFormation at all**, because it would create the replacement before deleting the original and the names collide. That failure was hit for real.
- **`FRIENDLI_ENDPOINT_ID`** - not a secret, still required. The backend throws at boot without it.
- **`BEDROCK_MODEL_ID`** - the `us.` or `global.` prefix is **mandatory** for this account's Anthropic models. `anthropic.claude-sonnet-4-5-20250929-v1:0` fails; `us.anthropic.claude-sonnet-4-5-20250929-v1:0` works. Fallbacks: `us.anthropic.claude-haiku-4-5-20251001-v1:0`, then `amazon.nova-lite-v1:0`.

## 6. CI

`.github/workflows/ci.yml`. Node 22, `npm ci`, then typecheck, test and build.

**Frontend only.** It was created by the FE stream because PBT-08 requires property-based tests to run in a pipeline and none existed, and it names the frontend workspace explicitly so it would not fail while the other packages did not yet exist. Those packages exist now.

**Open item**: the workflow was never extended to `npm run check`, the root `vitest run`, or the infra tests. Recorded as a gap in `build-and-test-summary.md` rather than described as done.

## 7. Build results

| Target | Result |
|---|---|
| `npm run check` | clean, strict mode |
| `npm run build` | succeeds |
| `npm run build:fe` | succeeds. 175.28 kB JS / 56.19 gzipped, 21.80 kB CSS / 5.20 gzipped |
| `npm run typecheck --workspace infra` | clean |
| `cdk synth` | succeeds |
| `cdk deploy` | `prompthon-runtime` at `UPDATE_COMPLETE`, `cdk diff` clean |
| `npm audit` | 0 vulnerabilities |

**On that last row.** FE's dependency set was forced forward during Code Generation: six advisories on the vite 5 / vitest 2 line, all tracing to `esbuild <=0.24.2` including a critical Vitest RCE. Now on vite 8.2.2 and vitest 4.1.11, all dev-only, all cleared. Pin exact versions and check `npm audit` before adding tooling.

## 8. Character art is served, not bundled

`massagechair` has 121 real `.webp` frames totalling roughly 3.8 MB, served static. They are not in the JS bundle, which is why the numbers in section 7 stay small. `pral` and `shoecase` still use the CSS placeholder.

Consequence for any deployment: **static asset serving is a real concern here, not a placeholder one.** Frames also have no preloading, so a cold first playthrough can stutter.
