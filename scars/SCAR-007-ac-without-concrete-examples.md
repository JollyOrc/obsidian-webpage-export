# SCAR-007 — Acceptance criteria stated without concrete input/output examples

**Area:** Requirements / Specification
**Severity:** Medium — implementation required guesswork; first attempt wrong

---

## What went wrong

A user story described behaviour qualitatively ("the heading appears at the
correct depth") without providing a concrete example showing the exact expected
output. The implementation had to derive the formula from first principles,
got it wrong on the first attempt, and required a follow-up specification
document to correct it.

In this project: US-7.3 said a pass-through embed "passes the target heading
through at the right level" but did not define the depth formula for the case
where the pass-through file itself has no explicit depth annotation. The
implementation guessed `parentDepth + 1`; the correct answer is `parentDepth`
(no level consumed, because the pass-through file contributes no heading of its
own).

## Root cause

Writing qualitative ACs is faster and feels complete ("of course the depth will
be right"). But "right" embeds an assumption that implementer and spec author
agree on — and for structural or arithmetic features, they often don't.

The problem compounds when the feature composes with others: the depth of a
pass-through embed depends on the depth of its parent, which depends on the
depth of *its* parent, and so on. Without a worked example the composition is
impossible to reason about from the AC alone.

## Prevention

- Any AC involving a numeric, positional, or structural outcome must include
  a **concrete before/after example** with exact values. "Correct level"
  is not an AC; "appears as `##` when embedded one level deep" is.
- For features that compose (depth, ordering, nesting), include an example
  that chains at least two levels so the composition rule is visible.
- The simplest test of a good AC: can a developer implement it with no other
  information? If not, it needs more detail.
