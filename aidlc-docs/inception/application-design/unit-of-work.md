# Units of Work

**Stage**: INCEPTION - Units Generation
**Generated**: 2026-08-20T07:34:07Z
**Depth**: Minimal, by user decision

## Why this is short

The planning questions this stage would normally ask are already answered. Units, owners, boundaries and scope were settled during Workflow Planning and Application Design. The only genuinely new artifact is the story-to-unit map.

A dependency matrix at the level of detail this stage usually produces would repeat the mistake just corrected in Application Design, where an audit found interface over-specification in all five documents. So dependencies are stated at the level that actually constrains work, and no further.

---

## Three units

| Unit | Owner | Scope |
|---|---|---|
| **INFRA** | 1 person | IaC for AWS resources, environment contract, local run setup, deployment preparation |
| **BE** | 1 person | Three agents (1:1:1), Skill Discovery, skill lifecycle, REST + SSE API, `device-stub` |
| **FE** | 1 person | Mobile-first browser app. Character screen, chat, stats, progression, skill list, audio capture, i18n |

**INFRA owns zero user stories.** It is an enabling unit: every story depends on it, none belongs to it. Recorded so the story map does not look broken and nobody invents a story to fill the gap.

---

## Code organization

Monorepo with workspaces, single repository, already initialised.

```
packages/
  frontend/      FE
  backend/       BE
  device-stub/   BE
  shared/        types FE and BE agree on, as they agree them
infra/           INFRA
```

`shared` exists even though payload shapes are deliberately unfixed. Its purpose is that whatever FE and BE **do** agree lives in one place rather than being retyped on both sides. It grows as they settle things, which is the interface evolution policy working rather than contradicting it.

---

## Working conventions

**Branching**: each unit on its own branch, PR, review, merge. Already established.

**Shared file conflicts**: `aidlc-docs/aidlc-state.md` and `aidlc-docs/audit.md` are touched by all three units and will conflict. Decision: **leave them shared, and one person resolves conflicts as they arise.** No file splitting, no per-unit audit logs. `audit.md` is append-only so resolution is mechanical.

**Construction runs per unit and in parallel**: each unit does its own Functional Design and Code Generation. Artifacts land under `aidlc-docs/construction/{unit}/`, which does not overlap between units.

**Build and Test is joint** and comes after all three units. Integration is the substance of that stage, not a formality.
