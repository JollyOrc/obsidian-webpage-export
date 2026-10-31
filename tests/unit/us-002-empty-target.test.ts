import { describe, expect, it } from 'vitest';
import { isEmptyTarget } from '../../src/core/embeds/empty-target';

// US-002 AC-7 / D6: a target is genuinely empty when it has no text after its
// frontmatter (note) or under its heading (section).

describe('US-002 AC-7 / D6: genuinely empty targets', () => {
	it('US-002 AC-7: an empty file and a whitespace-only file are empty', () => {
		expect(isEmptyTarget('')).toBe(true);
		expect(isEmptyTarget('\n  \n\t\n')).toBe(true);
	});
	it('US-002 AC-7: frontmatter only is empty', () => {
		expect(isEmptyTarget('---\ntags: probe\n---\n')).toBe(true);
	});
	it('US-002 AC-7: frontmatter and text is not empty', () => {
		expect(isEmptyTarget('---\na: b\n---\nFX-TEXT\n')).toBe(false);
	});
	it('US-002 AC-7: a note with only a failing block is not empty (F10: the source has text)', () => {
		expect(isEmptyTarget('```text-mapper\ninclude no-such-file.txt\n```\n')).toBe(false);
	});
	it('US-002 AC-7: a section with text under its heading is not empty; one without is', () => {
		const note = '# T\n\n## Full\n\ntext\n\n## Hollow\n\n## Next\n\nmore\n';
		expect(isEmptyTarget(note, 'Full')).toBe(false);
		expect(isEmptyTarget(note, 'Hollow')).toBe(true);
	});
	it('US-002 AC-7: a missing heading is not "empty" (Obsidian shows its own message)', () => {
		expect(isEmptyTarget('# T\n\ntext\n', 'Nowhere')).toBe(false);
	});
	it('US-002 AC-7: a "---" line later in the text is not frontmatter', () => {
		expect(isEmptyTarget('text\n---\nmore\n')).toBe(false);
	});
});
