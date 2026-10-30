# SCAR-014 — A destructive action runs on one click, without asking

**Area:** Usability / Data safety
**Severity:** Medium — nothing was lost here only because the vault's trash setting kept the note; the user rightly called it a defect

---

## What went wrong

`Delete` on a preset in the settings tab moved the preset note to the trash
at once. The row sits next to `Use`, `Duplicate` and `Rename`, so a misplaced
click removes a user's work. The user story specified where the note goes
(Obsidian's trash setting) and which preset becomes active, which made the
deletion look handled, but it did not specify that the user is asked first.

## Root cause

Recoverability was treated as a substitute for confirmation. "It goes to the
trash" and "the last preset is protected" are safety nets that depend on a
setting the plugin does not control (the user may have chosen permanent
deletion) and that the user does not know about at the moment of the click.
The acceptance criteria listed the consequences of the action but not the
decision point before it.

## Prevention

- Every action that deletes, overwrites or irreversibly changes user data is
  specified with a confirmation step: a dialog that names the item, says what
  will happen (including where it goes and what else changes, such as another
  preset becoming active), and offers the action by its own name (`Delete`)
  and `Cancel`, not `OK`.
- The safe choice is the default: the focus is on `Cancel` when the dialog
  opens, Escape cancels, and Enter acts on the focused button. (Compare
  SCAR-013: in an input dialog Enter confirms; in a destructive confirmation
  the default is the safe button.)
- Refusals come before questions: an action that cannot be done (the last
  preset) is refused at once with its message and no dialog is shown.
- The confirmation is part of the same code path as the action's button; a
  test shows that the destructive call is not made before the user confirmed
  and not made after `Cancel` or Escape.
- Check at specification time: "what is the worst misplaced click on this
  screen?" and list each such control with its confirmation or its undo.
- Applies next to: deleting or replacing files in an export folder, resetting
  settings to their built-in values, overwriting an existing export, removing
  a cover picture or a font.
