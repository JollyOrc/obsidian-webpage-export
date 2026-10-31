# Quality Gates and Tests

> Keep this file coherent with `../user-stories/README.md` and
> `dependencies.md`.

---

## Automated quality gate

Run the following before declaring any task complete or cutting a release.
All steps must pass; a failing step blocks the release.

```bash
npm run typecheck          # tsc: upstream settings over src; strict over src/core, tests, tools
npm run lint               # strict eslint + prettier --check on new code; upstream findings <= 478
npm test                   # vitest: tests/unit and tests/tooling
npm run build              # tsc + esbuild -> main.js
npm run test:integration   # Docker: headless Obsidian 1.14.5 exports the fixture vault
```

`npm run gate` runs these five in this order and stops at the first failure,
naming it. `npm run gate:release` runs the first four; the release workflows
run it before `actions/create-release` (US-001 AC-4, decision D2: integration
runs locally only). Before the first integration run: Docker running and
`npm run fixtures:plugins` (fetches the pinned third-party plugins).

---

## Test layers

| Layer | Folder | Runs with | Needs |
|-------|--------|-----------|-------|
| unit | `tests/unit/` | `npm test` | pure code only; no Obsidian, no Docker; temp folders at most |
| tooling | `tests/tooling/` | `npm test` | the repository: runs the gate scripts and the fixture generator, reads docs and config |
| integration | `tests/integration/` | `npm run test:integration` | Docker; the test image (Obsidian 1.14.5, the local `main.js`) exports a copy of `tests/fixtures/vault/`; pages read with `tests/support/html-reader.ts` |

Test titles start with the story and AC id (`US-001 AC-2: ...`). One stub
exists per distinct example in an acceptance criterion; replace each
`it.todo` with a real test before writing the implementation (SCAR-003).

No test reads the author's vault.

### Fixture reproduces the fallback (US-001 AC-14)

US-001 AC-14 is withdrawn (US-002 amendment 1, 2026-10-31); the records stay.

