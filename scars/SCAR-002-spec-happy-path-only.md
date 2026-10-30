# SCAR-002 — Specifications written only for the top-level happy path

**Area:** Requirements / Specification
**Severity:** High — produces structurally wrong output for any non-trivial input

---

## What went wrong

A user story described the expected behaviour for the simplest, most obvious
case (a standalone top-level document) without considering what happens when
the same feature is used in a nested or composed context. The implementation
faithfully matched the spec — and was wrong for every nested use.

In this project: US-7.2 specified that an injected heading defaults to `h1`.
That's correct at the document root. When the same file is embedded inside
an already-headed section the injected heading must be `parentDepth + 1`, not
always `h1`. The nested case wasn't mentioned and so wasn't implemented.

## Root cause

The spec author was thinking about the feature in isolation and wrote the AC
from the user's mental model of the simplest case. The feature composes with
other features (nesting, embedding), and those compositions were not explored
during spec writing.

## Prevention

- For any feature that touches structure (headings, depth, nesting, ordering),
  write at least one AC for a non-trivial composed case: "what happens when
  this feature is used *inside* another feature?"
- ACs must show the expected output at the **exact structural level**, not just
  "the heading appears at the right level". Words like "appropriate depth" or
  "correct level" are not acceptance criteria.
- During spec review, ask: "does this AC still hold if this feature is two
  levels deep?" If the answer requires thought, that thought belongs in the AC.
- Write every example of a story as a real note and run it through the whole
  converter, with every other story's rules and the built-in defaults on,
  before it goes into the story. The same holds for plugin behaviour: an
  example of a control or a screen is checked against every rule of the
  plugin it passes through (preview controller, panel, settings, export run),
  read from the stories that own them (widened 2026-10-21, US-020: a
  `Preview` example said "the panel shows the note", but US-012 AC-4 gives
  `Note changed; press Refresh` when the panel already shows another note;
  found only by the manual check M10). An example that only the new story's rule
  sees is not a composed case. Example (2026-10-20, US-019): a header example
  used a `# Glossary` section with an `##` chapter; the built-in glossary rule
  of US-017 turns that `##` into a term, so the example could never show its
  title.
- List the wrappers at every level, not only block nesting: block containers
  (callouts, quotes, lists, tables, footnotes) and inline wrappers (bold,
  italic, highlight, strike, underline, links, spans), and give an example of
  the new piece inside each. Example (2026-10-21, US-018): the composed cases
  of a page number after a link named footnotes, callouts and cells but not a
  bold link; whether the number goes inside or after the bold was an open
  decision found only when the examples were run.
- After a decision changes a rule, measure again every example of the story
  that passes through that rule, not only the criterion the decision names.
  Example (2026-10-28, US-025): decision 1 let the first block break; AC-5 was
  rewritten, but a page table in AC-2 still showed the old pages and was found
  only when its test was written.
- When a story builds on another story's output, list the decisions and rules
  of that story that shape the shared output; each gets one composed example
  in the new story, and a behaviour the other story leaves unstated is asked,
  not assumed by a test. Example (2026-10-29, US-027): US-026 decision 7 (text
  before the first chapter is front matter) had no contents example, so text
  before the first chapter ran on into the contents without a page break until
  a sharpened test showed it; whether a printed colophon heading carries a
  number was stated nowhere, and the composed test assumed it did not
  (decided: it does, US-026 decision 8).
- A defect fix measures every criterion its changed code path serves, not
  only the one it fixes, before it is declared done. Example (2026-10-29,
  TICKET-095): the fix of the image look wrapped the helper's output in a
  block; the look was measured 71 of 71, but the floats the same helper
  places stopped floating, found only when M18 was prepared (TICKET-096).
