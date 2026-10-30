# SCAR-033 — A whole-tree check is assigned to a ticket that cannot make it green

**Area:** Process / Specification
**Severity:** Low — no wrong result; a ticket stayed open longer than planned and the gate was red for reasons outside it

---

## What went wrong

The first ticket of a story introduced a type check over the whole tree, and
its tests included "the current tree passes". The tests of the later tickets
of the same story were already written and red, and they imported modules
those tickets would create. The whole-tree check could not pass until the
last of those tickets was done, so the first ticket could not meet its own
definition of done, and the release gate was red for reasons it did not own.

In this project: US-001 ticket #1 (2026-10-30): 26 of 28 tests; the two
whole-tree typecheck tests waited for #3; the user decided to keep #1 open.

## Root cause

Tests were assigned to tickets by the acceptance criterion they check, not by
what must exist for them to pass. A check over the whole tree depends on
every file in it, including the red tests that the process requires to be
written before any code (SCAR-003).

## Prevention

- When tests are written (G2), list every check that reads the whole tree
  (type check, lint, "all pages", counts) and name the ticket after which it
  can be green; assign it there or state the dependency in each ticket.
- Order tickets so that a whole-tree check lands with or after the last
  ticket whose files it reads, or scope it to the files that exist.
- A ticket that cannot meet its definition of done for this reason says so in
  its issue, with the evidence (the errors are all in other tickets' files).
- Applies next to: gate scripts, link checkers, coverage thresholds, any
  "everything passes" test written before the code.
