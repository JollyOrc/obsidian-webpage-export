/**
 * US-002 | AC-14: The page's own frontmatter: the first `.frontmatter` in
 * `root` that is not inside a `.markdown-embed`, or `null`.
 *
 * Upstream's step moves this element before the sizer and removes its
 * parent wrapper. Unrestricted, it took the first `.frontmatter` anywhere,
 * which in the detached output is often an embedded note's, and removed the
 * embed's whole content (measured: 4 of 4 such embeds in the vault).
 */
export function pageFrontmatter(root: Element): Element | null {
	return Array.from(root.querySelectorAll('.frontmatter')).find((f) => f.closest('.markdown-embed') === null) ?? null;
}

/**
 * US-002 | AC-14 (D10): Removes every `.frontmatter` element inside a
 * `.markdown-embed` of `root`, at any depth, and returns how many.
 *
 * Only the `.frontmatter` element itself is removed; its wrapper (an
 * `el-pre` on the reading-view path) and the rest of the embed stay. The
 * page's own frontmatter is not touched.
 */
export function removeEmbedFrontmatter(root: Element): number {
	const embedded = Array.from(root.querySelectorAll('.markdown-embed .frontmatter'));
	for (const f of embedded) f.remove();
	return embedded.length;
}
