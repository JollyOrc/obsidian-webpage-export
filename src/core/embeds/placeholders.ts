/** US-002 AC-7: one embed that was replaced by a placeholder. */
export interface EmbedWarning {
	note: string;
	target: string;
	message: string;
}

/** US-002 AC-7: the class of the placeholder element. */
export const PLACEHOLDER_CLASS = 'owe-export-placeholder';

/**
 * US-002 | AC-6, AC-7 (D2): Whether an embed shows nothing.
 *
 * Empty when it has no direct `.markdown-embed-content` child, or that child
 * has no text (after trimming), no `<svg>` and no `<img>`. The one definition
 * of "empty" for the placeholders (AC-7) and the fallback's wait (AC-6).
 */
export function isEmptyEmbed(embed: Element): boolean {
	const content = Array.from(embed.children).find((c) => c.classList.contains('markdown-embed-content'));
	if (!content) return true;
	if ((content.textContent ?? '').trim() !== '') return false;
	return content.querySelector('svg, img') === null;
}

/**
 * US-002 | AC-7 (D2, D6): Puts a visible placeholder into every embed of
 * `root` that is still empty, unless its target is genuinely empty.
 *
 * Embeds are `.markdown-embed` elements (Obsidian's "not created yet" span
 * is not one). They are handled innermost first, so a placeholder in a
 * nested embed makes its outer embed non-empty. The target is the embed's
 * `src` attribute (else `alt`, else empty); `isTargetEmpty(target)` decides
 * D6. The placeholder `<div class="owe-export-placeholder">` becomes the
 * embed's only child — inside the embed, so no `<div>` lands in a `<p>`
 * (AC-4); its text is set as text, so `<` and `&` stay literal. Returns one
 * warning per placeholder, in document order.
 */
export function markUnexportedEmbeds(
	root: Element,
	note: string,
	isTargetEmpty: (target: string) => boolean,
): EmbedWarning[] {
	const doc = root.ownerDocument;
	const warnings: EmbedWarning[] = [];
	const embeds = Array.from(root.querySelectorAll('.markdown-embed')).reverse();
	for (const embed of embeds) {
		if (!isEmptyEmbed(embed)) continue;
		const target = embed.getAttribute('src') ?? embed.getAttribute('alt') ?? '';
		if (isTargetEmpty(target)) continue;
		const placeholder = doc.createElement('div');
		placeholder.className = PLACEHOLDER_CLASS;
		placeholder.textContent = `Embedded content could not be exported: ${target}`;
		embed.replaceChildren(placeholder);
		warnings.push({ note, target, message: `Embed not exported: ${note} → ${target}` });
	}
	return warnings.reverse();
}
