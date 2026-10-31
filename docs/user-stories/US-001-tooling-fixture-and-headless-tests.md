# US-001 — Quality gate, synthetic fixture vault, and tests in a headless Obsidian

**Status:** Done (2026-10-30; tickets #1 to #4 closed; full gate green, 92/92)
**Introduced:** — (first story of the fork)
**Implemented:** — (not released; not committed yet)
**Supersedes:** —

---

## Story

**As** the maintainer of this fork,
**I want** a quality gate that blocks a red build, a generated public
fixture vault that holds the cases that failed in my vault, and integration
tests that export that vault in a real, headless Obsidian,
**so that** US-002 (complete embeds, no freeze) and every later change is
tested against Obsidian's real renderer, without a manual run in my vault.

---

## Context (measured, 2026-10-30)

- No test runner; `tsc --strict` over upstream `src`: 138 errors; `eslint` over
  the upstream sources without build output: 478 errors (G2 US-001; G0 said
  621 including generated `src/frontend/dist`).
- Upstream `Dockerfile` (`master` `78c973d`) builds an image with Obsidian
  1.9.12 that exports a mounted vault in 15 to 19 s; it reproduced the M04
  embed loss in 1 of 2 runs ([spike](../technical/spike-docker.md)).
- Failing cases in the working-copy vault (M01 to M04): notes with large
  embeds go to the fallback renderer (`1.4.3 Magic Skills.md`: 8 note embeds
  with a map each, 8 heading embeds, 15 sections; `Spells now hexmaps
  too!.md`: one note embed with a map; `Flowcharts.md`: a
  `meta-bind-embed`); the fallback dropped embeds (M04) or froze (M01, M03).
- Decisions (G0 US-001): new code strict and clean, upstream lint baseline
  may not grow; base `master` HEAD; third-party plugins fetched with
  checksums, never committed.

---

## Acceptance criteria

### Quality gate

- **AC-1 — Strict type check for new code.** `npm run typecheck` runs
  `tsc --noEmit -p tsconfig.json` (upstream settings, all of `src`) and then
  `tsc --noEmit -p tsconfig.strict.json` (`"strict": true`, covering
  `src/core/**`, `tests/**`, `tools/**`), and exits non-zero when either
  fails. Example: `class A { b: string; }` in `src/core/a.ts` fails with
  TS2564; the same line in `src/plugin/a.ts` passes.

- **AC-2 — Lint: new code clean, upstream frozen.** `npm run lint` runs:
  1. `eslint` with a strict config (typescript-eslint `strict`, no
     `any` without a `// eslint-disable-next-line … -- <reason>` comment) over
     `src/core`, `tests`, `tools`: exits non-zero on any finding;
  2. `prettier --check` over the same paths;
  3. `eslint` with today's config over the upstream source paths
     (`src/plugin`, `src/frontend`, `src/shared`, `src/assets`), ignoring
     the build output `src/frontend/dist/**`, counting findings and
     comparing with `tools/lint-baseline.json` (`{"upstream": 478}`).
  Examples: 478 → passes; 479 → fails with
  `upstream lint findings 479 > baseline 478`; 460 → passes and prints
  `upstream lint findings 460 < baseline 478: lower the baseline` (the file
  is not rewritten by the script; D3).
  *(Amended at G2, 2026-10-30: the G0 count 621 was over all of `src`
  including 143 findings in the generated `src/frontend/dist`; measured over
  the upstream sources without it: 478, with and without the build folder
  present.)* *(Baseline lowered to 477 at US-002 #6: replacing upstream's
  p-tag block in `render-api.ts` removed one upstream finding; the examples
  above keep their numbers as examples of the rule.)* *(Lowered to 465 at
  US-002 #9: the removed reading-view main path and its now unused `Utils`
  import took 12 findings of `render-api.ts` with them — 83 before, 71 after.)*

- **AC-3 — Unit test runner.** `npm test` runs Vitest over `tests/unit` and
  `tests/tooling`; a test file `tests/unit/smoke.test.ts` with one passing
  test gives exit 0, a failing one exit 1. Test titles start with the story
  and AC (`US-001 AC-3: …`).

- **AC-4 — One gate command, also in the release workflow.** `npm run gate`
  runs, in this order, `typecheck`, `lint`, `test`, `build`,
  `test:integration`, and stops at the first failure with its name. The
  release workflows (`release.yaml`, `beta-release.yaml`) run the gate
  (without `test:integration`, see D2) as `npm run gate:release` before
  `actions/create-release`; a red step means no release asset is uploaded.
  Their `docker-image` job (publishes to GHCR) gets `needs: build`, so it
  does not publish after a red gate either *(amended at G2, 2026-10-30: the
  job had no `needs:`)*. *(Amended 2026-10-31, before the first release,
  user decisions:)* the `build` job checks out the full history
  (`actions/checkout` with `fetch-depth: 0`), because the gate reads the
  upstream base commit (US-002 AC-9: `git diff 78c973d`; measured: in a
  shallow clone of one commit that test fails, the other 165 pass); the
  `docker-image` job does not run (`if: ${{ false }}`), so a release
  publishes no image to GHCR. *(Amended 2026-10-31 after the first release
  run, user decision:)* the build job runs on Node `26.x`, the version every
  local gate ran on (on `20.x` the fixture generator, run as
  `node tests/fixtures/generate.ts`, failed: no type stripping); and the
  gate tests read tool output without ANSI colour codes (tools colour
  their output under `GITHUB_ACTIONS`). *(Amended 2026-10-31 after the
  second release run, user decision:)* the build job declares
  `permissions: contents: write` (the fork's default token is read-only;
  the run passed its gate and failed at "Create Release"); no other job and
  no workflow-wide block gets a permission.

### Fixture vault

- **AC-5 — Generated, deterministic, public.** `npm run fixtures` runs
  `tests/fixtures/generate.ts` (Node built-ins only) and writes
  `tests/fixtures/vault/` plus `tests/fixtures/vault/fixture-manifest.json`
  listing every note and the constructs it holds with counts. Two runs from
  fresh processes give byte-identical trees (checked by a test that runs the
  generator twice in separate processes, SCAR-023). The text is generated
  from a word list and a fixed seed; no text of the author's vault appears
  (a test searches the fixture for 20 sample terms of the author's vault
  given as hashes, expecting 0 matches).

- **AC-6 — Constructs.** The vault holds at least these notes (names unique
  in the whole vault, SCAR-011/012), each constructed as stated:

  | Id | Note | Construct |
  |----|------|-----------|
  | F1 | `Maps/Map Alpha.md` | one `text-mapper` block, hexes `0101` `Alpha`, `0102` `Beta`, `0201` `Gamma`; sentinel `FX-F1-BEFORE` before and `FX-F1-AFTER` after the block |
  | F2 | `Embeds/Wikilink Embed.md` | `![[Map Alpha]]` between sentinels `FX-F2-BEFORE`/`FX-F2-AFTER` |
  | F3 | `Embeds/Markdown Link Embed.md` | `![Map Alpha](../Maps/Map%20Alpha.md)` (the vault's form) between sentinels |
  | F4 | `Embeds/Heading Embed.md` | `![[Long Note#Section Three]]` and `![S](../Long%20Note.md#Section%20Four)`; `Long Note.md` has sections One to Six with sentinels `FX-LONG-<n>` |
  | F5 | `Composed/Big Page.md` | shaped like `1.4.3 Magic Skills.md`: heading, paragraph, image, heading, paragraph, then 8 pairs `![…](Long%20Note.md#Section N)` + `![…](../Maps/Map N.md)` (8 map notes `Map 1` to `Map 8`, each with one `text-mapper` block of 12 hexes); 15 sections |
  | F6 | `Embeds/Embed In Callout.md`, `Embeds/Embed In List.md` | `> [!note]` callout containing `![[Map Alpha]]`; a list item containing `![[Map Alpha]]` |
  | F7 | `Embeds/Nested Embed.md` | embeds `Embeds/Wikilink Embed.md` (depth 2 to F1) |
  | F8 | `Embeds/Meta Bind Embed.md` | a `meta-bind-embed` block containing `[[Snippet]]` (the vault's shape, `News/Flowcharts.md`: a whole note); `Plain/Snippet.md` holds sentinel `FX-F8-SNIPPET` *(amended at G2: was a heading link, unmeasured with Meta Bind)* |
  | F9 | `Plain/Control.md` | text only, sentinel `FX-F9`, no embeds |

- **AC-7 — Third-party plugins fetched, pinned, verified, not committed.**
  `npm run fixtures:plugins` downloads Text Mapper `1.1.0`
  (`modality/obsidian-text-mapper`, MIT) and Meta Bind `1.5.1`
  (`mProjectsCode/obsidian-meta-bind-plugin`, GPL-3.0) release assets into
  `tests/fixtures/vault/.obsidian/plugins/<id>/`, checks each file's sha256
  against `tests/fixtures/plugins.lock.json` (Text Mapper `main.js`
  `64dfc8670a92f1b6…`, measured), and enables both in
  `community-plugins.json`. A mismatch exits 1 naming the file and leaves no
  partial plugin folder. The plugin folders are git-ignored; a test asserts
  `git ls-files tests/fixtures/vault/.obsidian/plugins` lists nothing (the
  export plugin is put in by the image's start script, AC-9).

### Headless integration runs

- **AC-8 — Image of the fork's build.** `npm run test:integration` builds
  (or reuses) a Docker image from the repository's `Dockerfile`, tagged with
  the short commit and `-dirty` when the tree has changes; the image's
  plugin files equal the local `npm run build` output (sha256 compared).
  The image runs Obsidian **1.14.5** (D5; `OBSIDIAN_VERSION` build
  argument), the version of the author's app.

- **AC-8b — The run writes its own report.** The script injected into
  Obsidian writes `/output/.run-report.json` itself (the container log has
  no console lines under 1.14.5, spike addendum): `obsidianVersion`
  (`1.14.5`), `startedAt`, `endedAt`, `exported: true|false`, and every
  `ExportLog` warning and error with its text (e.g. `Failed to render all
  sections in file Big Page.md, using fallback!`). It writes the file before
  it ends the process; the runner treats a missing or unparsable report as a
  failed run (`no run report`), never as a pass.

- **AC-9 — Each run on a copy; the fixture is never written.** Every run
  copies `tests/fixtures/vault/` to a fresh temporary folder and mounts that
  copy (the image's start script writes the plugin into the mounted vault);
  after the run, a checksum list of the fixture taken before the run still
  matches (SCAR-018). Output goes to `tests/.output/<run-id>/` (git-ignored).

- **AC-10 — Time limit and a hung run.** Each run has a limit of 120 s
  (measured 15 to 19 s for the spike vault; margin for a larger vault and a
  busy machine, SCAR-030); at the limit the container is killed, the run is
  recorded as `timeout` with its log path, and the test fails with that
  message. A freeze therefore fails a test instead of hanging the suite.

- **AC-11 — Repeated runs.** The runner takes `--runs N` (default from D1)
  and reports per note and run: written or missing, the fallback warning
  (`Failed to render all sections in file <name>, using fallback!`, read from
  the run report of AC-8b) yes/no,
  and the reader's content facts (AC-12). Example: with `--runs 3`, F5 shows
  `fallback: 3/3` when it falls back in every run.

- **AC-12 — One HTML reader, tested per rule.** `tests/support/html-reader.ts`
  is the only reader of exported pages; it returns, for a page: visible text
  including text inside `<svg>` (map labels), the number of
  `block-language-text-mapper` blocks and of those without an `<svg>`, and
  the number of `markdown-embed` elements. Each rule has a unit test on a
  hand-written HTML sample, including the case found in the spike: labels
  inside `<svg>` are found (`>Alpha<` → `Alpha` present) (SCAR-028).

- **AC-13 — What US-001 itself asserts in the headless run.** With one run:
  every fixture note has a page (count equal to the manifest); F1's page has
  1 map block with an `<svg>` and the text `Alpha`, `Beta`, `Gamma`,
  `FX-F1-BEFORE`, `FX-F1-AFTER`; F9's page has `FX-F9`. A guard test shows
  the blank case: a page with an empty map block is reported as
  `empty map block` (SCAR-015). Assertions about embeds (F2 to F8) belong to
  US-002; US-001 only records them in the report.

- **AC-14 — Withdrawn (US-002 amendment 1, user decision 2026-10-31).**
  US-002 D7/D9 render each note off screen and remove `maxPreviewHeight`;
  the reading view's partial drawing, the defect this criterion reproduced,
  can no longer reach an export. Its records stay in `tests.md`. *Was:*
  **The fixture reproduces the defect it is for (SCAR-027).** With
  `maxPreviewHeight: 1000` (the preview does not grow) and `--runs 3`,
  `Composed/Big Page.md` has sections that are not drawn in at least 1 of 3
  runs (run report warning `Not all sections drawn in Big Page.md`).
  *(Amended at US-002 #6, 2026-10-30: the original criterion, "F5 goes to
  the fallback in ≥ 1 of 3 runs", measured 3/3 and 2/3 before US-002, cannot
  hold once US-002 removes the automatic fallback switch; the cause of the
  defect — sections not drawn — is what the fixture keeps reproducing.)*

### Documentation

- **AC-15** `docs/technical/tests.md` lists every gate script as existing,
  the test layers including `integration` with Docker, and the AC-to-test
  rows of US-001; `docs/technical/dependencies.md` lists Vitest, prettier,
  the strict eslint config, Docker, the pinned plugins with licence and
  checksum, and the image's Obsidian version.

---

## Non-goals

- Any change of export behaviour (that is US-002).
- The new plugin id and the settings carry-over (later story).
- Replacing `electron-injector` (its crash under 1.14.5 is worked around by
  AC-8b, not fixed).

---

## Decisions (2026-10-30)

- **D1** `--runs` defaults to 1; tests that need repetition pass it.
- **D2** Integration tests run locally only (`npm run gate`); GitHub Actions
  runs typecheck, lint, unit tests and build. CI integration is a later
  story once measured.
- **D3** A lowered upstream lint count only prints the hint; no script edits
  `lint-baseline.json`.
- **D5** Obsidian 1.14.5 in the image, measured first: it exports and
  reproduces the embed loss (2 of 2 runs), but the injector loses all
  console output; hence AC-8b (confirmed by the user 2026-10-30).

---

## Notes

- Users of the working-copy vault as test input (SCAR-027): the manual
  checks M01 to M04 relied on: the three notes that hit the fallback, 13
  maps, 231/414 files, the `diag` builds. The fixture keeps the shapes
  (F5 ~ `1.4.3`, F3 ~ `Spells now hexmaps too!`, F8 ~ `Flowcharts`), not the
  text or the counts; manual checks in the working-copy vault stay for
  release candidates.

---

## Related tickets

<!-- Fill in once the ticket issues are created. -->
- [#1](https://github.com/JollyOrc/obsidian-webpage-export/issues/1) — gate: typecheck, lint with upstream baseline, Vitest, gate command, release workflows (AC-1 to AC-4)
- [#2](https://github.com/JollyOrc/obsidian-webpage-export/issues/2) — fixture vault: generator, manifest, pinned plugins (AC-5 to AC-7)
- [#3](https://github.com/JollyOrc/obsidian-webpage-export/issues/3) — headless runner: image with Obsidian 1.14.5, run report, limit, repeated runs, HTML reader (AC-8 to AC-14)
- [#4](https://github.com/JollyOrc/obsidian-webpage-export/issues/4) — docs and the AC-14 record (AC-15)
