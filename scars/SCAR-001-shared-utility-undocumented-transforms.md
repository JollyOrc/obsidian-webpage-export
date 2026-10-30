# SCAR-001 — Shared utilities reused without documenting their transforms

**Area:** Documentation / Code design
**Severity:** Medium — silent wrong output; often only caught by tests

---

## What went wrong

A shared utility function was written for one purpose and later reused in a
new context. One of its internal transformations (in this case converting
hyphens to spaces) was correct for the original purpose but wrong for the
new one. The reuse happened without checking what every transformation the
function applies actually does, so the new call site silently produced
wrong output.

In this project: `titleFromFilename` was used to derive injected section
headings. Its hyphen→space conversion is right for human-readable link labels
but wrong for heading text that should preserve filename punctuation.

## Root cause

The function had no documentation listing its transformations. A new caller
could only discover what it does by reading the implementation — and even
then it's easy to notice the happy-path behaviour ("strips extension, capitalises")
without noticing a secondary transform ("also replaces hyphens with spaces").

## Prevention

- Every shared utility that applies more than one transformation should have a
  doc comment enumerating **all** of them, including ones that may seem minor.
- Before adding a new call site, explicitly read that list and confirm each
  transformation is appropriate in the new context.
- If a transformation fits some uses but not others, split the function rather
  than adding a flag or silently living with the wrong behaviour.
- Add a test using a hyphenated or otherwise "edge-case" input at the new call
  site before shipping, even if the unit tests for the utility itself pass.
