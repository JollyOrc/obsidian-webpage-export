# Spike — Virtual Linker's glossary links in the export

**Date:** 2026-10-31. **Decision it serves:** US-003 G0 (scope: Virtual
Linker only, user decision 2026-10-31). **Status:** done; read-only
measurements on the working-copy vault and the M10 export
(`~/Desktop/RoA Export`, build `1.9.2-roa.3`, same `main.js` as 1.10.0).

## What the vault uses

- Virtual Linker / Glossary 1.5.2 (`virtual-linker`), settings in its
  `data.json`: `onlyLinkOnce: true`, `includeHeaders: false`,
  `matchBeginningOfWords: true`, `matchEndOfWords: false`,
  `matchAnyPartsOfWords: false`, `excludeLinksToRealLinkedFiles: true`,
  `matchCaseSensitive: false`, `capitalLetterProportionForAutomaticMatchCase:
  0.75`, `tagToMatchCase: linker-match-case`. 42 glossary notes in
  `Rulebook/Detail Bits/Glossary`, none with frontmatter or the match-case
  tag.
- Not used in the vault (G0 of US-003): mermaid blocks, live Dataview
  queries (32 query results are serialized into 16 notes by
  `dataview-serializer` as plain Markdown), `canvas` elements in the export,
  block embeds or links to `#^id` (the 92 `^id`s are element ids in 5
  Excalidraw flowcharts), folded callouts.

## How the plugin decides (read from its `main.js`, 1.5.2)

- A Markdown post-processor adds one `GlossaryLinker` per call. The set of
  already linked files is local to that call: "only link once" holds per
  post-processor call, not per note. The setting's own text says "in the
  same note".
- Order of scanning: the direct text children of every `p`, then of every
  `li`, `td`, `th`, `span`, `em`, `strong` (headings only with
  `includeHeaders`), then of the container. Text directly in other elements
  (`a`, `b`, `code`, `mark`, headings) is never linked. "First" is therefore
  the first in this order, not in reading order.
- Case: names with at least 75 % capital letters match case; other names
  match regardless of case, unless a note's tag says otherwise.

## Measured in the export

- Reading view (preview build, vault copy 2026-10-30): one term linked 27
  times on `1.2 The World We Play In` (once per section). Detached render
  (M10): once.
- M10 export, prose only (title header, embeds, frontmatter removed):
  227 pages with glossary links, 593 links, **0 terms linked twice on a
  page**.
- Links whose term occurs earlier in the page's prose: 52, classified by
  the rules above with a reader checked on a known input (one case per
  class, expected set by hand: OK):
  - 5 — the earlier mention is in a later scanning pass (e.g. `li` before
    a `p`);
  - 10 — the earlier mention is where the plugin never scans (heading,
    `b`, …);
  - **37 — not explained by the rules read.** Examples: on
    `combat-refinement-followup.html` the link "Damage" sits in an `em` of
    a list item; earlier, "damage)" stands in an `em` of an earlier list
    item (same pass, case-insensitive name). On `combat-refinement.html`
    "Armour" is linked in an `li`; "armour" occurs earlier in a `p`.

## Not measured

- What the app's reading view shows for these cases on the desktop (the
  reading view scans per section; measured once: 27 links for one term on
  one page).
- Why the plugin matches case-sensitively although its code reads
  otherwise (plugin-internal).
- *(The post-processor calls and the 37 open cases of the section above
  were measured afterwards; see the addendum.)*

## Addendum — instrumented runs (2026-10-31)

Two headless exports of the scratch vault copy (build `1.9.2-roa.3`) with
logging added to Virtual Linker's post-processor in the copy only (backup
with checksums, restored and verified after each run; the working-copy
vault untouched):

- **Calls.** In the detached render the post-processor is called once on
  the whole off-screen element (`DIV.markdown-preview-view`, all blocks of
  the note, e.g. 45 children). The many further calls per section
  (`DIV.el-p`, not attached) are Obsidian's reading view of the same note,
  which the export no longer copies; the file tree and tables call it too.
  So the exported page carries one scan over the whole note: "only link
  once" per note, as the setting describes.
- **Case.** In this vault the plugin finds only the written case of a name:
  "armour", "successes", "damage", "grit" are never candidates for
  `Armour`, `Success`, `Damage`, `Grit` (logged `found=` lists). The code
  read (`isUpperCaseString`, 0.75) would make these names case-insensitive;
  why it does not is *not established* (inside the plugin, not the export).
- **All earlier mentions explained** (reader re-checked on a known input
  with one case per class, OK; word beginnings matched as the vault's
  `matchBeginningOfWords: true`): 74 links with an earlier mention of their
  term — 47 written in another case, 17 where the plugin never scans
  (headings, bold, code, …), 10 in a later scanning pass (`li`, `td` before
  `p`); **0 unexplained**.

## Conclusion

The export shows Virtual Linker's own result for a whole note: each term
linked at most once per page (0 repeats on 227 pages), at the first
mention in the plugin's own sense (written case, scanning order, scanned
contexts). Nothing found is caused by the exporter. A different glossary
behaviour (e.g. case-insensitive, reading order) would mean changing the
plugin's settings or the plugin itself, not the export.

**Outcome:** US-003 dropped (user decision 2026-10-31); this spike is the
record.
