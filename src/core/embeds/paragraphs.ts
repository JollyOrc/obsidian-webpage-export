/** US-002 AC-5: whether a node is an inline embed (`.inline-embed.markdown-embed`). */
function isInlineEmbed(node: Node): node is Element {
	const el = node as Element;
	return el.nodeType === 1 && el.classList.contains('inline-embed') && el.classList.contains('markdown-embed');
}

/** US-002 AC-5: whether a node is the empty `<p></p>` the HTML parser leaves for a stray `</p>`. */
function isStrayEmptyParagraph(node: Node | null): boolean {
	return node !== null && node.nodeType === 1 && (node as Element).tagName === 'P' && node.childNodes.length === 0;
}

/** US-002 AC-5: block elements the parser never pushes out of a paragraph; the marker search stops at them. */
const PARAGRAPH_END = new Set([
	'P',
	'UL',
	'OL',
	'H1',
	'H2',
	'H3',
	'H4',
	'H5',
	'H6',
	'TABLE',
	'BLOCKQUOTE',
	'PRE',
	'HR',
]);

/**
 * US-002 | AC-5: The stray empty `<p></p>` after `p`, if the paragraph went
 * through the parser: searched among the following siblings, stopping at
 * the first element that ends the paragraph (a non-empty `<p>`, a list, a
 * heading, …) so a later, unrelated empty `<p>` is never taken.
 */
function strayMarkerAfter(p: Element): Node | null {
	for (let n = p.nextSibling; n; n = n.nextSibling) {
		if (isStrayEmptyParagraph(n)) return n;
		if (n.nodeType === 1 && PARAGRAPH_END.has((n as Element).tagName)) return null;
	}
	return null;
}

/**
 * US-002 | AC-5: The block span upstream writes in place of a paragraph that
 * holds an embed (a `<div>` must not be inside a `<p>`).
 */
function blockSpan(doc: Document): HTMLSpanElement {
	const span = doc.createElement('span');
	span.style.display = 'block';
	span.style.marginBlockStart = 'var(--p-spacing)';
	span.style.marginBlockEnd = 'var(--p-spacing)';
	return span;
}

/**
 * US-002 | AC-5 (D3): Replaces every paragraph that holds an inline embed by
 * a block span, keeping each embed's content in that embed.
 *
 * Transforms (SCAR-001), per `<p>` with an inline embed as a direct child:
 * - its children move, unchanged and in order, into a block span that takes
 *   the `<p>`'s place;
 * - only when the paragraph went through the HTML parser — recognised by
 *   the stray empty `<p></p>` the parser leaves among the following siblings
 *   (measured with jsdom: `<p><span a><div>A</div></span><br> <span b>…</span></p>`
 *   → `<p><span a></span></p><div>A</div><br> <span b>…</span><p></p>`) —
 *   the `<div>`s that follow an empty embed go back into that embed; the
 *   inline nodes between them (`<br>`, text, the next embed) move into the
 *   span after it; the stray `<p></p>` is removed;
 * - without that marker nothing else moves, so an embed that is really
 *   empty (F10, F11) never takes in an unrelated `<div>`.
 * Paragraphs without an embed, and paragraphs inside an embed's content,
 * are not touched.
 */
export function unwrapEmbedParagraphs(root: Element): void {
	const doc = root.ownerDocument;
	const paragraphs = Array.from(root.querySelectorAll('p')).filter((p) =>
		Array.from(p.childNodes).some(isInlineEmbed),
	);
	for (const p of paragraphs) {
		const span = blockSpan(doc);
		let target: Element | null = null;
		while (p.firstChild) {
			const child = p.firstChild;
			if (isInlineEmbed(child)) target = child.childNodes.length === 0 ? child : null;
			span.appendChild(child);
		}
		let next = p.nextSibling;
		const marker = strayMarkerAfter(p);
		p.replaceWith(span);
		if (!marker) continue;
		while (next && next !== marker) {
			const node = next;
			next = node.nextSibling;
			if (node.nodeType === 1 && (node as Element).tagName === 'DIV' && target) {
				target.appendChild(node);
				continue;
			}
			if (isInlineEmbed(node)) target = node.childNodes.length === 0 ? node : null;
			else if (node.nodeType !== 3 || (node.textContent ?? '').trim() !== '') target = null;
			span.appendChild(node);
		}
		marker.parentNode?.removeChild(marker);
	}
}
