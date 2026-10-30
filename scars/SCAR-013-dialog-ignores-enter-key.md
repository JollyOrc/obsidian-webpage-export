# SCAR-013 — An input dialog can only be confirmed with the mouse

**Area:** Usability / Specification
**Severity:** Low — found by the first human run of M2 (US-008); no data was lost, but every use of the dialog was slower than it needed to be

---

## What went wrong

The dialogs of the settings tab (`New preset`, `Rename`) had a text field and an
`OK` button. Typing a name and pressing Enter did nothing; the user had to
reach for the mouse. The user story said what the dialog refuses and which
messages it shows, and the tests checked those messages, but nobody wrote
down how the dialog is operated, so nobody tested the keyboard.

## Root cause

The specification described the dialog's data (names, errors) and not its
interaction. A dialog is built from parts (a field and a button) and the
toolkit does not connect them: Enter in a field is a form submission only in
a real `<form>`; in a hand-built dialog it is plain input unless the code
handles it. Interaction rules that every user takes for granted are not in
any acceptance criterion, so they are neither built nor tested. The automated
tests could not see the gap because they never press a key.

## Prevention

- Every dialog with an input field is specified with its keyboard behaviour:
  Enter in the field has exactly the effect of clicking the confirming button
  (including showing the same error message and keeping the dialog open when
  the input is refused); Escape cancels; the field has focus when the dialog
  opens.
- Enter while an input method editor is composing text (Chinese, Japanese,
  Korean input; `isComposing`, key code 229) only ends the composition and
  must not submit.
- The key rule lives in one small function without UI imports and is tested
  with key events, including the composing case; the dialog code calls it, and
  a text check in the wiring tests shows that every dialog with a field uses it.
- The first manual run of a dialog includes "do it with the keyboard only".
- A dialog that only asks for confirmation (no field) is covered by SCAR-014.
- Applies next to: every new dialog, prompt and form of the plugin (cover
  picture, font choice, export folder name).
