# SCAR-023 — A guard or test does not check what its criterion says

**Area:** Verification
**Severity:** Medium — tests passed with the rule broken, or failed on legitimate work; each time found only by a mutation run or a red baseline

---

## What went wrong

Four times a test did not match the criterion it named:

1. A guard over generated output read "the character after the call" with a
   pattern that does not match a line end; it checked 124 of 139 calls and
   passed (US-018).
2. A text check looked for a call by name; a mutant that wrapped the call in
   `if (false)` passed it (US-021).
3. Two mutants survived because the test inputs were ones the real producer
   never gives (a list out of the store's order, a file name without its
   extension), so the inputs never reached the rule under test (US-020).
4. A guard over the vault port forbade every `vault.process(` call although its
   criterion only said that export and preview never write presets; a later
   story's legitimate write turned the baseline red (US-022).

The first three pass when the rule is broken; the fourth fails when nothing
is wrong. (Gathered from SCAR-010, SCAR-017 and SCAR-018 on 2026-10-22.)

## Root cause

A guard was written from what was easy to match (a name, a pattern, an input
at hand), not from the criterion it protects, and nothing compared the two.
A guard that checks less than its criterion cannot fail; a guard that checks
more blocks the next correct change.

## Prevention

- A guard checks exactly its criterion: not less, not more. Write the
  criterion next to the guard and read both together.
- A guard over generated output asserts how many places it checked, against
  an independent count (the number of pieces written, a count from the
  source). A pattern that silently skips some places still passes.
- A text check matches the whole statement it guards — the condition and the
  call (`if (group.heading !== null) { …setHeading() }`), not a name — and a
  drawing that a test fake can carry is tested by drawing it; when the fake
  cannot carry it, the fake is extended to follow the measured behaviour of
  the real consumer.
- Every test input is one the real producer can give (a list the store always
  sorts stays sorted) and is named for the branch it reaches. A surviving
  mutant is read first as a test input that cannot reach the mutated rule.
- Before tickets are written, search the tests for every new call a ticket
  adds (a write, a delete, a network request) and list each guard test that
  forbids it. A guard that is wider than the acceptance criterion it names is
  narrowed to that criterion, with the reason, in the ticket.
- A test that one side wins over another also asserts that the losing side
  was in effect (a mark it leaves elsewhere); otherwise "it wins" cannot be
  told from "it was never applied". Example (2026-10-22, US-023): three
  tests "the preset wins over the template" passed before any code existed,
  because the template was not applied at all; each conflict template now
  also sets the page fill, and each test asserts it.
- Prove a guard with a mutation check: switch the rule off and see the guard
  fail.
- A test that output is the same on every run runs the code from two fresh
  starts (separate processes), so state taken at load time (a clock, a
  random seed) differs between the runs. Example (2026-10-27, TICKET-069): two
  generations inside one import could not see a seed taken from the clock; a
  mutant showed it.
- The search before tickets also lists every test that pins the whole
  membership of a list or object the ticket grows (the keys of the effective
  settings, the plugin's names, the rows); each is extended or narrowed in the
  ticket. Example (2026-10-28, TICKET-075): two tests of the effective
  settings were missed and went red with the new setting.
- That search is run by the names of the functions whose result the ticket
  widens (every `toEqual` over their return value), not only by the keys of
  the data. Example (2026-10-29, TICKET-086): the search looked for the new
  `toc` keys and missed a test that pinned the whole view `activePresetView`
  returns; it went red when the view gained the Defaults.
- When a criterion allows an exception at an edge, the guard checks that the
  exception occurs only there (for example only at the last case of a run of
  a sweep), never as an allowance granted to every case. Example (2026-10-29,
  TICKET-096): the float check accepted "the text after it is on the next
  page" for every float because AC-8 allows it at the tightest edge; a helper
  under which no float ever filled its gap passed all 35 PDF tests.
- A test sample of a producer's output is taken from or checked against the
  real output, not written from memory. Example (2026-10-30, US-001 #3): the
  HTML reader's script sample had no `<`, so a mutant that read script
  content as markup survived; 4 of 7 inline scripts of a real exported page
  contain `<`; a test with that shape was added.
- Applies next to: text checks over source files, guards over generated
  output, wiring tests, fakes of a framework.
