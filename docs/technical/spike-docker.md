# Spike — Headless Obsidian in Docker as a test runner

**Date:** 2026-10-30. **Decision it serves:** US-001 G0 (1): can automated
tests exercise Obsidian's real renderer? **Status:** done; results measured
unless marked otherwise.

## Set-up

- Image built from upstream `Dockerfile` at `master` `78c973d` in a clean
  worktree: `docker build -t owe-spike:78c973d .`; 13:16:47 to 13:19:22
  (about 2.5 min), 1.54 GB. Host: Docker 29.9.2, arm64, 8 CPU, 8 GB.
- The image runs **Obsidian v1.9.12** (window title in the log) under
  `xvfb-run` with `electron-injector`; `EXPORT_ENTIRE_VAULT=1` makes the
  injected script call `plugin.exportVault('/output')`.
- Spike vault (scratchpad, copies only; the working-copy vault was read):
  - Text Mapper 1.1.0 from its GitHub release (`modality/obsidian-text-mapper`,
    licence MIT; `main.js` sha256 `64dfc867…`, byte-identical to the
    vault's copy), enabled through `.obsidian/community-plugins.json`.
  - Copies of `1.4.3 Magic Skills.md`, `1.3.2 Magic.md`, the 8 spell-school
    notes, `News/Spells now hexmaps too!.md` and three images.
  - Synthetic: `Synthetic/Map.md` (a 3-hex `text-mapper` block with
    sentinel text) embedded by `Synthetic/Embedder.md` (`![[Map]]`).
- Run: `docker run --rm -e EXPORT_ENTIRE_VAULT=1 -v <vault>:/vault
  -v <out>:/output owe-spike:78c973d`, wrapped in a 600 s limit (`perl
  alarm`; macOS has no `timeout`). The start script copies the plugin into
  the vault's `.obsidian/plugins/` when it is missing: the mounted vault is
  written to.

## Results

| Run | Time | Fallback used for | `spells-now-hexmaps-too!.html` | `1.4.3-magic-skills.html` | `synthetic/embedder.html` |
|-----|------|-------------------|-------------------------------|---------------------------|---------------------------|
| 1 | 19 s | `1.4.3`, `Spells now hexmaps too!` | embed **missing** (0 map blocks) | complete, 8 map blocks | complete, map and sentinels |
| 2 (fresh container) | 15 s | `1.4.3` only | complete, 1 map block | complete, 8 map blocks | complete |

- Text Mapper blocks are written as `<div class="textmapper"><svg …>`
  inside `block-language-text-mapper`; no empty block in either run.
- Run 1 reproduces the M04 loss in the working-copy vault (same note, same
  shape: embed gone, bare links kept, no warning, `Exported`).
- Across M04 and both spike runs, the embedded note was missing exactly when
  the note went through the fallback renderer (3 of 3); which notes fall
  back varies between runs (2 notes in run 1, 1 in run 2).

## Limits and open points

- Obsidian 1.9.12 in Docker against 1.14.5 on the author's Mac
  (SCAR-024): results are measured for 1.9.12 only.
- The freeze of M01 and M03 was **not** reproduced (both runs finished).
  Not tried: a full-size vault; repeated runs to estimate rates.
- Reader check (SCAR-028): a first reader that replaced each `<svg>` by a
  placeholder reported the map labels missing; the raw HTML has them
  (`>Alpha<`). Map labels live inside the SVG; a test reader must search
  there.
- Timing gives the window: 15 to 19 s per run including Obsidian start.

## Conclusion for US-001

Automated integration tests against the real renderer are feasible here: the
image builds and exports in under 20 s, and the main defect of US-002
(content lost in the fallback renderer) reproduces. Because the outcome
varies between runs, a test of US-002 needs repeated runs or a way to force
the fallback, and must check content, not status (SCAR-015).

## Addendum — Obsidian 1.14.5 in the image (US-001 D5, 2026-10-30)

- `docker build --build-arg OBSIDIAN_VERSION=1.14.5` (cached layers): 27 s.
- Two runs (17 s, 19 s), window title `Obsidian 1.14.5`: each wrote the same
  page set as 1.9.12 (40 files; only Obsidian's own font files differ).
  Content: `spells-now-hexmaps-too!.html` lost its embed in **both** runs
  (0 map blocks); `1.4.3-magic-skills.html` complete (8 map blocks);
  `synthetic/embedder.html` complete (`>Alpha<` present).
- `electron-injector 1.0.2` panics in both runs
  (`Should be able to evaluate JS: missing field 'id'`); the log has no
  console lines (no warnings, no `Exported`), then `Renderer process
  killed`. The export itself ran (pages written 13:33:03). Unverified: why the
  injector cannot read the reply under 1.14.5's Electron.
- Consequence: under 1.14.5 a test cannot read the fallback warning or a
  completion signal from the container log.
