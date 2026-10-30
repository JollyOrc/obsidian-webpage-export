# SCAR-010 — Each generated piece is valid; the join between two pieces is not

**Area:** Verification / Specification
**Severity:** Medium — caught while specifying, before the code existed; three hazards were missing from specified, "Done" rules

---

## What went wrong

A converter writes a document by concatenating pieces: text, then a call to a
formatting function, then more text. Each piece was specified and tested on its
own and was correct. At the joins the target language reads characters across
the boundary: a `.`, `(` or `[` directly after a function call binds to the
call, a `;` after it is swallowed, and a `*` delimiter next to a `/` becomes a
comment marker. The tests for the pieces could not see any of this, because a
piece never has a neighbour in its own test.

In this project: US-013 AC-12 (the emphasis wrapper, "Done") only looked at
letters and digits next to the mark. The hazards above were found by writing
the exact output examples for the inline emitter, then measuring them with the
compiler (`~~gone~~.Next` → `#strike[gone].Next` fails; `a/**b**` → `a/*b*`
fails). A literal `;` after a call would have disappeared from the author's
text without any error.

## Root cause

Rules were derived per piece ("what does this function return"), and the
neighbours were only considered for the one kind of neighbour that had already
caused a failure (word characters). Every new piece type adds new neighbours
and new joins; nothing in the process asked "what can the next character do to
this piece, and what can this piece do to the next character?".

## Prevention

- For every emitter that concatenates pieces, list the join hazards of the
  target language **per piece type** before writing the examples: what a
  following character can bind to, what a preceding character can start, what
  the piece's own last and first character can combine with (comment markers,
  call syntax, escapes, delimiters).
- Verify each hazard with the real consumer and keep a "guard" test that shows
  the unsafe form still fails or loses text, so that the rule cannot be removed
  by accident.
- Test the cross product piece type × neighbour (the set of every kind of
  piece, plus boundary, blank, punctuation, word, slash, escape characters) with
  an expected result derived from the source tree, not from the emitter.
- Switch each rule off in turn (mutation check). A rule whose removal no test
  notices is not covered.
- Every new piece type (links, footnotes, figures) is a new row in the join
  table; add it in the same change.
- Moved on 2026-10-22 (item 6 of this list before that date): a guard over
  generated output asserts how many places it checked — now in SCAR-023, with
  the other ways a guard can miss its criterion.
