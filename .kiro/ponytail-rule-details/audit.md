# Ponytail: whole-repo over-engineering audit

Triggered by: "audit this codebase", "audit for over-engineering", "what can
I delete from this repo", "find bloat".

Same as the review rule, but scans the entire tree instead of a diff. Rank
findings biggest cut first.

## Tags

Same as review: `delete:`, `stdlib:`, `native:`, `yagni:`, `shrink:`.

## Hunt

Deps the stdlib or platform already ships, single-implementation interfaces,
factories with one product, wrappers that only delegate, files exporting one
thing, dead flags and config, hand-rolled stdlib.

## Output

One line per finding, ranked: `<tag> <what to cut>. <replacement>. [path]`.
End with `net: -<N> lines, -<M> deps possible.` Nothing to cut: `Lean already. Ship.`

## Boundaries

Scope: over-engineering and complexity only, not correctness/security/perf.
Lists findings, applies nothing. One-shot.
