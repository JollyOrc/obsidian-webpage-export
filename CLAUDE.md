# CLAUDE.md — Webpage HTML Export (Raiders of Arismyth fork)

---

## Project context

This repository is the author's fork (`JollyOrc/obsidian-webpage-export`) of
[KosmosisDire/obsidian-webpage-export](https://github.com/KosmosisDire/obsidian-webpage-export),
the Obsidian plugin "Webpage HTML Export". It exports notes of a vault as a
static website. The fork is based on upstream 1.9.2 (`78c973d`); its first
release is 1.10.0 (2026-10-31, `releases/`).

The fork exists to export the chosen parts of the author's vault
`/Users/jollyorc/Documents/Raiders of Arismyth Rules` completely and
without freezing to <https://roa.5f9.de>. Upstream's export froze Obsidian
and dropped embedded content in that vault; US-002 replaced the reading-view
render with an off-screen `MarkdownRenderer.render` path. The vault also uses
content other plugins draw (`text-mapper`, Leaflet, Excalidraw, Dataview,
Meta Bind, Calendarium); those blocks are exported as the plugins draw them.
Rendering `text-mapper` blocks to static SVG (reusing
`../ObsidianVaultCompiler`) is **out of scope** for this fork (user decision
2026-10-31).

The development process, the SCARs and the init.d state come from the
author's sibling project `../Obsidian2Typst`
(<https://github.com/JollyOrc/Obsidian2Typst>). Code reused from other
projects is listed in `docs/technical/dependencies.md` with its origin, and
keeps its documented transforms (SCAR-001).

The vault `Raiders of Arismyth Rules` in this location is a **working copy**
of the author's original (user statement 2026-10-30): Claude may change it for
measurements and manual checks under the conditions of rule 2. No automated
test reads it; automated tests use the generated synthetic fixture vault
`tests/fixtures/vault/` (US-001; changed only through its generator).

Orientation files:

- `docs/user-stories/README.md` — index of all user stories; individual stories in `US-NNN-*.md` files.
- GitHub Issues (<https://github.com/JollyOrc/obsidian-webpage-export/issues>) —
  the source of truth for tickets, the story backlog, bug reports and feature
  requests. Tickets carry the label `ticket` and one label per story
  (`US-NNN`); backlog topics carry `backlog`. Upstream issues stay upstream.
- `docs/technical/dependencies.md` — dependencies, build requirements, reused code.
- `docs/technical/tests.md` — quality gates and required tests.
- `docs/technical/manual-checks.md` — index of the manual checks, one file each.
- `docs/state/` — the `init.d` state (rule 9): governance, the SCAR ledger, the next action. Read it first on every session and after every compaction (rule 10).

---

## Development process

Follow this order strictly — do not skip ahead:

0. **SCAR review** — before touching any user story, test, or code, read
   `scars/README.md` and every SCAR file under `scars/`. Check the new
   instructions or user story against the Prevention list of every SCAR. The
   index in `scars/README.md` lists every SCAR; `docs/process/scar-gates.md`
   is the checklist of the gates (rule 9) at which each is checked again.
   Flag any gap to the user before proceeding; do not paper over it with a
   guess or a TODO.

   **After** a problem is resolved or a requirement is refined, ask: can the
   root cause be generalised beyond this specific case? If yes, add a new SCAR
   in the shared repository (following the existing format), add it to its
   index, and add its gates to `docs/process/scar-gates.md`. The SCARs are shared with the other
   two plugins: `scars/` is the git submodule of
   <https://github.com/JollyOrc/scars>. Edit SCARs only there, never in
   `scars/`, then `git submodule update --remote scars` and commit the new
   pointer. A new SCAR takes the next free number.
   Numbers changed on 2026-11-05 (this project's SCAR-031 to 034 are now
   SCAR-042 to 045); history keeps the old numbers, mapped in
   `scars/README.md`.
   A SCAR is warranted when the same underlying failure mode could recur on
   any future feature, not just the one just fixed.

1. **User story** — write or amend the story and acceptance criteria first.
2. **Tests** — specify and implement tests against the acceptance criteria.
3. **Tickets** — create the necessary work items as GitHub issues with the
   ticket issue form (`.github/ISSUE_TEMPLATE/ticket.yml`), labelled `ticket`
   and `US-NNN`; a ticket is closed as completed when it is done.
4. **Code** — write the implementation against the tests and tickets.

---

## Code style

All code must adhere to the **Google Style Guides**: <https://google.github.io/styleguide/>

- **TypeScript:** <https://google.github.io/styleguide/tsguide.html>
- **Markdown:** <https://google.github.io/styleguide/docguide/style.html>
- **Shell scripts:** <https://google.github.io/styleguide/shellguide.html>

Additional requirements:
- Use strict type checking: `"strict": true` in `tsconfig.json`; no `any`
  without a justifying comment.
- Lint with ESLint (`typescript-eslint`) and format with Prettier.
- Add documentation comments for all public APIs.
- Resolve all lint findings before release.

---

## Function documentation

Every function and method must carry a comment header that states:

1. **User story** — which US it supports (e.g. `US-3`, `US-7.2`).
2. **Acceptance criterion** — the specific AC it implements
   (e.g. `AC-4: Output is normalised before writing`).

The comment must also describe what the function does, what it assumes, and
any non-obvious constraints (clamping, ordering, side effects).

### Example

```
/**
 * US-3 | AC-4: Output records are normalised before writing.
 *
 * Applies [transformation] to [input] so that [postcondition].
 * Assumes [precondition]. Values exceeding [limit] are clamped to [limit].
 */
```

---

## Agent rules

1. Treat `docs/user-stories/README.md` and the individual `US-NNN-*.md` files as the source of truth for behaviour. When adding or amending a story, also update the index table in `README.md` and create or update the corresponding ticket issues on GitHub (the ticket ids are the issue numbers, `#NNN`). A backlog topic or a feature request from an issue becomes a story only through steps 0 and 1; the story links the issue.
2. Never modify source or fixture files; only write to configured output paths.
   In this project that means: the exporter never modifies the user's notes,
   attachments or plugin data, and a fixture vault changes only through its
   generator. Generated HTML and asset files go only to the configured
   export folder.
   **Working-copy vault (user decisions 2026-10-30):** Claude may change the
   vault `Raiders of Arismyth Rules` (notes, settings, `data.json`, installed
   builds) for measurements and manual checks, when Obsidian is not running
   (it overwrites `data.json`), after a snapshot with a checksum list exists
   in `~/Downloads/roa-export-diag/`. Every change is listed with its purpose
   in the manual check that uses it, and can be undone from the snapshot
   (SCAR-018). Installed builds are compared with the fresh build (SCAR-012).
   The exporter itself still never modifies the notes it exports.
3. Run the full quality gate (see **Testing expectations**) before declaring
   any task complete.
4. When a behaviour is ambiguous, surface the ambiguity to the user rather than
   guessing. A wrong assumption costs more to fix than a clarifying question.
5. Keep generated and derived files clearly separated from source files.
6. Generated HTML must be **valid**: no `<div>` inside a `<p>` (US-002
   AC-4), and every piece of user text that our own code places into markup
   is set as text (`textContent`, attribute values), never as markup; a code
   path that inserts user text as HTML is a bug.
7. Our own transformations are **deterministic**: the functions in
   `src/core` give the same output for the same input, with no clock,
   random value or global state; what Obsidian and its plugins draw is
   exported as they draw it.
8. Export problems (a plugin block that fails or times out, a missing plugin,
   unresolved links, missing attachments) are reported as warnings with a
   source location; one failing block never aborts the export of the other
   files, never hangs it, and never produces silently wrong output (a visible
   placeholder, not an empty or half-rendered element).
9. **State directory `docs/state/` (the `init.d` of this project).** It holds
   the working state that must survive a context compaction. Files, in lexical
   order:
   - `00_governance.md` (write-once at start; amended only when the user
     changes the process): the workflow (steps 0 to 4 above), the approval
     airlocks (the user's "go" before each step and before each ticket) and the
     decisions the user has made, with dates.
   - `10_ticket.md` (write-once at ticket selection; replaced at the next
     selection): story and ticket ids, the ACs addressed, the SCARs the ticket
     names.
   - `20_plan_approved.md` (write-once after the user's "go" for the ticket):
     the approved file list and the invariants that must hold.
   - `30_scar_checks.md` (**append-only**): the SCAR ledger. One entry per SCAR
     gate (below): date, gate, story or ticket, and every SCAR as `ok`, `gap`
     (where it was fixed) or `n/a` (reason), each with its evidence (file,
     test name, command output). A gate that found gaps is followed by an entry
     that shows them closed.
   - `99_next_action.md` (overwritten at each target): the checklist, `Current
     Target`, `Last Completed Step`, `Next Permitted Action` and `SCAR gate
     due`.

   **SCAR gates.** The review of step 0 is repeated at every handover between
   steps, and a step is neither started nor declared complete without its entry
   in `30_scar_checks.md`:
   - **G0** story review, before a story or an amendment is written (step 0);
     every SCAR;
   - **G1** story written or amended, before any test (the SCARs marked G1
     in the index, against the ACs);
   - **G2** tests written, before any ticket (the SCARs marked G2);
   - **G3** tickets written, before any code: each ticket has a "SCAR check"
     section that goes through the Prevention list of every SCAR, item by item;
   - **G4** before a ticket is declared done and before every manual-test
     handover (the SCARs marked G4; the gate and the pass counts);
   - **G5** closing a story: can the root cause of anything found be
     generalised into a new SCAR?
10. **Bootloader (`Target 0: read-init-d`).** On the first turn of every
   session and on the first turn after any compaction, read all files of
   `docs/state/*.md` in lexical order before any other action and reconcile
   `99_next_action.md` with the user's latest directive. The compaction summary
   never overrides these files. A file that should exist for the current step
   and does not is reported to the user (`?Assert`, rule 13) and recreated from
   the repository, not guessed.
11. **Update discipline.** Update `99_next_action.md` at every change of target
   and when the user gives a directive; do not update it while a long
   background run (test suite, build, mutation run) is still going. When
   reading the log of a running job, read only its last 15 lines.
12. **A question is a request for information, not a directive.**
   "Did you …?", "Is X checked …?", "Why …?", "Are the tickets …?" are answered
   truthfully and then the turn ends. The answer may name a gap and may offer a
   fix (a `?Counter-Offer`, rule 13), but nothing is changed until a directive
   ("do", "fix", "go", "add") arrives. Only a directive authorises work.
13. **Committed speech (Fernando Flores): the user is the `Customer`, Claude is
   the `Performer`.** A request has the form `[DO X] by [BY-WHEN]`; when no
   `BY-WHEN` is given it is this turn, and Claude says so. Before any
   `?Promise`:
   - `?Assert` — check the physical facts the request depends on (files,
     directories, tool and API output, code, versions, git state) with a tool
     call. Do not answer from memory or from the compaction summary.
   - If every premise is true and the request is sensible and doable by the
     `BY-WHEN`, issue the `?Promise` in one or two lines: what will be done and
     the conditions of satisfaction (what the user will be able to see or run).
   - If a premise is false, ill-advised, or the `BY-WHEN` is not realistic,
     issue a witnessed `?Counter-Offer` (what is false, with the evidence you
     found; what is offered instead) or a `?Decline` (what cannot or should not
     be done, and why). Then wait. Do not start a changed version of the work
     and do not silently do something else. Do the parts that are
     unaffected only if they stand alone, and say which.
   - "Witnessed" means in writing in the chat (use `AskUserQuestion` when the
     answer is a choice). A promise, counter-offer or decline that is only in a
     file or in thinking has not been made.
   - When the work is done, report it as a declaration against the stated
     conditions of satisfaction, with the evidence (command output, counts,
     file names), and let the user accept it. Never report more than the
     evidence shows. When a promise cannot be kept, say so before the
     `BY-WHEN` and renegotiate; do not let it lapse.
---

## Architecture expectations

The upstream code base (`src/plugin`, `src/frontend`, `src/shared`) is kept as
close to upstream as practical, so that upstream fixes can still be merged.
New behaviour of the fork follows this split (confirmed by US-001 and
US-002):

| Module | Responsibility | Side effects |
|--------|----------------|--------------|
| `src/core/**` (new) | Pure logic on the rendered DOM: embed paragraphs, placeholders and their warnings, empty targets, section wrappers, the reading view's marks, the choice of frontmatter | none |
| `src/plugin/**` (upstream + thin additions) | Obsidian API: rendering notes (`MarkdownRenderer.render`), resolving links and subpaths, reading the vault, writing the export, settings, notices | file I/O, UI |

Invariants:

- `src/core/**` must **not** import from `obsidian`, Electron or any Node/DOM
  I/O API. Obsidian access is injected as functions (as the subpath
  resolver passed to `addPreviewMarks`, or `isTargetEmpty` passed to
  `markUnexportedEmbeds`). This keeps the core unit-testable with jsdom.
- Side effects occur only in `src/plugin`.
- Waiting for a note's embeds and plugin blocks has a time limit (US-002
  AC-3: 5 000 ms); what is still empty then is reported (rule 8), so no
  block can stall the export.
- Changes to upstream files are small and each one is listed in
  `docs/technical/dependencies.md` ("Changes to upstream files").
- Behaviour that is configurable lives in the plugin settings, not in
  constants.

Tooling: Node, npm, esbuild 0.14.47 (as upstream) for the plugin bundle;
Vitest 3.2.7, Prettier and a strict eslint block for new code; Docker for the
headless integration tests (US-001). New code lives in `src/core`, `tools`
and `tests` and is type-checked with `tsconfig.strict.json`.

---

## Testing expectations

Before finalising any change, run the full quality gate, in this order
(`npm run gate` runs all of it and stops at the first failure):

```bash
npm run typecheck          # tsc: upstream settings over src, strict over src/core, tests, tools
npm run lint               # strict eslint + prettier --check on new code; upstream count <= tools/lint-baseline.json
npm test                   # vitest: tests/unit and tests/tooling
npm run build              # tsc + esbuild bundle -> main.js
npm run test:integration   # Docker: headless Obsidian 1.14.5 exports the fixture vault; checks the pages
```

`npm run gate:release` is the same without `test:integration`; the release
workflows run it before packaging. The integration tests need Docker running
and the fixture's third-party plugins (`npm run fixtures:plugins`, once).
The fixture vault changes only through `npm run fixtures`. A step that did
not run is never reported as passed.

All tests must pass before marking work complete. A failing test may only be
skipped with an explicit `skip` marker and a linked issue; silently-red tests
are not acceptable.

Also run any manual smoke tests described in `docs/technical/tests.md` and
confirm that no source files were modified (compare hashes if in doubt).

---

## Documentation maintenance

When behaviour changes, update **all of** the following that are affected:

- The relevant `docs/user-stories/US-NNN-*.md` file and the index in `docs/user-stories/README.md`
- The relevant ticket issue on GitHub (body, labels, open or closed)
- `docs/technical/dependencies.md`
- `docs/technical/tests.md` (AC-to-test map)

Keep them coherent with each other and with the implementation. Stale
documentation is treated as a bug.

---

## Versioning

- Bug fixes and minor changes: bump patch (`0.0.x`).
- New features: bump minor (`0.x.0`).
- Breaking changes: bump major (`x.0.0`).
- Version number must be consistent across all project manifests/config files.
  (At the fork point `manifest.json` says 1.9.2 and `package.json` 1.3.2; the
  first release aligns them.)

### Release checklist

1. Confirm all tests pass (the full quality gate above).
2. Bump the version in all relevant files: `package.json`, `manifest.json`,
   and `versions.json` (Obsidian's plugin version map).
3. Write `releases/vX.Y.Z.md` containing:
   - Version number and release date.
   - Summary of new features, changed behaviour, and bug fixes.
   - Breaking changes and migration steps.
   - User stories and tickets addressed.
   - Test count (e.g. "360/360 tests passing").
4. Update `releases/RELEASES.md` to include the new version.
5. Create a tagged release in version control (the `release.yaml` workflow
   builds on tags).
6. Attach the distributable artefacts to the release: `main.js`,
   `manifest.json`, and `styles.css`.
