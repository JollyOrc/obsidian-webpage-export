# Spike — Why notes with embeds export incompletely, and what fixes it

**Date:** 2026-10-30. **Decision it serves:** US-002 G0 (4): measure the
causes and two or three fix alternatives before the story is written.
**Status:** done. Results are measured unless marked *not measured*.

## Set-up

- Scratch worktree of `us-001-tooling` (`881a213`) with instrumentation in
  `src/plugin/render-api/render-api.ts`, switched by `SPIKE_MODE` (passed
  into the container); nothing of it is committed.
- US-001 harness: image `owe:881a213-dirty` with the instrumented build,
  Obsidian 1.14.5, the fixture vault (20 notes), runs on a temporary copy.
- Completeness oracle (spike code): from the fixture's Markdown alone, the
  tokens each page must contain: its sentinels and map labels plus those of
  every note, heading or Meta Bind snippet it embeds, recursively. Checked
  by hand against the fixture (e.g. `Big Page.md` 102 tokens: 6 `FX-LONG`
  sentinels and 96 map labels; `Wikilink Embed.md` 7). Pages read with
  `tests/support/html-reader.ts` (text inside `<svg>` included).

## Finding 1 — the main renderer draws only what is near the visible area

- The headless window is 500 px high (`window.innerHeight`); the preview
  area 463 to 842 px.
- Every fixture note except `Big Page.md` has all sections in the sizer
  (`children = sections + 1`, the pusher). `Big Page.md`: 15 sections,
  7 828 px of content, 10 children → upstream's wait
  (`sizerEl.children.length >= sections.length`) times out and the fallback
  runs. `Long Note.md` fell back in some runs.
- Scrolling while waiting makes it worse: 4 children at the end (sections
  scrolled past are removed again), fallback 3/3.
- A preview made 200 000 px high (`containerEl`, `previewEl`) has all 16
  children at once: no fallback in 3/3 runs.

## Finding 2 — the embed loss is in upstream's post-processing, not the fallback

- In the fallback, all 8 heading embeds of `Big Page.md` hold their content
  before the copy, after it and when the function returns (sentinel present,
  about 3 kB each).
- `postProcessHTML` (`render-api.ts`, "transclusions put a div inside a p
  tag"): for each `<p>` with an inline embed it copies the `<p>` into a
  span, removes the `<p>`, and sets the **first** embed's content to the
  parent's remaining HTML. Measured on `Big Page.md` (8 paragraphs with two
  embeds each): filled embeds 16 before the step, 8 after — the first embed
  of each paragraph is emptied.
- Why the step exists: the main path copies the page with
  `newSizerEl.innerHTML = sizerEl.innerHTML`; the HTML parser moves the
  embed's `<div>` content out of the `<p>`. Measured: single-embed pages
  have 0 filled embeds before the step and 1 after. The fallback copies DOM
  nodes (`cloneNode`), so the content is still inside, and the step
  overwrites it.
- On the main path with two embeds in one paragraph the step puts all moved
  content into the first embed: text complete, but each heading embed then
  contains the following map embed (8 of 8 nested).
- The author's vault: `1.4.3 Magic Skills.md` pairs a heading embed and a
  note embed per paragraph. The M04 export (fallback) lacks the text of all
  four `1.3.2 Magic` sections checked (Body Magic, Cantrips, Curses,
  Wizardry). The export of 2026-08-18 (`~/Downloads/RoA Export`) has these
  sections but no spell text ("Fireball" absent); *cause not established*
  (the vault changed since).

## Alternatives measured (3 runs each, Obsidian 1.14.5)

| Mode | Change | Fallback | Complete runs | Heading embeds holding their own content | Map embed nested in heading embed | `<div>` in `<p>` | 3 runs |
|------|--------|----------|---------------|---------------|---------------|------|-----|
| base | upstream | `Big Page` 3/3 | 0/3 (6 tokens missing) | 0/8 | 0 | 0 | 41 s |
| scroll | scroll while waiting | `Big Page` 3/3 | 0/3 | — | — | — | 41 s |
| A1 tall | preview 200 000 px high | 0/3 | 3/3 | 8/8 | 8 | 0 | 29 s |
| A2 pfix | step keeps embeds that already hold content | `Big Page` 3/3 | 3/3 | 8/8 | 0 | — | 41 s |
| A1 + A2 | both | 0/3 | 3/3 | 8/8 | 8 | — | 29 s |
| **A3** | tall + copy DOM nodes instead of `innerHTML` + A2's step | 0/3 | 3/3 | 8/8 | 0 | 0 | 28 s |

