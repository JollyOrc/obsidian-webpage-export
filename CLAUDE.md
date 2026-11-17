# CLAUDE.md — Webpage HTML Export (Raiders of Arismyth fork)

---

## Project context

This repository is the author's fork (`JollyOrc/obsidian-webpage-export`) of
[KosmosisDire/obsidian-webpage-export](https://github.com/KosmosisDire/obsidian-webpage-export),
the Obsidian plugin "Webpage HTML Export". It exports notes of a vault as a
static website. The fork is based on upstream 1.9.2 (`78c973d`); its first
release is 1.10.0 (2026-10-31, `releases/`).

The fork exists to export the chosen parts of the author's vault
`/Users/jollyorc/SynologyDrive/RoA Vault/Raiders of Arismyth Rules` (path
confirmed by the user 2026-11-10; the earlier path under `Documents/` no
longer exists) completely and
without freezing to <https://roa.5f9.de>. Upstream's export froze Obsidian
and dropped embedded content in that vault; US-002 replaced the reading-view
render with an off-screen `MarkdownRenderer.render` path. The vault also uses
content other plugins draw (`text-mapper`, Leaflet, Excalidraw, Dataview,
Meta Bind, Calendarium); those blocks are exported as the plugins draw them.
Rendering `text-mapper` blocks to static SVG (reusing
`../ObsidianVaultCompiler`) is **out of scope** for this fork (user decision
2026-10-31).

The development process, the SCARs and the init.d state are shared with the
sibling plugins `../Obsidian2Typst` and `../ObsidianVaultCompiler`. Code
reused from other projects is listed in `docs/technical/dependencies.md` with
its origin, and keeps its documented transforms (SCAR-001).

The vault `Raiders of Arismyth Rules` in this location is the author's
**working vault**: the one the author works in, and the working copy of the
2026-10-30 decisions (user statement 2026-11-10). Claude may change it for
measurements and manual checks only under the conditions of rule 2 below;
every change touches the author's own working state. No
automated test reads it; automated tests use the generated synthetic fixture
vault `tests/fixtures/vault/` (US-001; changed only through its generator).

## Shared rules

The development process (steps 0 to 4), code style, function headers, agent
rules 1 to 15, documentation maintenance and versioning are shared with the
two sibling plugins and live in the SCARs repository:

@scars/AGENT-RULES.md

What follows is specific to this project and refines the shared rules.

Shared knowledge about Obsidian plugins (API findings and pitfalls, past
problems, tooling, and the **preferred UI standard**) lives in
<https://github.com/JollyOrc/ObsidianKnowledge> (local clone
`~/Documents/ObsidianKnowledge`). Read the files that touch the work at
step 0; a new or changed screen, dialog, menu or notice follows its
`ui-standard.md`. A fact about Obsidian learned here goes there; a general
failure mode goes to a SCAR.

## Where things are

- `docs/state/` — the `init.d` state (rules 9 and 10): governance, the SCAR
  ledger, the next action. Read it first on every session and after every
  compaction.
- `docs/user-stories/README.md` — index of all user stories; individual
  stories in `US-NNN-*.md` files.
- GitHub Issues (<https://github.com/JollyOrc/obsidian-webpage-export/issues>) —
  the source of truth for tickets, the story backlog, bug reports and feature
  requests. Tickets use the form `.github/ISSUE_TEMPLATE/ticket.yml` and carry
  the label `ticket` and one label per story (`US-NNN`); backlog topics carry
  `backlog`. Upstream issues stay upstream.
- `scars/GATES.md` — the SCAR gate table, shared by the three plugins.
- `docs/technical/dependencies.md` — dependencies, build requirements, reused
  code.
- `docs/technical/tests.md` — quality gates and required tests.
- `docs/technical/manual-checks.md` — index of the manual checks, one file
  each.

## SCAR gates and numbers

The gates of rule 9 are recorded in `docs/state/30_scar_checks.md`: **G0**
story review, **G1** story written, **G2** tests written, **G3** tickets
written, **G4** ticket done or manual-test handover, **G5** closing a story.
Which SCARs are checked again at G1, G2 and G4 is in the shared table
`scars/GATES.md`; a new SCAR's gates are added there.

Numbers changed on 2026-11-05 (this project's SCAR-031 to 034 are now
SCAR-042 to 045); history keeps the old numbers, mapped in `scars/README.md`.

## What the shared rules mean here

- **Rule 2.** The exporter never modifies the user's notes, attachments or
  plugin data, and a fixture vault changes only through its generator.
  Generated HTML and asset files go only to the configured export folder.
  **Working vault (user decisions 2026-10-30; the vault the author works in,
  user statement 2026-11-10):** Claude may change the
  vault `Raiders of Arismyth Rules` (notes, settings, `data.json`, installed
  builds) for measurements and manual checks, when Obsidian is not running
  (it overwrites `data.json`), after a snapshot with a checksum list exists
  in `~/Downloads/roa-export-diag/`. Every change is listed with its purpose
  in the manual check that uses it, and can be undone from the snapshot
  (SCAR-018). Installed builds are compared with the fresh build (SCAR-012).
  The exporter itself still never modifies the notes it exports.
- **Rule 6.** Generated HTML must be valid: no `<div>` inside a `<p>` (US-002
  AC-4), and every piece of user text that our own code places into markup
  is set as text (`textContent`, attribute values), never as markup.
- **Rule 7.** The functions in `src/core` give the same output for the same
  input; what Obsidian and its plugins draw is exported as they draw it.
- **Rule 8.** Export problems (a plugin block that fails or times out, a
  missing plugin, unresolved links, missing attachments) are warnings with a
  source location; one failing block never aborts or hangs the export of the
  other files, and leaves a visible placeholder, not an empty or
  half-rendered element.

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

## Quality gate

Run in this order (`npm run gate` runs all of it and stops at the first
failure):

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
The fixture vault changes only through `npm run fixtures`.

Also run any manual smoke tests described in `docs/technical/tests.md` and
confirm that no source files were modified (compare hashes if in doubt).

---

## Release checklist

At the fork point `manifest.json` said 1.9.2 and `package.json` 1.3.2; the
first release aligned them.

1. Confirm all tests pass (the full quality gate above).
2. Bump the version in `package.json`, `manifest.json` and `versions.json`.
3. Write `releases/vX.Y.Z.md` (contents: shared rules, "Versioning").
4. Update `releases/RELEASES.md` to include the new version.
5. Create a tagged release in version control (the `release.yaml` workflow
   builds on tags).
6. Attach the distributable artefacts to the release: `main.js`,
   `manifest.json`, and `styles.css`.
