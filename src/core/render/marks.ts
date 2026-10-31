/**
 * US-002 AC-12, AC-13: what an embed's `#subpath` resolves to, as the
 * plugin's resolver reports it (Obsidian's `resolveSubpath`, injected; the
 * core does not import Obsidian).
 *
 * `heading`: the subpath names a heading of the target. `missing`: the
 * target exists and the heading does not (`heading` is the subpath as
 * written, `target` the target note's name). `none`: no subpath, a block
 * subpath (`#^id`), or an unknown target — the embed stays as written.
 */
export type SubpathKind = { kind: 'heading' } | { kind: 'missing'; heading: string; target: string } | { kind: 'none' };

/** US-002 AC-12, AC-13: how many marks one call of `addPreviewMarks` wrote. */
export interface MarkCounts {
	arrows: number;
	links: number;
	headingType: number;
	unable: number;
}

/** US-002 AC-12: the reading view's heading arrow (copied from its output). */
export const HEADING_ARROW_SVG =
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle"><path d="M3 8L12 17L21 8"></path></svg>';

/** US-002 AC-12: the reading view's "Open link" icon of an embed (copied from its output). */
export const EMBED_LINK_SVG =
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-maximize-2"><path d="M15 3h6v6"></path><path d="m21 3-7 7"></path><path d="m3 21 7-7"></path><path d="M9 21H3v-6"></path></svg>';

const HEADINGS = 'h1, h2, h3, h4, h5, h6';

/**
 * US-002 | AC-12, AC-13: Writes into a detached render the marks the reading
 * view writes and `MarkdownRenderer.render` does not (measured: none of them
 * in 364 notes).
 *
 * Transforms (SCAR-001), in this order:
 * 1. For each `.markdown-embed` in document order, `resolve(src)` is called
 *    with its `src` attribute as written. `heading` → `data-type="heading"`.
 *    `missing` → the embed's direct `.markdown-embed-content` (created when
 *    absent) gets as only content
 *    `<div class="markdown-preview-view markdown-rendered"><h5 data-heading="T" dir="auto">T</h5></div>`,
 *    `T` = `Unable to find “<heading>” in <target>`, set as text (AC-13;
 *    the render alone writes the whole target note there). Embeds removed by
 *    an earlier replacement are skipped.
 * 2. Every `.markdown-embed` without a direct `.markdown-embed-link` gets
 *    `<div class="markdown-embed-link" aria-label="Open link">` with
 *    `EMBED_LINK_SVG` as last child. Image and other embeds are not
 *    `.markdown-embed` and get none.
 * 3. Every `h1`–`h6` whose parent is `root` or a `.markdown-preview-view`
 *    (a block of the note or of an embed, including the `h5` of step 1) and
 *    that has no direct arrow gets
 *    `<span class="heading-collapse-indicator collapse-indicator collapse-icon">`
 *    with `HEADING_ARROW_SVG` as first child. Headings inside callouts,
 *    lists or tables get none.
 * Calling it twice writes nothing the second time. Returns the counts.
 */
export function addPreviewMarks(root: Element, resolve: (src: string) => SubpathKind): MarkCounts {
	const doc = root.ownerDocument;
	const counts: MarkCounts = { arrows: 0, links: 0, headingType: 0, unable: 0 };

	for (const embed of Array.from(root.querySelectorAll('.markdown-embed'))) {
		if (!root.contains(embed)) continue;
		const kind = resolve(embed.getAttribute('src') ?? '');
		if (kind.kind === 'heading') {
			embed.setAttribute('data-type', 'heading');
			counts.headingType++;
		} else if (kind.kind === 'missing') {
			let content = embed.querySelector(':scope > .markdown-embed-content');
			if (!content) {
				content = doc.createElement('div');
				content.className = 'markdown-embed-content';
				embed.appendChild(content);
			}
			const text = `Unable to find “${kind.heading}” in ${kind.target}`;
			const view = doc.createElement('div');
			view.className = 'markdown-preview-view markdown-rendered';
			const h5 = doc.createElement('h5');
			h5.setAttribute('data-heading', text);
			h5.setAttribute('dir', 'auto');
			h5.textContent = text;
			view.appendChild(h5);
			content.replaceChildren(view);
			counts.unable++;
		}
	}

	for (const embed of Array.from(root.querySelectorAll('.markdown-embed'))) {
		if (embed.querySelector(':scope > .markdown-embed-link')) continue;
		const link = doc.createElement('div');
		link.className = 'markdown-embed-link';
		link.setAttribute('aria-label', 'Open link');
		link.innerHTML = EMBED_LINK_SVG;
		embed.appendChild(link);
		counts.links++;
	}

	for (const heading of Array.from(root.querySelectorAll(HEADINGS))) {
		const parent = heading.parentElement;
		const isSection = parent === root || (parent?.classList.contains('markdown-preview-view') ?? false);
		if (!isSection || heading.querySelector(':scope > .heading-collapse-indicator')) continue;
		const indicator = doc.createElement('span');
		indicator.className = 'heading-collapse-indicator collapse-indicator collapse-icon';
		indicator.innerHTML = HEADING_ARROW_SVG;
		heading.prepend(indicator);
		counts.arrows++;
	}
	return counts;
}

/**
 * US-002 | AC-12: The class of the page root: `obsidian-document` followed
 * by the reading view's class list for the note (as upstream's main path).
 *
 * Leading and trailing whitespace of the list is dropped; an empty list
 * gives `obsidian-document` alone.
 */
export function documentClass(previewClass: string): string {
	return `obsidian-document ${previewClass.trim()}`.trim();
}
