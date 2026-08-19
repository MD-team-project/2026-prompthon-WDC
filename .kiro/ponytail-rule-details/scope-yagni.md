# Ponytail: spec/architecture-level YAGNI (Inception)

Applies to specific decision points inside Inception — NOT a blanket override
of Inception's thoroughness. `overconfidence-prevention.md` still governs:
keep asking clarifying questions when something is ambiguous. This file only
shapes the DEFAULT/RECOMMENDATION at the moment a choice gets made, in three
places:

## 1. Requirements Analysis — extensions opt-in question

When the security-baseline / resiliency-baseline / property-based-testing
opt-in question comes up, default the recommendation to the skip option
(`No` for security/resiliency, `No` or `Partial` for PBT) UNLESS the vision
document or the user has explicitly stated a production/compliance/
reliability requirement that justifies it. State the one-line tradeoff when
presenting the choice ("skips 15 blocking rules, revisit before go-live") —
don't silently default, and don't pre-argue the user out of Yes if they
already indicated they need it.

## 2. Application Design — component/service count

Don't split into more components or services than the current requirements
justify. A single service that later needs splitting is a smaller cost than
a wrongly pre-split architecture the team now has to coordinate across for a
2-day build. If the design is about to produce more than ~3-4 top-level
components for an MVP, flag it explicitly: "N components proposed — do all N
need to exist for this MVP, or can some collapse into one until a second
consumer appears?"

## 3. Units Generation — unit-of-work boundaries

Only split into separate units where a genuine parallel-development boundary
exists (distinct personas, distinct data domains, or clearly separable
interfaces). Don't split for org-chart reasons ("we have 3 people so let's
make 3 units") or speculative future flexibility. Fewer, coarser units beat
many fine-grained ones when the team is small and the clock is short —
coordination overhead across units costs more than intra-unit ordering.
