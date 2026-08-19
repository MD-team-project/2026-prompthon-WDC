---
title: Ponytail dispatcher
inclusion: auto
name: ponytail-lazy-coding
description: Apply YAGNI/minimal-implementation review during Construction: functional design, NFR design, infrastructure design, code generation, and build-and-test. Also fires at three Inception decision points: the security/resiliency/property-based-testing extensions opt-in question, application design's component/service breakdown, and units generation's work-unit split. Drives an automatic reviewer sub-agent after each unit's code generation completes, and a repo-wide audit when build-and-test begins. Does not reduce question-asking thoroughness during requirements analysis, user stories, or workflow planning.
---

# Ponytail dispatcher

This file is a router, not the ruleset. It only decides WHEN to act; the
actual rules live in `.kiro/ponytail-rule-details/`. Load the matching file
below before acting, the same way `core-workflow.md` dispatches into
`aws-aidlc-rule-details/`.

| Situation | Load |
|---|---|
| Construction-phase implementation work: functional design, NFR design, infrastructure design, code generation, build-and-test | `.kiro/ponytail-rule-details/core-ladder.md` |
| Requirements Analysis reaches the security/resiliency/PBT extensions opt-in question | `.kiro/ponytail-rule-details/scope-yagni.md` (section 1) |
| Application Design is about to define components/services | `.kiro/ponytail-rule-details/scope-yagni.md` (section 2) |
| Units Generation is about to split work into units | `.kiro/ponytail-rule-details/scope-yagni.md` (section 3) |
| code-generation.md is about to present a unit's Step 14 completion message | dispatch the `.kiro/agents/ponytail-reviewer.md` sub-agent (isolated context); apply its findings directly to the files; re-dispatch; repeat up to 2 review-fix cycles total; then proceed to Step 14 |
| build-and-test.md reaches Step 7/9 (all units done, once per project) | `.kiro/ponytail-rule-details/audit.md` |

Never apply `core-ladder.md` during Inception — it's written in code-level
terms (stdlib, dependencies, one-liners) that don't fit spec documents.
`scope-yagni.md` is the Inception-appropriate equivalent, and only fires at
the three decision points above; it never reduces question-asking thoroughness
in requirements-analysis, user-stories, or workflow-planning.

## Review-fix loop (code-generation.md, per unit)

1. Dispatch `ponytail-reviewer`. If it returns `Lean already. Ship.`, go straight to Step 14.
2. Otherwise, apply the returned findings to the unit's files directly (delete/stdlib/native/yagni/shrink per finding).
3. Re-dispatch `ponytail-reviewer` on the updated files.
4. Repeat step 1-3 once more if findings remain (2 cycles total, hard cap).
5. Proceed to Step 14 regardless. If findings still remain after the cap, add one line to the AI Summary: "Not auto-resolved: N ponytail findings, see review output above."

This loop never blocks the human approval gate at Step 15 — it only changes
what the code looks like before that gate is shown.
