# Skill Discovery Workflow - BE Reference

**Status**: **REFERENCE MATERIAL, NOT A SPECIFICATION**
**Moved here**: 2026-08-20T05:47:33Z, out of the interface contract
**Owner**: BE. Expected to be revised or replaced during BE's Functional Design.

## Why this file exists separately

Application Design's job at this point is **aligning interfaces before three people split up**. This sketch went further than that - it began designing BE internals, which is the BE owner's territory.

Rather than delete the thinking, it is parked here. Treat it as a starting point to argue with, not a design to implement. **Nothing in this file is binding.**

What *is* binding on BE lives in `component-methods.md`: the application API and SSE shapes, the device API it consumes, the DynamoDB schema, the FR-5.11 access classes, the `AgentReply` envelope, and the EXAONE requirements section.

## Constraints this sketch must respect

These come from requirements, not from the sketch, so they survive any revision:

| Constraint | Source |
|---|---|
| Discovery runs on EXAONE | Mandated model, FR-5.11 |
| Background and asynchronous, never blocking an interaction | FR-5.9 |
| Triggered by accumulated data volume crossing a threshold | FR-5.10 |
| Completes with no human intervention once started | FR-3.2 |
| Every generated step references a capability that actually exists | FR-3.4 |
| Records provenance | FR-3.5 |
| Retired skills are not recreated unchanged | FR-3.12 |
| Tier assigned from the window: 14 days basic, 60 days advanced | FR-6.1 |
| Reproducible in shape; runs persist so they can be replayed | NFR-4.1 |

## First-pass sketch

An explicit LangGraph workflow rather than agent tool-calling, chosen because a graph runs the same nodes in the same order every time while a model deciding whether to call a discovery tool does not.

Note that `Skill`, `SkillStep` and `SkillCandidate` below are **illustrative names, not shared types.** They were deliberately removed from `component-methods.md` because none of them crosses an owner boundary - only `SkillSummary`, `SkillTrigger` and `Revision` leave the backend. Their actual shapes are BE's to define.

```typescript
interface DiscoveryState {
  productId: ProductId;
  windowDays: 14 | 60;
  events: UsageEvent[];
  existingSkills: Skill[];
  retiredSkills: Skill[];
  feedbackHistory: Revision[];
  candidates: SkillCandidate[];
  emitted: Skill[];
}
```

| Node | Purpose |
|---|---|
| `loadWindow` | Read the usage window. The only node touching sensitive data |
| `findPatterns` | EXAONE reasoning over events, thinking mode on |
| `synthesise` | Compose candidates over the capability vocabulary |
| `validate` | Reject steps referencing non-existent capabilities. Reject recreations of retired skills |
| `persist` | Write skill and run to DynamoDB, assign tier from `windowDays` |
| `announce` | Emit `skillDiscovered` and `levelUp` |

## The one idea worth keeping

Whatever shape BE settles on, **a validation step between synthesis and persistence is what makes FR-3.4 structural rather than aspirational.** If a generated skill referencing an unknown capability cannot get past that point, nothing hallucinated can ever reach a device call - and that property is what makes autonomous generation safe to demo live.

Everything else here is negotiable.

## Open questions for the BE owner

1. Does `findPatterns` and `synthesise` want to be one EXAONE call or two? One is cheaper and faster; two gives a cleaner place to validate between.
2. What is the threshold value for FR-5.10? Low enough that a few demo interactions cross it.
3. How is "the same kind of skill" judged for the NFR-4.1 shape-reproducibility claim?
4. **What latent patterns must the fixture contain?** This one is not optional and not internal - INFRA authors the fixture at the hour-4 handoff and cannot know what the workflow can detect. BE must produce this list before then.
