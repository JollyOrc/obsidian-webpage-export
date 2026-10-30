# SCAR-003 — Acceptance criteria not fully checked before shipping

**Area:** Process / Requirements
**Severity:** High — features shipped missing whole criterion classes

---

## What went wrong

An acceptance criterion existed in the user story but was not implemented.
The implementation covered the primary function and most ACs, then shipped.
The missed AC was not caught until later because:

1. No checklist tied each AC to a test.
2. Tests were written alongside the code rather than against the full AC list.
3. There was no "every AC ticked before merge" gate.

In this project: US-7.2 AC-10 required the heading tracker to skip re-counting
injected titles. This was missed in v0.8.0. It was only discovered during the
v0.10.0 session when the full test suite was audited.

## Root cause

ACs are often read at the start of implementation to understand scope, then
not revisited at the end. Developers naturally write tests for what they built,
not for what they were asked to build — so a missed implementation produces
no test and the gap is invisible until someone reads the spec again.

## Prevention

- Before writing any code, read the complete AC list and create a test stub
  (even a failing `todo` test) for **each criterion**. An unticked AC is
  a blocked task, not a later concern.
- Before marking a task done or opening a PR, run through the AC list one more
  time and confirm each criterion has a passing test.
- Consider a lightweight table in the PR description: AC → test name → pass/fail.
  This takes two minutes and makes gaps immediately visible to a reviewer.
