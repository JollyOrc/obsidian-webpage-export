# SCAR-008 — Third-party drawing API used with guessed arguments; blank output misread as a verdict on the library

**Area:** Integration / Verification
**Severity:** Medium — a wrong conclusion about a dependency was one step from being written down

---

## What went wrong

A test harness passed a canvas **element** to a renderer that expects a 2D
drawing **context**, and never set the canvas width and height. Nothing threw.
The result was a blank, wrongly sized dialog. The first reading of that
result was "the renderer does not draw", which would have been recorded as a
finding about the library. The user, who ran the harness, saw the blank
popup; the harness itself had no check that anything was drawn.

In this project: spike S8 (TICKET-001) of the bundled Typst renderer. The
fault was in the spike's own code; with the right context, a sized canvas, and
a pixel check, page 3 drew in 53 ms and looked correct.

## Root cause

- The call was written from the shape of the data ("a canvas goes here")
  instead of from the library's declared types or source. In JavaScript a
  wrong object type often fails silently.
- Canvas has traps that all look the same from the outside (blank):
  the backing store defaults to 300×150 and is separate from the CSS size;
  some APIs want the element, others want `getContext('2d')`; high-DPI
  screens need an explicit scale; very large canvases are refused or crash
  without a message.
- The only success check was a human looking at the screen. A blank output
  carries no information about where the fault is.

## Prevention

- Before calling an unfamiliar API, read its type definition or source for
  every option used. Do not infer argument types from the example in a
  README.
- **Blank or empty output is a bug in our code until proven otherwise.**
  Do not record it as a result about the dependency until the call has been
  checked against the API's definition and verified with a minimal case.
- Check the output by program, not only by eye: for drawing code, read the
  pixels back (`getImageData`) and assert that a plausible share is not the
  background colour; for files, assert size and header.
- Create canvases in **one** helper that sets width and height from the
  source size × scale factor, sets the CSS size separately, and returns the
  context. No other code creates a canvas. Register it in the shared-utility
  list (SCAR-001) with its transforms (scale factor, maximum size, cleanup).
- Harnesses that run on someone else's machine must log each step as it
  completes and catch errors per step, so a hang or a silent no-op leaves a
  trace in the log.
- Moved on 2026-10-22 to their own SCARs (items 6 to 8 of this list before
  that date): measuring every alternative before it is offered is SCAR-020;
  sweeping output that depends on its own layout is SCAR-021; reading a
  callback's timing and the data it has is SCAR-022.
