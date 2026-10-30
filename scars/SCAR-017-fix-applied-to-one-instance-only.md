# SCAR-017 — A defect is fixed where it was seen, and the same pattern stays broken everywhere else

**Area:** Process / Verification
**Severity:** Medium — each time the user found the same defect again, one build later, on a sibling control

---

## What went wrong

Three times in one week the user found a defect, it was fixed on the control
where it showed, and the identical defect was found next on a sibling:

1. M5 (`0.1.0-m5.1`): the Fonts rows did not redraw after a change. The fix
   went into the Fonts rows only; the same stale-screen pattern was found again
   in the reset icon of the Defaults rows (M2, `0.1.0-m5.3`; SCAR-016).
2. The reset question (SCAR-014) was built for the Fonts rows and reached the
   older Defaults rows only because the user asked for it.
3. M2 step 14 (`0.1.0-m5.5`): half-typed numbers raised notices for every
   preset. The fix guarded the lone width and height in the two trim rows; every
   other text field of the tab (the Defaults rows, the Fonts rows, the presets
   folder, which even creates a folder per typed character) still saved on every
   key and was found one build later (`0.1.0-m5.6`).

## Root cause

A fix was written for the instance in the bug report, not for the class of the
bug. The code had no single place for the pattern (five copies of "save on every
key"), so nothing pointed at the siblings, and the tests named the instance
(`Trim width`), not the rule ("no field is saved on a half-typed value"). No
step in the fix asked "where else does this exist?".

## Prevention

- Every fix starts with a search for the pattern, not the instance: `grep` for
  the call, the control type or the shape of the code that caused the defect
  (here `addText(`, `onChange(`), and the list of hits goes into the ticket
  with the decision for each: fixed, or why it is not affected.
- The rule is stated for the class in the user story ("every text field …"), not
  for the control that was reported, and the AC names every member of the class.
- Put the pattern in one function (here `commitOnChange`) and make the test a
  text check over the whole file that fails when a new instance bypasses it
  (count of `addText(` equals count of `commitOnChange(`; no `onChange(` on a
  text component). A new control then breaks the test, not the user's afternoon.
- A bug report from a manual check is answered with "the same defect may be on:
  <list>" in the handover, and the manual check step covers one more member of
  the class than the one that failed.
- A story that adds a way to change a value lists, in its inventory of today's
  behaviour, every place that writes that value, found by a grep for the value
  itself (`activePreset:`), not only by looking for commands and buttons.
  Example (2026-10-21, US-020): the story's inventory missed the style
  panel's preset dropdown; the class grep found it only at coding time.
- Moved on 2026-10-22 to SCAR-023 (items 6 and 7 of this list before that
  date): a text check matches the whole statement, and a drawing a fake can
  carry is drawn; before tickets, the tests are searched for guards that
  forbid a new call.
- The documents written for the fix (story, tests, tickets) are part of the
  class and go through the same check. Example (2026-10-27, US-024): the story
  that removes private words from the published files named two of them, and
  an example in it quoted a removed heading; the story's own scan found both.
- Applies next to: every defect found in M-checks (stale screens SCAR-016,
  confirmations SCAR-014, Enter key SCAR-013, validation, number formats), and to
  every refactor that copies a block between rows.
