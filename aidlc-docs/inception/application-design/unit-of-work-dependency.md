# Unit Dependencies

**Stage**: INCEPTION - Units Generation
**Generated**: 2026-08-20T07:34:07Z
**Depth**: Minimal

## Dependency matrix

Rows depend on columns.

| | INFRA | BE | FE |
|---|---|---|---|
| **INFRA** | - | no | no |
| **BE** | **yes** | - | no |
| **FE** | no | **yes** | - |

Three facts follow, and they are the only ones that constrain how work is sequenced:

1. **INFRA depends on nothing.** It starts immediately and blocks on no one.
2. **INFRA blocks BE.** BE needs provisioned resources and the environment contract. This makes INFRA's first block of work non-interruptible.
3. **FE depends only on BE**, and can mock past it.

## Ordering consequence

```
INFRA  ###########.....................  starts at 0, unblocks BE
BE     .....######################.....  needs INFRA first
FE     ...##########################...  mocks BE, so starts almost immediately
```

FE is nearly unblocked from the start **provided it mocks the backend**, including a fake SSE stream. Without that mock FE waits on BE and roughly a third of the team's capacity is idle for most of the build. This is the single most consequential item in this document.

## What is deliberately not here

No per-artifact dependency list, no version compatibility matrix, no coordination protocol. Three units, one dependency each at most, and three people who can talk to each other. Anything more would be process for its own sake.
