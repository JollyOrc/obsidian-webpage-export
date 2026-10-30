# SCAR-024 — A story states what a dependency does without measuring it

**Area:** Requirements / Integration
**Severity:** Medium — a false statement stood in a story marked Done for five days; a whole feature (template rules) silently did nothing

---

## What went wrong

An acceptance criterion described what a third-party tool would do with the
plugin's output, as a fact: the generated document imports the template "so
the template's functions and rules are available". The tests covered the
functions, which the code used. Nobody tested the rules. The tool's import
brings in definitions only, so no template rule ever applied. It was found
when a real template with styling rules was tried.

In this project: US-008 AC-9 (Done 2026-10-17); Typst's `#import` does not
carry `#set` and `#show` rules; found 2026-10-22 with the preset
"A5 MU Print", corrected by US-023.

## Root cause

A sentence about a dependency read like part of the specification, so it was
treated as settled. Only the part that the implementation exercised got a
test; the rest was taken from expectation, not from the tool.

## Prevention

- Every statement in a story about what a dependency does is split into its
  parts ("functions are available", "rules apply"), and each part has a test
  with the real tool before the story is Ready.
- A part that cannot be measured in time is written as an assumption
  ("not measured: …"), not as a fact, and stays an open item.
- When a story builds on another story's statement about a tool, the test
  that backs it is named; without one, it is measured first.
- An explanation of an observed failure is marked unverified until a test
  shows it; a change that makes the symptom go away does not prove the
  explanation. Example (2026-10-27, TICKET-072): a ligature was named as the
  cause of a failing PDF text search and withdrawn; the same search had passed
  in an earlier run, and the cause is not established.
- A statement about where a dependency fails names the code path the run
  actually takes, checked against the configuration. Example (2026-10-30,
  US-001 G0): the review cited the timeouts of the fallback renderer for an
  export that uses the main renderer (`useFallbackRenderer: false`);
  corrected while writing the diagnostic build.
- An outcome that varies between runs is reported with every measured
  count, not the first or the best one. Example (2026-10-30, US-001 AC-14):
  3/3 in one run, 2/3 in the next; both recorded.
- Applies next to: compiler and renderer behaviour, Obsidian API timing and
  events, file formats, library defaults.
