# SCAR-006 — No automated test gate before release; test failures accumulated silently

**Area:** Process / CI
**Severity:** High — multiple releases shipped with substantially broken behaviour

---

## What went wrong

Two consecutive releases shipped with failing tests. The failures were not
caught before tagging because there was no automated enforcement of "tests
green before release". At the start of the next work session 44 tests were
failing — covering features that were considered delivered.

## Root cause

- Tests existed but were not all run (or all passing) at release time.
- The release process was manual and did not include a test step.
- Some failing tests were silently known but treated as "will fix next
  iteration", without being tracked or skipped explicitly. This makes it
  impossible to distinguish "known acceptable red" from "new regression".

## Prevention

- The build/release command must run the full test suite and **block on any
  failure**. A release that skips this step is not a release; it is a gamble.
  (Fixed in this project in v0.10.0: `npm run build` now runs tests first.)
- A test that is intentionally deferred must be marked `skip` with a linked
  issue. A silently-red test is indistinguishable from a regression and erodes
  trust in the suite.
- Record the pass count in release notes ("360/360 tests passing"). This
  creates an auditable baseline and makes regressions immediately visible.
- Do not accumulate "will fix later" without a ticket. If it is worth fixing,
  it is worth tracking. If it is not worth tracking, it is not worth deferring.
