# SCAR-018 — Test tooling changes the sources and does not prove that it put them back

**Area:** Process / Verification
**Severity:** Medium — a source file was silently replaced by another during a mutation run; only a checksum check found it, and every later result of the run was invalid

---

## What went wrong

Tooling that edits files for a test (mutation runs, scripted edits, probe
setups) assumed its own effect instead of checking it. Four times in two
stories:

1. A scripted text replace matched nothing (the formatter had already changed
   the line), so a test import was never added (US-016).
2. A mutation script looped over a space-separated string in zsh, which does
   not split it; no backup was made, and 13 mutants piled up in the sources
   (US-016).
3. A listing piped through `head` hid existing backups, so a file was written
   into a folder believed empty (US-016).
4. Mutation backups were stored by file name only. Two sources had the same
   name (`markers/glossary.ts`, `emit/glossary.ts`); the "restore" copied one
   over the other, and the remaining mutants ran against a broken tree. Only
   `shasum -c` at the end showed it; the file was rebuilt to its recorded
   checksum and the whole run repeated (US-017, TICKET-047).

## Root cause

Each tool step was treated as done when the command ran without an error, not
when its effect was shown. A mutation run in particular trusts its undo: if
the restore is wrong, every later mutant tests something else, and the report
("all caught") is false evidence.

## Prevention

- Back up every file a run may change by its full relative path (mirror the
  tree: `mkdir -p "$S/$(dirname "$f")"; cp "$f" "$S/$f"`), never by its base
  name, and write a checksum list of the originals before the first change.
- After every restore, check the whole list (`shasum -a 256 -c`). A failed
  check stops the run at once; the results of the run are void and the run is
  repeated after the sources are proven equal to the checksums.
- A scripted edit asserts its match count before writing (`count == 1`); a
  failed match restores and is reported as "match failed", never as a result.
- Use arrays for file lists in shell scripts, and never cut a listing (`head`)
  that decides whether to write.
- Record the baseline (test counts before any mutant) in the same run, so a
  mutant result is read against measured numbers.
- Report a mutant as caught only when it ran on a tree that was verified
  before and after it.
- Read a surviving mutant as a finding about the tests, not as noise: what
  makes a test input unable to reach a rule is in SCAR-023 (moved there on
  2026-10-22; item 7 of this list before that date).
- The backup that a restore returns to holds the state to return to: for a
  manual check that changes a fixture, the state as handed over (after the
  ticket's own setup), and, when the ticket itself changed the fixture, also
  the state before it — each with its checksum list. Example (2026-10-22,
  M13): the preset note was backed up before the ticket added its
  `template:` line, so the backup could not serve the compare after the
  check; split into `before/` and `handover/`.
- The file list of a scripted edit is checked, before the run, against files
  that change only with the user's approval (`CLAUDE.md`, the state files);
  those are left out and edited by hand on the user's go. Example
  (2026-10-27, TICKET-072): `CLAUDE.md` was in a scan's file list and the
  first run changed it; restored at once from the backup.
- Applies next to: every mutation run, every scripted refactor, probe setups
  that write into the project, install scripts, manual-check fixtures.
