# US-002 — Notes with embeds export completely; no note freezes the export

**Status:** Done (2026-10-31; M10 passed). Amendment 1 (2026-10-31:
detached renderer replaces the growing preview; D7–D10; Ready by the user
2026-10-31). Before: Ready (2026-10-30; D1–D5 decided).
**Introduced:** —
**Implemented:** 2026-10-31 (#5, #6, #8, #9; manual check M10, #10)
**Supersedes:** —

---

## Story

**As** the author publishing the Raiders of Arismyth rules,
**I want** every exported page to contain the full content of everything it
embeds, and the export never to freeze on a note,
**so that** the published site shows the rules as they are in the vault, and
a missing piece is announced instead of silently dropped.

---

## Context (measured; `docs/technical/spike-embeds.md`, M01 to M09)

- Obsidian draws only the sections near the visible area. In the headless
  window (500 px) `Big Page.md` (15 sections, 7 828 px) has 10 sections
  drawn; upstream waits for all of them, times out and uses the fallback
  renderer. The fallback froze Obsidian twice in the author's vault (M01,
  M03).
- Upstream's `postProcessHTML` step "transclusions put a div inside a p
  tag" sets the first embed of a paragraph to the parent's remaining HTML:
  on the fallback path it empties the first of two embeds (16 → 8 filled on
  `Big Page.md`); on the main path it nests the second embed inside the
  first. The author's `1.4.3 Magic Skills.md` lost all checked `1.3.2 Magic`
  sections this way (M04).
- Measured fix A3 (3/3 runs, Obsidian 1.14.5): a preview tall enough that
  every section is drawn, the main path copying DOM nodes instead of
  re-parsing HTML, and the p-tag step keeping embeds that already hold
  content. Implemented in #6 as a growing preview (D1). **On the author's
  desktop the growing preview froze Obsidian** (M05, M06, M07: synchronous,
  around `1.4.3 Magic Skills.md`, at different steps; M07 at 26 285 px with
  12 of 15 sections drawn). Not reproduced headless (500 px and
  2560 × 1550).
- Measured fix A4 (spike addenda "A4", "A4 against the preview's outputs",
  "causes", "fixes"): each note's Markdown rendered by Obsidian's
  `MarkdownRenderer.render` into an element off screen, never in the
  reading view. Fixture complete 3/3; vault copy 40 s instead of 108–121 s;
  **desktop: no freeze** (M08, M09: 331/331 notes, 30.9 s). With section
  wrappers and four fixes its output equals the preview's (headings,
  tables, embeds, maps, Leaflet, Excalidraw, Meta Bind, titles; page text
  equal with whitespace and Virtual Linker's `🔗` ignored) on the fixture
  and on the vault copy's 537 pages.
- Decisions (G0 US-002): complete = full content of every note, heading and
  block embed incl. maps and plugin blocks, any depth; a failure shows a
  visible placeholder and a warning; fork-only, small upstream diffs.

---

## Acceptance criteria

All integration criteria run on the fixture vault with `--runs 3` and must
hold in every run (the outcome varied between runs before, SCAR-024).
*Amendment 1 changes AC-1, AC-3, AC-8, AC-9, withdraws AC-10 and adds
AC-11 to AC-15.*

