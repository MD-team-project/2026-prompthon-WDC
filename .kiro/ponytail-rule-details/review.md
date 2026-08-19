# Ponytail: over-engineering review (diff/PR scope)

Triggered by: "review for over-engineering", "what can we delete", "is this
over-engineered", "simplify review".

Review diffs for unnecessary complexity only. One line per finding: location,
what to cut, what replaces it. The diff's best outcome is getting shorter.

## Format

`L<line>: <tag> <what>. <replacement>.`, or `<file>:L<line>: ...` for
multi-file diffs.

Tags:

- `delete:` dead code, unused flexibility, speculative feature. Replacement: nothing.
- `stdlib:` hand-rolled thing the standard library ships. Name the function.
- `native:` dependency or code doing what the platform already does. Name the feature.
- `yagni:` abstraction with one implementation, config nobody sets, layer with one caller.
- `shrink:` same logic, fewer lines. Show the shorter form.

## Examples

`L12-38: stdlib: 27-line validator class. "@" in email, 1 line, real validation is the confirmation mail.`
`repo.py:L88: yagni: AbstractRepository with one implementation. Inline it until a second one exists.`
`L52-71: delete: retry wrapper around an idempotent local call. Nothing replaces it.`

## Scoring

End with the only metric that matters: `net: -<N> lines possible.`
If there is nothing to cut, say `Lean already. Ship.` and stop.

## Boundaries

Scope: over-engineering and complexity only. Correctness bugs, security holes,
and performance are out of scope. A single smoke test or `assert`-based
self-check is the ponytail minimum, never flag it for deletion. Lists
findings only, does not apply the fixes.
