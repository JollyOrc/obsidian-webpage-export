# SCAR-029 — Procedures a human runs are kept as sections of one large file

**Area:** Process / Documentation
**Severity:** Low — no wrong result shipped; a guard passed for the wrong reason and every handover pointed into a long file

---

## What went wrong

Every manual check (the procedures a human runs in the real application)
was a section of one file. After sixteen checks it had about 1 600 lines. A
handover had to point to a section inside it, every new check and every
rewrite of numbers changed the same file, and a check could not be linked,
recorded or replaced on its own. The guard that each check names the build
version to expect read "from the check's heading to the end of the file", so
an older check passed as long as any later check named the version.

In this project: `docs/technical/manual-checks.md`, M1 to M16, split on
2026-10-29 into `docs/technical/manual-checks/M01.md` to `M16.md` with the
old file as an index; the version guard now reads each file on its own.

## Root cause

Text meant to be read by a person was organised for the writer (one place to
append) instead of for the unit of use. What a human runs, answers or
approves one at a time is a unit of its own, but the file did not make it
one, so tools and tests could not address it either.

## Prevention

- Each unit a human runs, answers or approves on its own (a manual check, a
  review checklist, a decision questionnaire, a handover note) is a file of
  its own, named by its id (`M01.md`), with one index that links every file.
- A test guards the index against the files: one row per file, one file per
  row, in id order, each file starting with its own heading.
- Tests and tools read such a unit through one reader by its id, never by
  slicing a larger file from a heading onwards.
- A new unit gets the next id, its file and its index row in the same change.
