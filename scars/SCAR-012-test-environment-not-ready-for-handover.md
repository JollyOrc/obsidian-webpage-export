# SCAR-012 — A manual test is handed over with a stale or incomplete environment, and the build cannot be told apart from an older one

**Area:** Process / Verification
**Severity:** Medium — cost the human tester a failed run and a round trip before the first step of the check could be judged

---

## What went wrong

The manual checks M2 and M3 (US-008) were handed to the user after the code
and the automated gate were green. The user enabled the plugin in the scratch
vault, saw "version 0.1.0", and found neither the preset folder nor the
settings tab. The vault still held the build from the earlier check (M1): it
only knew the compiler command. The new build had been made in the project
folder but never copied to the vault. The version number was the same in both
builds, so nothing on screen told the user (or the developer) that the build
was old, and the failure looked like a bug in the new code.

## Root cause

"Done" was defined as "the gate is green". The step between the gate and the
human (put the current build in the place where the human will run it, with
the data the check needs) was left to the instructions in the check text, and
the instructions did not name the vault or say that a rebuild must be copied
again. In addition, every build carried the same version, so a stale build was
indistinguishable from a current one.

## Prevention

- Before handing anything to a human, make the test environment complete and
  current as far as it can be done from here: build, install the build in the
  place where it will be run, create the fixtures and the starting state the
  check assumes, and compare the installed file with the fresh build
  (checksum, not by eye). Do not leave a setup step to the tester that the
  developer can do.
- Say in the handover exactly where the test runs (which vault, which folder)
  and what the human still has to do (for example restart the app) and why.
- Every build handed over for a test has its own unique version, visible where
  the human looks (the plugin list and, for this project, the settings tab and
  the check commands). A new test round, or any new build after a test was
  handed over, gets a new version. The check text states the version to expect
  as its first step, so a mismatch is found before any other step is run.
- A mismatch of expected and shown version is read first as "wrong build", not
  as "bug in the code".
- A fixture that refers to a file by its name (an embed, a cover, a font, an
  icon) uses a name that is unique where the lookup searches; the handover
  shows the listing that proves it. A name that exists twice makes the lookup
  pick a copy the check did not mean. Example (2026-10-22, M12): the first
  images chosen for the check existed twice in the test vault, once in a
  folder the check must not touch; a listing before the fixture was written
  found it.
- Every number a manual check names is measured through the plugin's own path
  with all of its inputs (the font catalog, the vault's files), or marked as
  depending on an input the measurement did not have. Example (2026-10-28,
  M15): the warning count was measured without the font catalog and said 148;
  the export lists 149, and four checks had copied the number.
- Applies next to: every manual check (M1, M2, M3, later ones), release
  candidates, builds sent to other testers.
