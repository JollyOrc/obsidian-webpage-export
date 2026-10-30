# SCAR-016 — A control shows or acts on the state of the moment it was drawn, not the state of now

**Area:** Usability / Specification / Verification
**Severity:** Medium — nothing was lost, but controls silently did nothing or showed outdated text until the settings tab was closed and opened again

---

## What went wrong

Twice in the settings tab the screen was built from a snapshot of the data and
then kept, while the data changed underneath it:

1. M5 (build `0.1.0-m5.1`): after the `Font folder` was typed, the font
   dropdowns and the `Missing: ☐ U+2610 …` notice stayed as they were until the
   tab was reopened.
2. M2 step 13 (build `0.1.0-m5.3`): the reset icon of a Defaults row used the
   value that the row held when it was drawn. A value typed in the open tab was
   not seen: the icon asked nothing and changed nothing, sometimes "after a few
   moments" (the redraw of another row), sometimes only after reopening.

Every automated test was green both times. The tests covered the question and
the flow with a value that was handed in at the start; none of them changed the
value between drawing and clicking.

## Root cause

Handlers were written as closures over a constant read once while drawing
(`const current = getField(...)`), and the specification described each control
in one state only (fresh tab, value already there). The order "draw, change the
data, use the control" was never an acceptance criterion, and the manual check
tried the controls on a freshly opened tab first. Both defects hide in a
tab that has been open for a while, which is how a user really works.

## Prevention

- A handler reads the state when it runs. It never uses a value that was read
  while drawing, except as the text it displays. Pass a reader function
  (`() => value`) instead of the value into any helper that a click calls.
- When a change elsewhere on the screen alters what a control shows (folder →
  families, preset → effective values), the specification names the redraw or
  the update, and a test or a manual step checks it without reopening the tab.
- Every acceptance criterion for a control has an example in the order
  draw → change the data → use the control, with the value of the change in it
  (example: type `5`, leave the field, click the icon at once).
- A test for such a helper changes the value after the control is created and
  before it is used (a mutable holder, not a constant), and shows that the old
  value is not used; a text check shows that the UI code passes a reader.
- Manual checks for settings screens are run on a tab that stays open: change a
  field, then use the next control at once, and only then reopen the tab.
  The check says "without closing the tab".
- When a story adds a way to change a value (a menu item that sets the active
  preset), it lists every screen that shows that value and how each one
  updates — redraws on the change, or is built when it is opened — with a
  test per screen. Example (2026-10-21, US-020): a preset chosen from the new
  ribbon menu (and, since US-012, from the panel's dropdown) left an open
  settings tab showing the old preset, because the tab listened to preset
  notes only; found while an M10 step was written that asked for both screens
  open at once.
- A screen drawn before its data is loaded is in the class too: the loader
  announces every load to its listeners (also one that finds nothing), a test
  draws the screen before the load and looks after it, and the manual check
  runs once across a restart with the screen open. Example (2026-10-21,
  US-021): the preset store announced changes but not its load; the style
  panel that Obsidian restores at startup kept an empty preset dropdown until
  a later change (a gap since US-012, found by M11 step 3).
- Applies next to: every settings row, button, menu and list item that is built
  once and clicked later (use, duplicate, rename, delete, a future cover picker
  or font picker).
