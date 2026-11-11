# US-004 — A page is copied only after its plugin blocks have finished drawing

**Status:** Ready (2026-11-11, by the user; D1–D5 decided the same day)
**Introduced:** —
**Implemented:** —
**Supersedes:** US-002 AC-3, only its rule for when a plugin block counts as
rendered ("no `[class^='block-language-']` element is empty"). The rest of
US-002 AC-3 (off-screen render, 50 ms poll, embeds by AC-7's rule) stays.
**Source:** [#12](https://github.com/JollyOrc/obsidian-webpage-export/issues/12);
G0 measurement M11.

---

## Story

**As** the author publishing a vault whose notes use plugin blocks that draw
asynchronously (a `dataviewjs` view, a map, a widget),
**I want** every exported page to hold what those blocks draw, every time I
export,
**so that** the website does not lose a different piece on every run, and a
block that never finishes is announced instead of silently missing.

---

## Context (measured; M11, `docs/technical/manual-checks/M11.md`)

- The export copies a note's page when no plugin block is empty
  (`renderDetached`, US-002 AC-3). A block that receives a first child before
  its real output counts as rendered at once.
- Dataview 0.5.68, `dv.view(name)` (read from its source): it creates a
  `<style>` element from `name/view.css` in the block, then awaits
  `vault.read(name/view.js)`, then runs the script, which may await again.
  Between the two, the block holds only the `<style>`.
- On the desktop (release 1.10.0, the author's vault, one `dv.view` script used
  by 38 notes and embedded once elsewhere, 39 renders per export, three
  exports): at script start the block held exactly one child, the
  `<style>`, in 117 of 117 renders. Lost per export: 3, 2, 2 views; in every
  run exactly the views whose container was already detached (page copied,
  host removed) when their script started. Different notes each run; the
  embedded copy in all three. `dv.current()` was never empty (0 of 117).
- The same script takes 6 ms from start to its last step (median; 90 % within
  8 ms; slowest 236 ms; 117 renders).
- In the same export, 151 of 411 pages hold plugin blocks: `dataviewjs` 142,
  `text-mapper` 22, `meta-bind-embed` 1.
- Upstream 1.9.2 (reading-view path) lost one of the same views in the
  author's export of 2026-11-09.
- **Not measured:** how other plugins fill their blocks (text-mapper, Meta
  Bind, Leaflet, Excalidraw, Dataview queries, Obsidian2Typst's code-block
  renderer) — whether they too put a first child before their output
  (SCAR-017, SCAR-024). Not reproduced headless yet (the fixture has no
  Dataview).

---

## Acceptance criteria

*The values marked ⟨D…⟩ were decided as D1 to D5 (2026-11-11).*

- **AC-1 — A block holding only non-content does not count as drawn.** A
  plugin block (`[class^='block-language-']`) counts as having output only
  when it holds a node other than `<style>`, `<script>`, `<link>`, a comment
  or whitespace text ⟨D1⟩.
  Example: a block whose only child is
  `<style scope=" ">.card { color: red }</style>` has no output; the same
  block with `<style>…</style><div class="card">Ready</div>` has output.

- **AC-2 — A block counts as finished only after it has stopped changing.**
  After every block of the note has output, the export waits until no block
  (its subtree: child list, attributes, text) has changed for ⟨D2: 150 ms⟩;
  only then is the page copied. The overall limit per note stays ⟨D3:
  5 000 ms⟩ from the end of `MarkdownRenderer.render`.
  Example (fixture, test plugin of AC-6): a block that inserts a `<style>`,
  waits 300 ms, inserts `<div class="card"></div>`, waits 20 ms, writes
  `Ready` into it and sets `data-step="2"` is exported as
  `<style>…</style><div class="card" data-step="2">Ready</div>` — not
  without the `div`, not with an empty `div`.

- **AC-3 — Composed cases.** The rule of AC-1 and AC-2 holds for:
  (a) a block inside an embedded note (the embed is filled and its block has
  finished); (b) two blocks on one page, the second finishing 400 ms after
  the first (both exported finished); (c) a block inside a callout;
  (d) a block in a note embedded twice on one page. Each with the example
  block of AC-2.

- **AC-4 — A block that never gets output, or never stops changing, is
  reported once.** At the limit, the page is copied as it is, and the export
  log has one warning per such block:
  `Plugin block <first class> in <note path> did not finish within <limit> ms (<reason>)`
  with reason `no output` (AC-1 not met) or `still changing` (AC-2 not met)
  ⟨D4⟩. Upstream's `Plugin element … not rendered correctly!` is not written
  for the same block in addition (SCAR-038). A block that draws nothing on
  purpose (its script returns before drawing, leaving only a `<style>`)
  is a `no output` warning ⟨D5⟩.

- **AC-5 — Cost stays bounded.** A note without plugin blocks is not delayed
  by AC-2. For the fixture, the export time with this story is recorded
  next to the time without it; on the author's desktop the full export is
  measured once (M-check) and the difference stated (expected order: up to
  151 pages × ⟨D2⟩, not measured).

- **AC-6 — Reproduced without the author's vault.** The fixture vault gets a
  small test plugin (part of the fixture generator, no third-party code) that
  registers a code block language drawing in steps as in AC-2, with delays
  set per block in the source. The headless integration test exports it
  and checks every block's final content; with US-002's rule (mutation:
  AC-1 and AC-2 switched off) the same test fails (SCAR-023, SCAR-045).

- **AC-7 — On the desktop.** A manual check runs three full exports of the
  author's vault with the cache cleared; every page that holds the
  `dv.view` script of M11 holds its drawn output in all three (0 lost of 39
  per run), and the export log lists every warning of AC-4 that occurred.

---

## Decisions

2026-11-11 (the user, after G1 draft):

- **D1** "No output" = only `<style>`, `<script>`, `<link>`, comments and
  whitespace text in the block (AC-1 as written).
- **D2** Quiet time 150 ms, a fixed constant (not a setting).
- **D3** The limit per note stays 5 000 ms, fixed.
- **D4** Warning text and reasons as in AC-4 (proposed; the user did not
  object).
- **D5** A block that draws nothing on purpose is warned as `no output`
  after the limit.

---

## Notes

- G0: `docs/state/30_scar_checks.md` (2026-11-10 and 2026-11-11). Carried
  into this draft: composed cases (002, 009 → AC-3), examples (007),
  the class (017 → AC-1 for every plugin block; other plugins not measured),
  settings (019 → D2, D3), timing of the dependency (022, 024 → Context),
  reporting once (038 → AC-4), harness (045 → AC-6).
- Unexplained in M11: each entry note was also rendered twice outside the
  export's off-screen host during each export; not part of this story.

---

## Related tickets

<!-- Fill in once the ticket issues are created (step 3). -->
- [#12](https://github.com/JollyOrc/obsidian-webpage-export/issues/12) — the request (bug report)
