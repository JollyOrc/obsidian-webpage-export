# SCAR-026 — A pattern match is taken for an instance of the class it is meant to find

**Area:** Requirements / Verification
**Severity:** Medium — a decision was made on wrong counts, and a scripted replace changed the project's own words; found because a test went red

---

## What went wrong

A word list was meant to find the uses of some terms as terms. The scan
counted every match of every word, and the counts were put to the user as the
size of the class. Some of the words are also ordinary words of the project,
so the counts mixed both. The user chose on them, and the scripted replace
that followed changed ordinary uses too: a field name of the project's state
files became a different word, and a test that reads it went red.

In this project: US-024, TICKET-072. The short-term scan counted "Action" and
"Turn" wherever they occur; "Next Permitted Action" and "Turn … on" are not
rules terms. The files were restored from the backup, the matches were
classified by context, and the user chose again on the split.

## Root cause

A match is evidence that an instance may be there, not an instance. The scan
answered "where does this string occur", and its numbers were used as the
answer to "where is the thing we mean". Nothing classified the matches before
they were counted, offered as a choice, or replaced.

## Prevention

- Before a search result is counted, offered or acted on, classify its matches
  by context (for example: the term as a heading, link or test datum, against
  the same word in prose, code identifiers or fixed vocabulary) and report the
  numbers per class.
- A choice that rests on such counts shows the split, not only the total.
- A scripted replace works from a reviewed list: the classes to replace, and a
  keep-list of matches that stay, each named by file and line; the run checks
  the keep-list after it.
- Applies next to: renames, removal of sensitive or quoted text, deprecations,
  anything found by a word list or a pattern.
