# SCAR-019 — A configurable rule is specified and tested only at its default value

**Area:** Requirements / Verification
**Severity:** Medium — the rule was correct for the default and wrong for another allowed value; found only by a dry run before a manual check

---

## What went wrong

A rule that reads a setting was decided and written for the setting's default
value, then generalised in words to every allowed value. All examples, all
tests and the first implementation used the default. A value the rule allows
but no example used behaved differently from what the author wanted.

In this project: the running header of US-019 shows a chapter title for a
heading level `L` (default 2). The rule was decided for level 2 ("the last H2,
else the H1 title") and written as "the last level-`L` heading, else the last
level-`(L − 1)` heading". For `L = 3` the pages of a new `#` section showed a
`##` title from the previous section. The M8 dry run with a non-default preset
(`runningHeaderLevel: 3`) found it; the user decided "the last heading of
level at most `L`", which gives the same results for level 2.

## Root cause

The decision was asked and answered in terms of the default ("H2", "H1"), and
the generalisation to any value was written without an example of its own. A
default value hides the cases where the rule's levels or thresholds meet the
structure differently (here: level `L − 1` is no longer the top level when
`L` is 3).

## Prevention

- Every rule that reads a setting has one AC example at the default, one at
  each end of the allowed range, and one at a non-default value in the middle.
  For a level `1 to 6`, that is 1, 2 (default), 3 and 6.
- When a decision is asked in terms of the default ("the H2"), ask in the same
  question what it means for the other values, or write the generalisation as
  an open decision with an example, not as a silent rewording.
- Tests use at least one non-default value for every setting a rule reads, and
  the end-to-end test runs one composed note with non-default settings.
- The dry run before a manual check uses every preset the check uses, not only
  the default one, and its output is read page by page against the rule.
- Applies next to: page-number position and format (US-018), heading levels,
  numbering patterns, thresholds such as `cropWarningPercent`, column counts
  and any future per-preset rule.