- **AC-1 — Every page is complete.** For each of the 28 fixture notes (the
  24 of the fixture manifest and the new F12 to F15, AC-11 to AC-15) the
  exported page's text (reader of US-001 AC-12, text inside `<svg>`
  included) contains every expected token: the note's own `FX-*` sentinels
  and map labels plus those of every note, heading or Meta Bind snippet it
  embeds, recursively (the spike's oracle, moved into `tests/support/`).
  Examples: `Composed/Big Page.md` 102 tokens (`FX-LONG-1` to `FX-LONG-6`
  and 96 map labels of `Map 1` to `Map 8`); `Embeds/Nested Embed.md` 8
  (`FX-F7`, `FX-F2-BEFORE`, `FX-F2-AFTER`, `FX-F1-BEFORE`, `FX-F1-AFTER`,
  `Alpha`, `Beta`, `Gamma`); `Embeds/Heading Embed.md` 2 (`FX-LONG-3`,
  `FX-LONG-4`, not `FX-LONG-2`); `Embeds/Meta Bind Embed.md` 1
  (`FX-F8-SNIPPET`). *(Amendment 1: 20 → 28 notes; the count was stale
  since F10/F11.)*

- **AC-2 — Each embed holds its own content.** In `composed/big-page.html`
  each of the 8 heading embeds (`data-type="heading"`, written by AC-12)
  contains the sentinel of its section (`![Section Three](…#Section%20Three)`
  → `FX-LONG-3`) and none contains a map embed; each of the 8 map embeds
  contains the 12 labels of its map. In `embeds/nested-embed.html` the outer
  embed contains the inner embed, which contains `FX-F1-BEFORE`. A
  paragraph with two embeds is written as two sibling embeds, in source
  order.

- **AC-3 — Notes are rendered off screen, not in the reading view.**
  *(Rewritten in amendment 1, D7; was: the preview grows until all sections
  are drawn.)* The main path (`useFallbackRenderer: false`, the default)
  renders each note's Markdown with Obsidian's `MarkdownRenderer.render`
  into an element that is not part of the visible window (absolutely
  placed off screen, 900 px wide, removed after the note), with the note's
  path as source path. It then waits until no `.markdown-embed` is empty
  (AC-7's rule) and no `[class^='block-language-']` element is empty,
  polling every 50 ms, at most 5 000 ms per note; what is still empty then
  is handled by AC-7 (embeds) and upstream's warning
  `Plugin element <class> from <note file name> not rendered correctly!`
  (plugin blocks). The reading view's height is never changed. No run
  report has `Failed to render all sections` or `Not all sections drawn`.
  Measured (spike): fixture 3/3 complete, every note pending 0 at the end of
  the wait; `Big Page.md` 0.2–0.28 s (growth: about 4.8 s); vault copy
  364 notes, none pending; export 40–41 s.

- **AC-4 — Valid structure.** No exported fixture page has a `<div>` inside
  a `<p>` (counted with an HTML parser that is itself tested on a known
  input). Upstream's reason for the p-tag step stays satisfied.

- **AC-5 — The p-tag step keeps filled embeds.** For a paragraph whose
  embeds already hold content, the step only replaces the `<p>` by the
  `<span style="display: block; …">` upstream writes, children unchanged
  (two embeds in → the same two embeds out). For a page that went through
  the HTML parser, measured with jsdom 26.1.0 (spec-conformant, as
  Chromium): `<p><span a><div>A</div></span><br> <span b><div>B</div></span></p>`
  becomes `<p><span a></span></p><div>A</div><br> <span b><div>B</div></span><p></p>`
  — the first `<div>` closes the `<p>`, the first embed is empty with its
  block after the `<p>`, the second embed is outside the `<p>` and keeps its
  content. The step then gives the empty embed only its own block (the
  nodes up to the next embed), not the rest (D3: each embed its own content,
  in order); the second embed stays as it is; the empty `<p></p>` the parser
  added is removed. Unit tests build each shape by parsing it with jsdom, as
  Obsidian's page is parsed: one filled embed, two filled embeds, one embed
  through the parser, two embeds through the parser. *(Amended at G2,
  2026-10-30: the earlier example "two empty embeds with two blocks" is not
  a shape the parser produces.)*

- **AC-6 — The fallback, when it runs, is complete.** With the export
  setting `useFallbackRenderer: true` (users rely on it; SCAR-027; kept by
  D7) all fixture pages are complete (AC-1) and AC-2 holds. Before it copies
  the page, the fallback waits until every embed has content (D2 rule),
  polling every 50 ms, at most 3 000 ms per note; an embed still empty then
  is handled by AC-7. Measured (#6): without the wait, ordinary embeds are
  empty at the copy; with it, 3/3 runs complete, waits 50–55 ms.
  *(Amended at #6, 2026-10-30, user decision.)* *Freeze: the fallback is
  the path of M01 and M03; not claimed to be free of it.* AC-11 to AC-14
  are not required of the fallback, except AC-14 (it is a post-processing
  rule for every path).

- **AC-7 — A missing piece is visible.** When an embed is still empty
  after rendering — it has no `.markdown-embed-content`, or that element has
  no text, no `<svg>` and no `<img>` (D2; measured: Obsidian writes no
  content element at all for F10 and F11) — the page shows in its place
  `<div class="owe-export-placeholder">Embedded content could not be
  exported: <target></div>` as the embed element's only content (inside the
  embed, so no `<div>` ends up in a `<p>`, AC-4; the text set as text, so
  `<`, `&` in a target appear literally), where `<target>` is the embed's
  `src` attribute at render time (measured at #6: the link as written,
  URL-decoded, e.g. `Broken Map`, `Long Note#Section Three`,
  `../Long Note.md#Section One`), and the run report has the warning
  `Embed not exported: <note path> → <target>`. The other embeds of the
  page and the other pages are unaffected. Before an embed is marked, the
  export reads its target in the vault (D6): a target note, or heading
  section, with no text after its frontmatter is genuinely empty, and its
  embed stays as Obsidian wrote it, without placeholder or warning.
  Measured at #6: at `postProcessHTML` an embed of an empty note has a
  content element without text, `<svg>` or `<img>`; an embed of a note
  whose only block fails holds that block's output. Fixture notes:
  - F10 `Failures/Embed Broken Map.md` embeds `Failures/Broken Map.md`
    (only a `text-mapper` block with `include no-such-file.txt`): a
    regression check — it exports as Obsidian shows it, the embed holding
    Text Mapper's `<svg>` without hexes; no placeholder, no warning;
    sentinel `FX-F10` *(amended at #6: measured, not an export failure)*;
  - F11 `Failures/Embed Empty Note.md` embeds the empty
    `Failures/Empty Note.md`: no placeholder, no warning; sentinel `FX-F11`.
  No fixture note fails to export, so the placeholder itself is shown by
  the unit tests of `markUnexportedEmbeds` (with mutation checks), not by
  an integration run *(stated gap, user decision 2026-10-30)*. Obsidian's
  own "not created yet" text for a missing note is not a `markdown-embed`
  and counts as content (measured). An embed of a missing heading is
  AC-13, not a placeholder.

- **AC-8 — The author's vault (manual check).** A build with its own
  version, installed in the working-copy vault with the usual selection,
  exports on the desktop without freezing (the log has heartbeats to the
  end), and:
  - `1.4.3-magic-skills.html` contains the first sentence of the
    `1.3.2 Magic` sections Body Magic, Cantrips, Curses and Wizardry, and
    the spell text `Fireball`;
  - `spells-now-hexmaps-too!.html` contains the Wizardry map (an `<svg>`
    with the label `Invisible Magic Hand`);
  - `flowcharts.html` contains the embedded "Edge Dice" text;
  - *(amendment 1)* the embeds `Dodge` (`rules-revisions.html`),
    `Giant Toad` (`2.3-the-game-loops.html`), `Battlefield Controller`
    (`grit-and-conditions-test-results.html`) and `Ice Crystal`
    (`rules-revisions-and-clarifications.html`) show their text, and none
    of these four pages shows the embedded note's properties;
  - *(amendment 1)* `1.3.1-combat.html` holds the heading arrows in its
    HTML (28, counted by program); whether the site shows them follows the
    export setting `allowFoldingHeadings` — the author's vault has `false`,
    so the site shows none, as the exports before *(amended after M10,
    2026-10-31, user decision; folding with the setting on is AC-12's
    automatic test)*; `rules-revisions-and-clarifications.html` shows
    `Unable to find “Combat and Critical Failures” in 1.3.1 Combat`.
  The check ends with the open question (SCAR-015), including: does the
  look differ from the August export (headings, folding, spacing, embed
  icons)?

- **AC-9 — Small upstream diff.** Changes to upstream files are limited to
  `src/plugin/render-api/render-api.ts` (the detached renderer and its
  call, DOM copy, the frontmatter step's scope, calls of the new core
  functions) *(amended at G2; amendment 1: `api-options.ts` is no longer
  changed — D9)*, and listed in `dependencies.md`; the logic of the p-tag
  step, the placeholders, the section wrappers (AC-11), the preview's marks
  (AC-12, AC-13) and the choice of the page's own frontmatter (AC-14) lives
  in `src/core/` with unit tests in a `jsdom` Vitest environment (D4 as
  amended: happy-dom 20.14.6 keeps a `<div>` inside a `<p>` when parsing;
  jsdom 26.1.0 moves it out as the HTML specification and Chromium do —
  measured at G2). Obsidian calls (`MarkdownRenderer.render`,
  `resolveSubpath`, `getFirstLinkpathDest`) stay in `src/plugin` and reach
  the core as injected functions.

- **AC-10 — Withdrawn (amendment 1, D7, D9).** *Was: the growing preview
  stops at `maxPreviewHeight`, without the fallback.* The growth, the
  option `maxPreviewHeight`, `src/core/preview/height.ts` and its unit tests
  and the integration configuration `maxPreviewHeight: 1000` are removed.
  What stays of it: upstream's automatic switch to the fallback on the
  `sections-counted` timeout stays removed (the fallback runs only with
  `useFallbackRenderer: true`, AC-6).

- **AC-11 — Each block in its section wrapper.** *(Amendment 1.)* Every
  top-level node the render writes is copied into the page's sizer inside
  its own `<div class="el-<tag>">` (`<tag>` the node's lower-case tag name;
  text nodes with only whitespace are dropped; other text nodes as
  `el-p`), in source order, as the reading view writes its sections.
  Upstream's later steps rely on it (M08: without wrappers the frontmatter
  step removed the sizer, every page of a note with frontmatter lost its
  body; search text line breaks in `webpage.ts` read wrappers under the
  sizer). Example (measured, spike): `Plain/Front Note.md` (F12) →
  sizer children `div.el-pre` (the frontmatter, then moved by AC-14),
  `div.el-p`, `div.el-h2 > h2`, `div.el-p` (measured after the move: the
  last three); page text contains `FX-F12` and `FX-F12B`. Content
  inside an embed is not wrapped (the render does not; measured: equal to
  the preview's text).

- **AC-12 — The preview's marks.** *(Amendment 1; rules measured on the
  preview's output of the vault copy, 537 pages.)* The detached output
  carries what the reading view writes and the render does not (measured:
  0 of each in 364 notes):
  - every `h1`–`h6` that is a block of the note or of an embed's content
    (its parent is the render's root or an embed's
    `.markdown-preview-view`) gets, as first child,
    `<span class="heading-collapse-indicator collapse-indicator collapse-icon">`
    with the preview's arrow `<svg … class="svg-icon right-triangle">`;
    page titles and headings inside other blocks (callouts, lists, tables)
    get none;
  - every `.markdown-embed` without one gets, as last child,
    `<div class="markdown-embed-link" aria-label="Open link">` with the
    preview's `svg-icon lucide-maximize-2`;
  - every `.markdown-embed` whose `#subpath` resolves to a heading of its
    target gets `data-type="heading"`; an unresolved one gets none;
  - the page root's class is `obsidian-document` followed by the reading
    view's class list for that note (measured for every note:
    `markdown-preview-view markdown-rendered node-insert-event
    is-readable-line-width allow-fold-headings allow-fold-lists
    show-indentation-guide show-properties`).

  Examples (spike, one run; preview / fixed): fixture 23 / 23 arrows,
  28 / 28 icons, 10 / 10 `data-type="heading"`; vault copy 1 457 / 1 458,
  55 / 56, 24 / 25 (the extra one: the `Edge Dice` embed on
  `flowcharts.html`, which the preview wrote without them; *cause not
  traced* — accepted as the consistent result).

- **AC-13 — An embed of a missing heading says so, as Obsidian does.**
  *(Amendment 1, D8.)* When an embed's `#heading` does not resolve in its
  target note (`resolveSubpath` gives nothing), its content is exactly
  `<div class="markdown-preview-view markdown-rendered"><h5 data-heading="T" dir="auto">T</h5></div>`
  with `T` = `Unable to find “<heading>” in <target note name>`, the text
  set as text, and the `h5` then gets AC-12's arrow like every heading of an
  embed (measured: the preview's `h5` has one); no warning, no placeholder
  (D8: as the preview). Measured:
  the render alone writes the whole target note there (fixture 2 706
  characters of `Long Note`, vault 16 926 of `1.3.1 Combat`). Fixture note
  (new) F14 `Embeds/Missing Heading Embed.md`: `FX-F14-BEFORE`,
  `![[Long Note#No Such Heading]]`, `FX-F14-AFTER`; the page contains
  `Unable to find “No Such Heading” in Long Note` and both sentinels, and
  **none** of `FX-LONG-1` to `FX-LONG-6`. Block subpaths (`#^id`) are not
  touched *(not measured: no block embed in fixture or vault)*.

- **AC-14 — Frontmatter: the page's own moves, an embed's is removed.**
  *(Amendment 1, D10.)* Upstream's step moves the first `.frontmatter`
  before the sizer and removes its parent wrapper; it now takes the first
  `.frontmatter` that is not inside a `.markdown-embed` (measured: the
  unrestricted step emptied 4 of 4 vault embeds of frontmatter notes in the
  detached output, 0 → 1 empty each, and in both builds put the embedded
  note's properties at the top of the embedding page). Every `.frontmatter`
  inside a `.markdown-embed` is removed, with nothing else of the embed
  (D10; *not measured* — G2 measures it). Holds on every path (AC-6).
  Fixture notes (new): F12 `Plain/Front Note.md` (frontmatter `title`,
  `tags: [probe]`; body `FX-F12 …`, then `## Part` with `FX-F12B`): one `.frontmatter`
  before the sizer, `FX-F12` present; F13 `Embeds/Front Embed.md`
  (`FX-F13-BEFORE`, `![[Front Note]]`, `FX-F13-AFTER`): the embed contains
  `FX-F12`, the page has no `.frontmatter` element at all, and the text
  `probe` appears nowhere inside the page's
  `.obsidian-document`.

- **AC-15 — What else the reading-view path did is kept.** *(Amendment 1,
  SCAR-027.)* The detached path also: loads mermaid before rendering if it
  is not loaded (as upstream); runs upstream's Dataview rendering on the
  rendered element; turns `canvas` elements (not in PDF embeds) into
  images as upstream's main path does; keeps a callout folded in the source
  (`> [!note]-`) folded, its content in the page. Fixture note (new) F15
  `Composed/Folded Callout.md`: a `> [!note]- Folded` callout holding
  `FX-F15`: the page contains `FX-F15` inside a `.callout` with the class
  `is-collapsed`. *Not measured: mermaid, Dataview (no fixture plugin, no
  query in the vault's output), canvas conversion (fixture: 2 `canvas`
  elements in both outputs, i.e. not converted by either), the folded
  callout — G2 measures each or states it as not measured.*

---

## Decisions

2026-10-30:

- **D1** Grow until complete, with a re-render after each doubling
  *(superseded by D7, 2026-10-31)*.
- **D2** "Not exported" = an embed whose content has no text, no `<svg>`, no
  `<img>` after rendering; Obsidian's "not found" text counts as content.
- **D3** Two empty embeds in one paragraph get their moved content in order.
- **D4** jsdom as the Vitest environment for DOM unit tests (first
  happy-dom; changed at G2 after it failed the parsing check).
- **D5** At the limit: no fallback, warn *(superseded by D7/D9; the removal
  of the automatic fallback switch stays)*.
- **D6** Before placing a placeholder, the export reads the embed's target;
  an embed of a genuinely empty note or section stays as written (G2).

2026-10-31 (amendment 1, G0 of the amendment):

- **D7** The detached renderer is the main path; the growing preview is
  removed; the fallback stays behind `useFallbackRenderer` (AC-6).
- **D8** An embed of a missing heading shows Obsidian's "Unable to find"
  heading, without a warning (as the preview).
- **D9** The option `maxPreviewHeight` is removed (never released).
- **D10** An embedded note's frontmatter is removed from the embed; the
  page's own frontmatter moves as upstream.

---

## Notes

- Users of the replaced reading-view path (SCAR-027, measured in the spike
  addenda) and what becomes of each:
  - upstream's frontmatter step (needs wrappers; queries the whole page) →
    AC-11, AC-14;
  - frontend heading folding (`headers.ts`, `.heading-collapse-indicator`)
    → AC-12; site CSS (root classes) → AC-12; AC-2's test
    (`data-type="heading"`) → AC-12;
  - search and description text (`webpage.ts`, wrappers under the sizer)
    → AC-11;
  - heading outline and ids (`webpage.ts`: `.heading`, `data-heading`) →
    unchanged (measured equal);
  - the path's own steps: unfold headings and lists (not needed: the render
    has no fold state), mermaid, Dataview, canvas, callout folding → AC-15;
    plugin-block warning → AC-3; banner plugin → kept as upstream *(not
    measured; not in the vault)*;
  - Virtual Linker: the detached output links each term once per note, as
    the vault's setting `onlyLinkOnce = true` asks; the reading view linked
    each occurrence again per section (vault: 3 866 → 2 784 links; text
    differs only by the `🔗` suffixes). Named change of the published site;
    *per-term "first mention" not measured*;
  - dropped: the growth, `restoreViewHeights`, `maxPreviewHeight`,
    `core/preview/height.ts` and its tests, the integration configuration
    `maxPreviewHeight: 1000` (AC-10);
  - **US-001 AC-14** provokes "sections not drawn" through
    `maxPreviewHeight: 1000`; with D7/D9 neither exists. *Proposed:
    withdraw it (the defect class cannot occur on the main path any more);
    open for the user's decision at G1.*
- Users of the fallback (SCAR-027): the setting `useFallbackRenderer`. AC-6
  keeps the fallback correct for them.
- Seen, not in this story: `Grit and Conditions test results.md` embeds a
  file that does not exist (`../Rulebook/03.1 Combat.md#Armour`); Obsidian
  writes an empty `file-embed`, which AC-7 does not see.
- Not in this story: maps' fonts and label tidying (ObsidianVaultCompiler),
  Excalidraw, canvas and PDF embeds, the plugin id.

---

## Related tickets

<!-- Fill in once the ticket issues are created. -->
- [#5](https://github.com/JollyOrc/obsidian-webpage-export/issues/5) — core: p-tag step, placeholders, empty targets, preview height (AC-5, AC-7, AC-3/AC-10 rules)
- [#6](https://github.com/JollyOrc/obsidian-webpage-export/issues/6) — render path and runner `exportOptions` (AC-1 to AC-4, AC-6, AC-7, AC-9, AC-10); narrows US-001 AC-14
- [#7](https://github.com/JollyOrc/obsidian-webpage-export/issues/7) — manual check M05 in the working-copy vault (AC-8)
- [#8](https://github.com/JollyOrc/obsidian-webpage-export/issues/8) — amendment 1, core: section wrappers, preview marks, frontmatter choice (AC-11 to AC-14)
- [#9](https://github.com/JollyOrc/obsidian-webpage-export/issues/9) — amendment 1, render path: detached renderer, growth and `maxPreviewHeight` removed, frontmatter scope (AC-1 to AC-4, AC-6, AC-7, AC-9, AC-10, AC-15)
- [#10](https://github.com/JollyOrc/obsidian-webpage-export/issues/10) — amendment 1, manual check M10 (AC-8; replaces M05 for AC-8, #7 closed when M10 passes)
