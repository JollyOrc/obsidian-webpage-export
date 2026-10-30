# SCAR-032 — A count over a folder includes generated output

**Area:** Verification / Tooling
**Severity:** Medium — a baseline would have passed or failed depending on whether a build had run

---

## What went wrong

A lint baseline was measured by running the linter over the source folder.
The folder also held the output of the build (a generated, git-ignored
bundle), and the linter counted its findings too. The number written down
(621) was right for a tree that had just been built and wrong for a fresh
checkout (478). A gate based on it would have flagged or hidden 143 findings
depending on the order in which commands had run.

In this project: US-001, G0 and G2 (2026-10-30). `eslint src` included
`src/frontend/dist/index.txt.js`; re-measured with the build output ignored
and with it moved away: 478 both times.

## Root cause

The measurement took the folder as the unit, not the files the count is
about. Generated files live inside source folders in many projects (`dist`,
caches, compiled assets), and git-ignore keeps them out of version control
but not out of tools that walk the file system.

## Prevention

- State what a count is over (which files, which are excluded and why)
  together with the number, and exclude generated and third-party files by
  path.
- Measure a baseline twice: with the generated output present and with it
  absent (or ignored); the two numbers must be equal.
- When a count changes unexpectedly, list the findings by file before
  explaining it (SCAR-026).
- Applies next to: lint and type-error baselines, coverage numbers, file and
  word counts, size budgets, any guard that walks a directory (fetched
  third-party code in a fixture is the same case).
