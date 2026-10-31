# SCAR-034 — A fix is measured only in the test environment and fails where the user runs it

**Area:** Verification / Requirements
**Severity:** High — a story's main fix passed every automated test and froze the user's application three times

---

## What went wrong

The failure to fix (the export froze) happened only on the user's desktop.
The test harness (a headless application in a container) did not reproduce
it. The fix was chosen and verified in the harness: three of three runs
complete, no fallback, all pages right. The story was implemented, the gate
was green, and the first manual check on the desktop froze again, as did two
diagnostic runs. A different approach, measured on the desktop before it
went into the story, ended the freeze.

In this project: US-002 (2026-10-30). The growing preview (D1, ticket #6)
passed headless at 500 px and at 2560 × 1550; M05, M06 and M07 froze on the
desktop; the detached renderer, tried on the desktop in M08 and M09 before
amendment 1, did not freeze; M10 passed.

## Root cause

The failure depends on the environment (window, display, the application's
interactive state), and the harness lacked the part that causes it. A
measurement in the harness was read as evidence about the user's
environment. The story said "freeze: not reproduced in Docker; not claimed",
but the plan still went from harness results to code without a desktop
measurement of the chosen approach.

## Prevention

- When a failure was seen only in the user's environment and the harness
  does not reproduce it, the chosen approach is measured in the user's
  environment (a spike build and a manual check) before the story builds on
  it — at G1, not after the tickets.
- Every statement of a fix's effect names the environment it was measured
  in; "fixed" for an environment-dependent failure needs a measurement where
  the failure occurred.
- Try to make the harness reproduce the failure first (window size, load,
  the user's data); record each attempt, including the ones that did not
  reproduce it.
- Keep the diagnosis builds cheap to hand over (own version, per-step log,
  heartbeat), so a desktop measurement costs minutes, not a ticket.
- A pipeline that has never run (a release workflow) is run once before it
  is needed, and its environment is compared with the measured local one:
  runtime version, clone depth, token permissions, terminal colouring.
  Example (2026-10-31, release 1.10.0): the first tag needed three runs —
  shallow clone, Node 20 without type stripping plus coloured tool output,
  and a read-only token — each found only by the run itself.
- Applies next to: freezes and hangs, timing and rendering in the live
  application, platform-specific file handling, anything a container or a
  headless run cannot show.