| Criterion | Date | Obsidian | Note | Result |
|-----------|------|----------|------|--------|
| US-001 AC-14 | 2026-10-30 | 1.14.5 | `Composed/Big Page.md` | fallback: 3/3 |
| US-001 AC-14 | 2026-10-30 (full gate, 14:58) | 1.14.5 | `Composed/Big Page.md` | fallback: 2/3 |
| US-001 AC-14 (narrowed, US-002 #6) | 2026-10-30 | 1.14.5 | `Composed/Big Page.md` with `maxPreviewHeight: 1000` | sections not drawn: 3/3 |

Measured with `npm run test:integration` (three runs each); the count varies between runs, as in M04 and the spike. The probe run before
the code (one run) also sent `Long Note.md` to the fallback.

---

## Manual smoke tests

Procedures a human runs are one file each in [manual-checks/](manual-checks/),
listed in [manual-checks.md](manual-checks.md) (SCAR-029).

---

## AC-to-test map

| User Story | AC | Ticket | Test file | Test name | Status |
|------------|----|--------|-----------|-----------|--------|
| [US-001](../user-stories/US-001-tooling-fixture-and-headless-tests.md) | AC-1 | [#1](https://github.com/JollyOrc/obsidian-webpage-export/issues/1) | tests/tooling/us-001-gate-scripts.test.ts | US-001 AC-1: (5 tests: scripts, strict config, tree passes, TS2564 probe in src/core, same line passes in src/plugin) | ✅ pass (5/5; the two whole-tree checks green since #3, 2026-10-30) |
| [US-001](../user-stories/US-001-tooling-fixture-and-headless-tests.md) | AC-2 | [#1](https://github.com/JollyOrc/obsidian-webpage-export/issues/1) | tests/unit/us-001-lint-gate.test.ts, tests/tooling/us-001-gate-scripts.test.ts | US-001 AC-2: (4 unit: 478/479/460/0; 6 tooling: baseline file, tree passes, `any` probe, `any` with reason, prettier probe, 479 probe) | ✅ pass (#1, 2026-10-30) |
| [US-001](../user-stories/US-001-tooling-fixture-and-headless-tests.md) | AC-3 | [#1](https://github.com/JollyOrc/obsidian-webpage-export/issues/1) | tests/tooling/us-001-gate-scripts.test.ts | US-001 AC-3: (2 tests: script, smoke test) | ✅ pass (#1, 2026-10-30) |
| [US-001](../user-stories/US-001-tooling-fixture-and-headless-tests.md) | AC-4 | [#1](https://github.com/JollyOrc/obsidian-webpage-export/issues/1), [#11](https://github.com/JollyOrc/obsidian-webpage-export/issues/11) | tests/unit/us-001-lint-gate.test.ts, tests/tooling/us-001-gate-scripts.test.ts | US-001 AC-4: (5 unit: steps, release steps, all pass, stop at lint, last step; 5 tooling: scripts, gate before create-release ×2, docker-image needs build ×2) | ✅ pass (#1; #11: full-history checkout, no docker job — 4 tests, 2026-10-31) |
| [US-001](../user-stories/US-001-tooling-fixture-and-headless-tests.md) | AC-5 | [#2](https://github.com/JollyOrc/obsidian-webpage-export/issues/2) | tests/tooling/us-001-fixture.test.ts | US-001 AC-5: (4 tests: two processes identical, committed = fresh, manifest, 20 private terms) | ✅ pass (#2, 2026-10-30) |
| [US-001](../user-stories/US-001-tooling-fixture-and-headless-tests.md) | AC-6 | [#2](https://github.com/JollyOrc/obsidian-webpage-export/issues/2) | tests/tooling/us-001-fixture.test.ts | US-001 AC-6: (11 tests: unique names, F1 to F9, F5 image) | ✅ pass (#2, 2026-10-30) |
| [US-001](../user-stories/US-001-tooling-fixture-and-headless-tests.md) | AC-7 | [#2](https://github.com/JollyOrc/obsidian-webpage-export/issues/2) | tests/unit/us-001-plugin-lock.test.ts, tests/tooling/us-001-fixture.test.ts | US-001 AC-7: (4 unit: lock Text Mapper, lock Meta Bind, install, mismatch leaves no folder; 3 tooling: not committed, ignored, enabled) | ✅ pass (#2, 2026-10-30) |
| [US-001](../user-stories/US-001-tooling-fixture-and-headless-tests.md) | AC-8 | [#3](https://github.com/JollyOrc/obsidian-webpage-export/issues/3) | tests/integration/us-001-headless.test.ts | US-001 AC-8: (2 tests: tag, image plugin = local build) | ✅ pass (#3, 2026-10-30) |
| [US-001](../user-stories/US-001-tooling-fixture-and-headless-tests.md) | AC-8b | [#3](https://github.com/JollyOrc/obsidian-webpage-export/issues/3) | tests/unit/us-001-run-report.test.ts, tests/integration/us-001-headless.test.ts | US-001 AC-8b: (6 unit: valid, missing, unparsable, missing field, exported=false, fallback names; 1 integration: report of a real run) | ✅ pass (#3, 2026-10-30) |
| [US-001](../user-stories/US-001-tooling-fixture-and-headless-tests.md) | AC-9 | [#3](https://github.com/JollyOrc/obsidian-webpage-export/issues/3) | tests/integration/us-001-headless.test.ts | US-001 AC-9: (3 tests: temp copy, fixture unchanged, output folder) | ✅ pass (#3, 2026-10-30) |
| [US-001](../user-stories/US-001-tooling-fixture-and-headless-tests.md) | AC-10 | [#3](https://github.com/JollyOrc/obsidian-webpage-export/issues/3) | tests/unit/us-001-headless-runs.test.ts | US-001 AC-10: (4 tests: default 120 000 ms, kill + timeout message, ok, non-zero exit) | ✅ pass (#3, 2026-10-30) |
| [US-001](../user-stories/US-001-tooling-fixture-and-headless-tests.md) | AC-11 | [#3](https://github.com/JollyOrc/obsidian-webpage-export/issues/3) | tests/unit/us-001-headless-runs.test.ts | US-001 AC-11: (5 tests: 3/3, 1/2, written 1/2, name credit, duplicate names refused) | ✅ pass (#3, 2026-10-30) |
| [US-001](../user-stories/US-001-tooling-fixture-and-headless-tests.md) | AC-12 | [#3](https://github.com/JollyOrc/obsidian-webpage-export/issues/3) | tests/unit/us-001-html-reader.test.ts | US-001 AC-12: (10 tests, one per reader rule; `<` inside inline scripts added at #3) | ✅ pass (#3, 2026-10-30) |
| [US-001](../user-stories/US-001-tooling-fixture-and-headless-tests.md) | AC-13 | [#3](https://github.com/JollyOrc/obsidian-webpage-export/issues/3) | tests/integration/us-001-headless.test.ts | US-001 AC-13: (4 tests: pages = manifest, F1, F9, blank-case guard) | ✅ pass (#3, 2026-10-30) |
| [US-001](../user-stories/US-001-tooling-fixture-and-headless-tests.md) | AC-14 | [#3](https://github.com/JollyOrc/obsidian-webpage-export/issues/3) | tests/integration/us-001-headless.test.ts | US-001 AC-14: narrowed at US-002 #6 — with maxPreviewHeight 1000 Big Page has sections not drawn (3/3) | ⊘ withdrawn (US-002 amendment 1, 2026-10-31); test removed, records below kept |
| [US-001](../user-stories/US-001-tooling-fixture-and-headless-tests.md) | AC-15 | [#4](https://github.com/JollyOrc/obsidian-webpage-export/issues/4) | tests/tooling/us-001-docs.test.ts | US-001 AC-15: (6 tests: scripts, integration layer, AC map, AC-14 record, tool versions, Docker/plugins) | ✅ pass (#4, 2026-10-30) |
| [US-002](../user-stories/US-002-complete-embeds-no-freeze.md) | AC-1 | #6, #9 | tests/integration/us-002-embeds.test.ts, tests/unit/us-002-support.test.ts | US-002 AC-1: all 28 pages complete ×3 runs; oracle 10 rule tests | ✅ pass (#9: unit/tooling, integration 28/28 incl. 3/3 runs per configuration, 2026-10-31) |
| [US-002](../user-stories/US-002-complete-embeds-no-freeze.md) | AC-2 | #6, #9 | tests/integration/us-002-embeds.test.ts, tests/unit/us-002-support.test.ts | US-002 AC-2: Big Page heading embeds (data-type from AC-12), map embeds, Nested Embed; embedsOf 2 rule tests | ✅ pass (#9: unit/tooling, integration 28/28 incl. 3/3 runs per configuration, 2026-10-31) |
| [US-002](../user-stories/US-002-complete-embeds-no-freeze.md) | AC-3 | #9 | tests/integration/us-002-embeds.test.ts, tests/tooling/us-002-repository.test.ts | US-002 AC-3: no fallback or 'Not all sections drawn' ×3; no reading-view sizer in any of 28 embeds ×3; renderMarkdownView → renderDetached; renderDetached render/wait/warning (text checks) | ✅ pass (#9: unit/tooling, integration 28/28 incl. 3/3 runs per configuration, 2026-10-31) |
| [US-002](../user-stories/US-002-complete-embeds-no-freeze.md) | AC-4 | #6, #9 | tests/integration/us-002-embeds.test.ts, tests/unit/us-002-support.test.ts | US-002 AC-4: no div in p on 28 pages ×3 (regression guard); counter 6 rule tests | ✅ pass (#9: unit/tooling, integration 28/28 incl. 3/3 runs per configuration, 2026-10-31) |
| [US-002](../user-stories/US-002-complete-embeds-no-freeze.md) | AC-5 | #5 | tests/unit/us-002-embed-paragraphs.test.ts | US-002 AC-5: 8 shapes (jsdom; 2 added at #5: no marker, marker search stops) | ✅ pass (#5: 8 unit, 2026-10-30) |
| [US-002](../user-stories/US-002-complete-embeds-no-freeze.md) | AC-6 | #6, #9 | tests/integration/us-002-embeds.test.ts | US-002 AC-6: useFallbackRenderer complete ×3; Front Embed without frontmatter (AC-14 on every path) | ✅ pass (#9: unit/tooling, integration 28/28 incl. 3/3 runs per configuration, 2026-10-31) |
| [US-002](../user-stories/US-002-complete-embeds-no-freeze.md) | AC-7 | #5, #6 | tests/unit/us-002-placeholders.test.ts, tests/unit/us-002-empty-target.test.ts, tests/integration/us-002-embeds.test.ts | US-002 AC-7: 9 + 7 unit; F10 regression (map svg, no placeholder), F11, no placeholder anywhere | ✅ pass (#9: unit/tooling, integration 28/28 incl. 3/3 runs per configuration, 2026-10-31) |
| [US-002](../user-stories/US-002-complete-embeds-no-freeze.md) | AC-8 | #7, #10 | tests/tooling/us-002-repository.test.ts | US-002 AC-8: M05 file and content (kept); M10 file, content incl. the four embeds, folding, 'Unable to find', open question; index 1:1 | ✅ pass (#10: repository tests; M10 passed 2026-10-31, folding bullet amended) |
| [US-002](../user-stories/US-002-complete-embeds-no-freeze.md) | AC-9 | #8, #9 | tests/tooling/us-002-repository.test.ts | US-002 AC-9: only render-api.ts changed upstream (api-options.ts back, D9); dependencies.md; pure core | ✅ pass (#9: unit/tooling, integration 28/28 incl. 3/3 runs per configuration, 2026-10-31) |
| [US-002](../user-stories/US-002-complete-embeds-no-freeze.md) | AC-10 | #9 | tests/tooling/us-002-repository.test.ts | Withdrawn (amendment 1, D7/D9): unit tests us-002-preview-height and the integration block removed; guard: no `maxPreviewHeight` in src, no height.ts, no growth names in render-api.ts | ✅ pass (#9: unit/tooling, integration 28/28 incl. 3/3 runs per configuration, 2026-10-31) |
| [US-002](../user-stories/US-002-complete-embeds-no-freeze.md) | AC-11 | #8, #9 | tests/unit/us-002-sections.test.ts, tests/integration/us-002-embeds.test.ts | US-002 AC-11: 9 unit (jsdom; comments dropped; domOf helper check); Front Note el-p/el-h2/el-p, Long Note 6 el-h2, every sizer child a wrapper/header/footer/pusher ×3 | ✅ pass (#9: unit/tooling, integration 28/28 incl. 3/3 runs per configuration, 2026-10-31) |
| [US-002](../user-stories/US-002-complete-embeds-no-freeze.md) | AC-12 | #8, #9 | tests/unit/us-002-marks.test.ts, tests/integration/us-002-embeds.test.ts | US-002 AC-12: 9 unit (arrows, icon, data-type, root class); fixture totals 23/28/10 ×3; root class list on 28 pages ×3 | ✅ pass (#9: unit/tooling, integration 28/28 incl. 3/3 runs per configuration, 2026-10-31) |
| [US-002](../user-stories/US-002-complete-embeds-no-freeze.md) | AC-13 | #8, #9 | tests/unit/us-002-marks.test.ts, tests/integration/us-002-embeds.test.ts | US-002 AC-13: 4 unit (exact h5, text escaping, block subpath untouched, nested embeds of a replaced embed); F14 text, no FX-LONG, no data-type, no warning ×3 | ✅ pass (#9: unit/tooling, integration 28/28 incl. 3/3 runs per configuration, 2026-10-31) |
| [US-002](../user-stories/US-002-complete-embeds-no-freeze.md) | AC-14 | #8, #9 | tests/unit/us-002-frontmatter.test.ts, tests/integration/us-002-embeds.test.ts, tests/tooling/us-002-repository.test.ts | US-002 AC-14: 7 unit; F12/F13 ×3; postProcessHTML uses pageFrontmatter/removeEmbedFrontmatter (text check) | ✅ pass (#9: unit/tooling, integration 28/28 incl. 3/3 runs per configuration, 2026-10-31) |
| [US-002](../user-stories/US-002-complete-embeds-no-freeze.md) | AC-15 | #9 | tests/integration/us-002-embeds.test.ts, tests/tooling/us-002-repository.test.ts | US-002 AC-15: F15 folded callout ×3; mermaid, Dataview, canvas in renderDetached (text checks; behaviour not measured) | ✅ pass (#9: unit/tooling, integration 28/28 incl. 3/3 runs per configuration, 2026-10-31); mermaid/Dataview/canvas behaviour not measured (text checks) |
