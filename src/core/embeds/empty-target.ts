/**
 * US-002 | AC-7 (D6): The text of a note after its frontmatter.
 *
 * Frontmatter is recognised only at the very start: a first line `---` and
 * a later line `---`; everything up to and including that line is removed.
 * A `---` line elsewhere is ordinary text.
 */
function withoutFrontmatter(markdown: string): string {
	const lines = markdown.split('\n');
	if (lines[0]?.trim() !== '---') return markdown;
	const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
	return end < 0 ? markdown : lines.slice(end + 1).join('\n');
}

/**
 * US-002 | AC-7 (D6): The body of the section under `heading`, without the
 * heading line, up to the next heading of the same or a higher level;
 * `null` when no heading has that text.
 */
function sectionBody(markdown: string, heading: string): string | null {
	const lines = markdown.split('\n');
	const start = lines.findIndex((l) => /^#{1,6} /.test(l) && l.replace(/^#{1,6} /, '').trim() === heading);
	if (start < 0) return null;
	const level = (/^(#{1,6}) /.exec(lines[start]) ?? ['', '#'])[1].length;
	let end = lines.length;
	for (let i = start + 1; i < lines.length; i++) {
		const m = /^(#{1,6}) /.exec(lines[i]);
		if (m && m[1].length <= level) {
			end = i;
			break;
		}
	}
	return lines.slice(start + 1, end).join('\n');
}

/**
 * US-002 | AC-7 (D6): Whether an embed's target is genuinely empty.
 *
 * A note is empty when it has no non-whitespace text after its frontmatter;
 * a section (`heading` given) when it has none under its heading line. A
 * heading that does not exist is not "empty": Obsidian then shows its own
 * message, which is content. A note whose only content is a block (even one
 * that fails to draw) is not empty — its source has text.
 */
export function isEmptyTarget(markdown: string, heading?: string): boolean {
	const body = withoutFrontmatter(markdown);
	if (heading === undefined) return body.trim() === '';
	const section = sectionBody(body, heading);
	return section !== null && section.trim() === '';
}
