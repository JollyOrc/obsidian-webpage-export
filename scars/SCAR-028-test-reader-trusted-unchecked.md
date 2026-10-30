# SCAR-028 — A test reader is trusted without a check of its own

**Area:** Verification / Test tooling
**Severity:** Medium — paragraphs vanished from what the tests read; one earlier symptom was explained away and the defect stayed for weeks

---

## What went wrong

The tests read the text of a PDF with a small reader of their own. Some
paragraphs were missing from what it returned, although the PDF showed them.
The first time it was seen, the loss was explained by the page ("text is
missing on pages that carry an image") and the tests were moved to another
way of reading. The second time a marker paragraph vanished from a page with
no image. The reader ended a literal string at the first `)`, but the format
allows balanced, unescaped parentheses inside a string, and the compiler
writes some glyph runs that way.

In this project: US-028 spike and US-026 G2 (2026-10-28). `readPdfPages`
lost the text after a run such as `(\000(\000\006\000)\000*)`; replaced by a
tokenizer that counts nesting; all other integration tests stayed green.

## Root cause

A reader written for the tests is a dependency like any other, but it was
treated as an instrument that cannot be wrong. Its pattern was written from
the strings seen at the time, not from the syntax the format allows, and a
reading that came back short was explained by the input instead of checked
against the reader.

## Prevention

- When a reader returns less than the source holds, check the reader first:
  read a known input with the same feature (here a page that shows the text)
  and compare, before any explanation of the input is written down.
- A reader of a file format is written from the format's syntax rules (nesting,
  escapes, alternative forms such as hex strings) and gets a test per rule,
  not only for the strings seen so far.
- An explanation that a reader "cannot see" some part of the output is marked
  unverified (SCAR-024) until a test of the reader shows it.
- Applies next to: PDF, YAML, CSS and source-text readers in tests, log
  parsers, any helper that turns output into data for an assertion.