"Complete" = every expected token of every one of the 20 pages present.
`<div>` in `<p>` counted with a real HTML parser (checked on a known input;
a first regex count was wrong because `<p` matched `<path`).

## Conclusions

- A3 is the only measured alternative that is complete, keeps each embed's
  content in its own embed, and never enters the fallback renderer — where
  the freezes of M01 and M03 happened.
- A2 alone repairs the loss but keeps the fallback (and its freeze risk).

## Not measured

- The freeze: not reproduced in Docker (base runs finished). Whether A3
  avoids it in the author's vault is to be shown there (manual check).
- Notes taller than the preview height chosen (200 000 px); the tallest
  fixture note is 7 828 px. Notes of the author's vault not measured.
- Pages with three or more embeds in a paragraph, block embeds, embeds of
  canvas or PDF; A3's effect on upstream features that rely on the
  `innerHTML` copy (e.g. event listeners, `input` values).
- The cause of the missing spell text in the August export.

## Addendum — D1 "grow until complete" (2026-10-30)

| Mode | Change | Fallback | Complete runs | Heading embeds own content / nested | `<div>` in `<p>` | 3 runs |
|------|--------|----------|---------------|------|------|-----|
| grow | double the preview height while sections are missing (300 ms waits), no re-render; then A3's copy and step | `Big Page` 3/3 | 3/3 (by the repaired step) | — | — | 52 s |
| grow-rerender | as grow, plus `preview.rerender(true)` after each doubling | 0/3 | 3/3 | 8/8 / 0 | 0 | 44 s |

- Without a re-render, `Big Page.md` stayed at 10 of 15 sections up to
  1 724 416–1 987 584 px (8–11 doublings): the height must be set before the
  render.
- With a re-render: 2 doublings to 3 368 px, 15 of 15, about 4.8 s for that
  note; every other note 0 doublings. The style height stays on the reused
  preview for the following notes unless reset (seen: `Long Note.md` at
  3 368 px).

## Addendum — ticket #6 measurements (2026-10-30)

- The embed's `src` at `postProcessHTML` is the link as written, URL-decoded:
  `Broken Map`, `Long Note#Section Three`, `../Long Note.md#Section One`.
- A `data.json` with only `{"exportOptions": {"useFallbackRenderer": true}}`
  written into the vault copy (with the plugin files beside it) is read and
  merged: all 13 logged notes went through the fallback, none through the
  main path.
- F10 is not an export failure: with upstream's p-tag step out of the way,
  the embed holds Text Mapper's `<svg>` (symbol definitions, no hexes), as
  Obsidian shows it; by D2 that is content. The empty `<span>` measured at
  G2 was made by upstream's p-tag step, which overwrote the embed with the
  parent's empty remainder (a placeholder set in `postProcessHTML` was gone
  after `renderDocument` for the same reason).
- Forced fallback (`useFallbackRenderer: true`), 1 run: ordinary notes lose
  their embeds — the fallback copies before embedded notes have loaded
  (Wikilink Embed, Heading Embed: embeds empty before the copy).
- Forced fallback with a wait until every embed has content (D2 rule, poll
  50 ms, limit 3 000 ms), 3 runs: all pages complete in 3/3; waits 50–55 ms.
  A first try of this measurement was invalid (a spike condition also
  switched on a test probe that replaced embed contents) and was repeated.

## Addendum — A4: detached renderer (2026-10-30)

Spike (scratch copy, never committed): each note's Markdown rendered with
Obsidian's `MarkdownRenderer.render` into an off-screen element (absolute,
left −100 000 px, 900 px wide), waiting until every embed and plugin block
has content (poll 50 ms, ≤ 5 s), then copied into the sizer.

- Fixture, 3 runs: all 24 pages complete (oracle), no `<div>` in `<p>`, no
  fallback; `Big Page.md` 0.2–0.28 s (growth: ~4.8 s). Heading embeds hold
  their own section and no map embed; the renderer does not set
  `data-type="heading"` and writes other heading ids (`#Section_One_1`).
- Vault copy (all 18 plugins), 2 runs with the spike build in the copy's
  plugin folder: 364 notes rendered detached, none still pending; AC-8
  content present (four `1.3.2` sentences, `Fireball`, 8 map blocks,
  Wizardry map, Edge Dice); export 40–41 s (preview build: 108–121 s);
  errors the same pre-existing ones (`Rulebook/wc`, a log message).
