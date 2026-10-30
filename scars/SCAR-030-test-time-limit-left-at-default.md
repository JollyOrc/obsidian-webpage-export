# SCAR-030 — A test's time limit is left at the default for heavy work

**Area:** Verification / Test tooling
**Severity:** Low — no wrong result shipped; the gate went red without a defect, twice

---

## What went wrong

Tests that do seconds of work in their own body kept the test runner's
default limit of 5 s. They passed when run alone and failed by their time
limit when the whole suite ran in parallel and the machine was busy. Each
time the red gate first looked like a regression, and each time the fix
reached only the tests that had just failed.

In this project: on 2026-10-28, 14 `describe` blocks that convert the whole
sample note timed out under load and got a 60 s limit (commit "test time
limits"). On 2026-10-29 the packaging test `US-007 AC-12: main.js contains
the compiler WASM …`, which compresses the compiler WASM itself to compare,
took 5018 ms against the 5000 ms default in the gate of TICKET-086; alone it
passed in about 9 s for the file. It got a 60 s limit with the measured
reason in a comment.

## Root cause

The time a test needs was never measured or stated; the default limit was
taken as fitting every test. A limit is a property of the work a test does
and of the load it runs under, and the first fix was applied to the tests
that failed, not to the kind of work that made them slow (SCAR-017).

## Prevention

- A test that does work of its own beyond a fraction of a second
  (converting a whole note, compressing, compiling, building, rendering)
  sets its time limit explicitly, from a time measured during a full
  parallel run, with a margin, and the measured time in a comment.
- A timeout is read first as a limit too tight under load: the test is run
  alone; only a failure alone, or a time far above the measured one, points
  at the code.
- When a limit is raised, the tests are searched for the same kind of work
  (the same helper, the same input file, the same tool) and each one gets
  its limit in the same change.
- Applies next to: integration tests with the compiler, build and packaging
  tests, tests over the sample vault, mutation runs that time the suite.
