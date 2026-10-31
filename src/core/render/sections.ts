/**
 * US-002 | AC-11: Copies each top-level node of a detached render into
 * `sizer`, inside its own section wrapper, as the reading view writes its
 * sections.
 *
 * Transforms (SCAR-001), in source order: an element becomes the only child
 * of a new `<div class="el-<tag>">` (`<tag>` its lower-case tag name); a text
 * node with only whitespace is dropped; any other text node goes into
 * `<div class="el-p">`; other nodes (comments) are dropped. Nodes are copied
 * with `cloneNode(true)`, never moved or re-parsed, so `source` keeps its
 * children and each embed keeps its content (AC-2, AC-4). Content inside a
 * node (embeds included) is not wrapped. The wrappers are appended after the
 * children `sizer` already has (title header, pusher). Returns the number of
 * wrappers written.
 */
export function wrapSections(source: Node, sizer: Element): number {
	const doc = sizer.ownerDocument;
	let count = 0;
	for (const node of Array.from(source.childNodes)) {
		let tag: string;
		if (node.nodeType === node.ELEMENT_NODE) {
			tag = (node as Element).tagName.toLowerCase();
		} else if (node.nodeType === node.TEXT_NODE && (node.textContent ?? '').trim() !== '') {
			tag = 'p';
		} else {
			continue;
		}
		const wrapper = doc.createElement('div');
		wrapper.className = `el-${tag}`;
		wrapper.appendChild(node.cloneNode(true));
		sizer.appendChild(wrapper);
		count++;
	}
	return count;
}