- A first vault-copy run of this spike measured the wrong build (the copy's
  own installed plugin; `detached=0`) and was repeated (SCAR-012).
- Not measured: whether the preview's other output is still produced
  (section wrappers `el-*`, heading folding, outline, Dataview queries,
  callout folding, properties) — users to list before a story builds on it
  (SCAR-027); the desktop freeze (M08).

## Addendum — A4 against the preview's outputs (US-002 amendment G0, 2026-10-30)

Desktop: M09 passed (no freeze, 331/331 notes detached, 30.9 s). Then the
outputs downstream code reads were counted page by page, preview build (#6)
against the spike with section wrappers: fixture (27 pages, one run each)
and the vault copy (537 pages, runs of 18:24 and 21:13), with jsdom.

| Output | Read by | Fixture preview / detached | Vault preview / detached |
|--------|---------|---------------|---------------|
| `.heading-collapse-indicator` | frontend heading folding (`headers.ts`) | 21 / 0 | 1 457 / 0 |
| `data-type="heading"` on heading embeds | US-002 AC-2 test | 10 / 0 | 24 / 0 |
| `.markdown-embed-link` icon | page look | — | 55 / 0 |
| section wrappers inside embeds | search text line breaks (`webpage.ts`) | 73 / 0 | — |
| root classes `show-indentation-guide show-properties` | site CSS | — | 364 / 0 pages |
| `a.internal-link` (Virtual Linker glossary links) | site navigation | — | 3 866 / 2 784 |
| embeds with empty content | AC-1, AC-7 | 0 / 0 | 0 / 4 |
| headings, `data-heading`, list collapse, tables, tasks, tags, text-mapper, Leaflet, Excalidraw, Meta Bind, titles | outline, pages | equal | equal except the pages below |

- **Embeds emptied (detached only, 4):** `Dodge`, `Giant Toad`,
  `Battlefield Controller`, `Ice Crystal` — each embedded note has
  frontmatter. Upstream's frontmatter step takes the first `.frontmatter` of
  the page, wherever it is, moves it before the sizer and removes its
  parent; inside a detached embed the parent is the embed's whole content.
  No placeholder, because the placeholder step runs before. In the preview
  the parent is the embed's `el-pre` wrapper. In **both** builds the page
  then shows the embedded note's properties at its top (upstream bug).
- **Glossary links:** Virtual Linker links every occurrence in the preview
  (`Kari` 27 times on `1.2 The World We Play In`), detached a few (3 links
  on that page). *Cause not measured.*
- **Embed of a missing heading** (`1.3.1 Combat#Combat and Critical
  Failures`): preview shows Obsidian's "Unable to find …" (61 characters),
  detached embeds the whole note (16 926 characters).
- Not exercised by either input: folded callouts, Dataview queries,
  mermaid, canvas elements, `cssclasses` (none found in the vault).
- The whole-vault first-words check of the previous addendum found none of
  these (SCAR-015): it compares first words, not structure or embeds.

## Addendum — causes of the G0 differences (2026-10-30)

Probe build of the A4 spike (scratch, never committed): after the detached
render it logs what the render itself wrote, renders each note a second
time into a host carrying the preview's classes, and logs the empty embeds
before and after upstream's frontmatter step. Runs: the spike's fixture copy
with two new notes (`Embeds/Front Embed.md` embeds `Plain/Front Note.md`;
`Embeds/Missing Heading Embed.md` embeds `Long Note#No Such Heading`), and
the vault copy (364 notes, the probe build in the copy's plugin folder).

- **Emptied embeds — measured.** The frontmatter step's parent is the
  embed's `markdown-preview-view` (it holds the embed's content) in
  `Front Embed.md` and in exactly the 4 vault notes of the previous addendum;
  empty embeds 0 before the step, 1 after, in each. Of 221 frontmatter steps
  in the vault, these 4 are the only ones whose parent is inside an embed.
  For a page's own frontmatter the parent is the section wrapper `el-pre`.
- **Missing heading — Obsidian's render.** `MarkdownRenderer.render` itself
  writes the whole target note into an embed whose heading does not resolve
  (`resolveSubpath` returns none): fixture 2 706 characters (all of
  `Long Note`), vault 16 926 (`1.3.1 Combat#Combat and Critical
  Failures`); no "Unable to find" text. The preview writes Obsidian's
  "Unable to find …" there (vault, previous addendum; fixture preview not
  run with the new note).
- **No heading-folding arrows — Obsidian's render.** The render writes no
  `.heading-collapse-indicator`: 0 in the fixture and 0 in 364 vault notes,
  before any copy or post-processing, also when the host carries the
  preview's classes (`allow-fold-headings` …). The preview's reading view
  adds them.
- **No embed link icon, no `data-type="heading"` — Obsidian's render.** No
  embed written by the render has `.markdown-embed-link` or a `data-type`
  (fixture and vault, both hosts).
- **Missing page classes — the spike's code.** The preview's class list at
  render time is `markdown-preview-view markdown-rendered node-insert-event
  is-readable-line-width allow-fold-headings allow-fold-lists
  show-indentation-guide show-properties` for every note; the spike sets a
  fixed `obsidian-document markdown-preview-view markdown-rendered` instead
  of upstream's `obsidian-document` + that list.
- Seen in passing: `Grit and Conditions test results.md` embeds
  `../Rulebook/03.1 Combat.md#Armour`, a file that does not exist; Obsidian
  writes an empty `file-embed mod-empty-attachment` (not a `markdown-embed`,
  so AC-7's rule does not see it). Not compared with the preview.
- Not measured: whether the preview adds the arrows, icon and `data-type`
  in its own code or through a post-processor that could be called on the
  detached output.

## Addendum — fixes for the G0 differences (2026-10-30)

Fix spike (scratch `a4`, never committed), applied to the detached render
before the copy, and to upstream's frontmatter step:

1. Frontmatter step: takes the first `.frontmatter` that is **not** inside
   a `.markdown-embed`; an embedded note's frontmatter stays in its embed.
2. Embed whose `#heading` does not resolve (`resolveSubpath`): its content
   is replaced by the preview's `h5` "Unable to find “<heading>” in <note>"
   (no warning, as the preview).
3. As the preview writes them: `span.heading-collapse-indicator` (arrow
   SVG) as the first child of every heading that is a section of the note or
   of an embed; `div.markdown-embed-link` ("Open link", maximize SVG) as the
   last child of every `.markdown-embed`; `data-type="heading"` on embeds
   whose subpath resolves to a heading. Rules measured on the preview's
   vault output first: headings in a section 1 457/1 457 with an arrow,
   page titles and 3 headings outside a section 0; the 2 embeds whose
   heading does not resolve have no `data-type`.
4. Page root: `obsidian-document` + the preview's class list (as upstream).

Measured (one run each; preview = #6 build; jsdom):

| Output | Fixture preview / spike / fixed | Vault preview / spike / fixed |
|--------|------|------|
| empty embeds | 1 / 2 / 1 (F11, by design) | 0 / 4 / 0 |
| "Unable to find" embeds | 1 / 0 / 1 | 1 / 0 / 1 |
| heading arrows | 23 / 0 / 23 | 1 457 / 0 / 1 458 |
| embed link icons | 28 / 0 / 28 | 55 / 0 / 56 |
| `data-type="heading"` | 10 / 0 / 10 | 24 / 0 / 25 |
| headings | 50 / 55 / 50 | 1 824 / 1 847 / 1 824 |
| page class list equal to preview | — / 0 / 27 of 27 | — / 0 / 364 of 364 |

- The one extra arrow, icon and `data-type` (vault) are the `Edge Dice`
  heading embed on `flowcharts.html`: the preview wrote that embed in the
  render's simple structure without them; where it comes from (not in
  `Flowcharts.md`'s own embeds) is not traced.
- Frontmatter: on the 4 pages with an embedded frontmatter note the
  embedded properties now stay inside the embed instead of moving to the
  page top (upstream bug, both builds before); the 7 that the preview left
  in embeds stay too.
- Page text, whitespace and Virtual Linker's `🔗` suffix ignored: identical
  to the preview on every page checked (`all-skills`, `1.2`, `1.3.1`,
  `raiders-of-arismyth`, fixture `big-page`). The remaining raw text
  differences are whitespace between blocks and the `onlyLinkOnce` suffixes
  (`1.2`: 40 fewer links × `🔗`).
- Not measured: the look on the desktop (manual check), Virtual Linker per
  term (first mention only), a missing `#^block` embed, folded callouts,
  Dataview queries.
