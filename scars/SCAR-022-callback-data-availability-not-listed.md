# SCAR-022 — A design assumes data that a callback does not have when it runs

**Area:** Requirements / Integration
**Severity:** Medium — found at the first wiring step after four gates had passed; it cost an amendment of the story, the tests and two tickets

---

## What went wrong

A story let a menu decide its items from data that is only available through
an asynchronous read. The framework builds the menu synchronously: the
callback must add its items before it returns, so no read can finish in
time. The story, its tests and two tickets carried the assumption until the
code that wires the callback was written.

In this project: US-022 let the editor menu check an image's first bytes while
it was built; Obsidian's `editor-menu` and `file-menu` callbacks are
synchronous and file bytes come only from `vault.readBinary` (moved from
SCAR-008 on 2026-10-22).

## Root cause

The types were read for the options of the calls, not for the timing of the
callback, and nobody listed which data the handler needs and when each piece
is available. A callback's timing is part of its contract, but it is not
visible in the call the code makes; it is visible only in the type of the
callback.

## Prevention

- For every callback the code hands to a framework (an event, a menu, a
  command, a render hook), read from its type whether it runs synchronously:
  whatever it must produce has to exist before it returns.
- List each piece of data the handler needs and where it comes from at that
  moment — already in memory, or an asynchronous read. What needs an
  asynchronous read moves into the action that runs after the user's click,
  before any question it asks.
- Do this when the story is written, not when the handler is wired.
- Applies next to: menus, render hooks, drag and drop, paste and keyboard
  handlers, anything a framework calls.
