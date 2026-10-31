/**
 * US-002 AC-11 to AC-14: builds the DOM a render produces from markup that
 * nests blocks in a `<p>` (`<p><span class="markdown-embed"><div>…`).
 *
 * `innerHTML` would close the `<p>` at the first block (HTML parsing rules),
 * a shape `MarkdownRenderer.render` never leaves, since it builds the DOM
 * without parsing. So every `<p>` is parsed as `<x-p>` and then turned into
 * a real `<p>` with the same attributes and children. Returns a `<div>` of
 * `doc` holding the result.
 */
export function domOf(html: string, doc: Document = document): HTMLElement {
	const root = doc.createElement('div');
	root.innerHTML = html.replace(/<p(?=[\s>])/g, '<x-p').replace(/<\/p>/g, '</x-p>');
	for (const x of Array.from(root.querySelectorAll('x-p')).reverse()) {
		const p = doc.createElement('p');
		for (const a of Array.from(x.attributes)) p.setAttribute(a.name, a.value);
		p.append(...Array.from(x.childNodes));
		x.replaceWith(p);
	}
	return root;
}
