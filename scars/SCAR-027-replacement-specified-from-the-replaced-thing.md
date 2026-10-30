# SCAR-027 — A replacement is specified from the thing it replaces, not from what its users rely on

**Area:** Requirements
**Severity:** Medium — found twice after the story was Ready: once before the tickets (nine test files), once while rewriting the manual checks

---

## What went wrong

A test fixture was to be replaced by a generated one. The story specified the
replacement from the old fixture's own structure: a census of its elements
and their counts. The users of the fixture relied on more than that. Nine test
files asserted facts the census did not hold (how links resolve, how often
titles repeat, how many links get a page number), and the manual checks
needed a cover that fits the page and a hand-made note that lay inside the
old fixture's folder.

In this project: US-024. G3 found the test facts and the story gained AC-2c
before the tickets; TICKET-073 found the cover and the note while rewriting
the manual checks, and the generator and the scratch vault were changed.

## Root cause

The replacement was described by what the old thing is, not by what each
user of it asserts or assumes. The users were known (they were counted for
the migration), but what each one relies on was not listed when the
acceptance criteria were written.

## Prevention

- Before the acceptance criteria of a replacement are written, list every user
  of the thing being replaced — automated tests, manual checks, docs, scripts
  — and for each what it asserts or assumes (numbers, names, shapes, places).
- Each assumption becomes an acceptance criterion of the replacement, or is
  named as one that the replacement drops, with the user that must change.
- Applies next to: fixtures, test vaults, settings files, file formats,
  libraries, APIs and any component that is swapped for another.
