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

| Criterion | Date | Obsidian | Note | Result |
|-----------|------|----------|------|--------|
| US-001 AC-14 | 2026-10-30 | 1.14.5 | `Composed/Big Page.md` | fallback: 3/3 |
| US-001 AC-14 | 2026-10-30 (full gate, 14:58) | 1.14.5 | `Composed/Big Page.md` | fallback: 2/3 |

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
| [US-001](../user-stories/US-001-tooling-fixture-and-headless-tests.md) | AC-4 | [#1](https://github.com/JollyOrc/obsidian-webpage-export/issues/1) | tests/unit/us-001-lint-gate.test.ts, tests/tooling/us-001-gate-scripts.test.ts | US-001 AC-4: (5 unit: steps, release steps, all pass, stop at lint, last step; 5 tooling: scripts, gate before create-release ×2, docker-image needs build ×2) | ✅ pass (#1, 2026-10-30) |
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
| [US-001](../user-stories/US-001-tooling-fixture-and-headless-tests.md) | AC-14 | [#3](https://github.com/JollyOrc/obsidian-webpage-export/issues/3) | tests/integration/us-001-headless.test.ts | US-001 AC-14: Big Page falls back in ≥ 1 of 3 runs | ✅ pass (#3, 2026-10-30) |
| [US-001](../user-stories/US-001-tooling-fixture-and-headless-tests.md) | AC-15 | [#4](https://github.com/JollyOrc/obsidian-webpage-export/issues/4) | tests/tooling/us-001-docs.test.ts | US-001 AC-15: (6 tests: scripts, integration layer, AC map, AC-14 record, tool versions, Docker/plugins) | ✅ pass (#4, 2026-10-30) |
