import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { expectedTokens } from '../support/expected-tokens';
import { divsInsideParagraphs, embedsOf } from '../support/page-structure';

// US-002 AC-1, AC-2, AC-4: the readers the integration tests rely on, one
// test per rule on hand-written input (SCAR-028).

let vault = '';
const write = (rel: string, text: string): void => {
	mkdirSync(dirname(join(vault, rel)), { recursive: true });
	writeFileSync(join(vault, rel), text);
};

beforeAll(() => {
	vault = mkdtempSync(join(tmpdir(), 'us002-oracle-'));
	write('A.md', 'FX-A\n\n```text-mapper\n0101 grass "Alpha"\n0102 grass "Two Words"\n```\n');
	write('Long.md', '# Long\n\n## One\n\nFX-ONE\n\n### Sub\n\nFX-SUB\n\n## Two\n\nFX-TWO\n');
	write('Wiki.md', 'FX-WIKI ![[A]]\n');
	write('Link.md', 'FX-LINK ![x](../Folder%20X/Deep%20Note.md)\n');
	write('Folder X/Deep Note.md', 'FX-DEEP\n');
	write('Head.md', '![[Long#One]] ![y](Long.md#Two)\n');
	write('HeadOne.md', '![[Long#One]]\n');
	write('Meta.md', '```meta-bind-embed\n[[A]]\n```\n');
	write('Chain.md', '![[Wiki]]\n');
	write('Missing.md', 'FX-MISS ![[Nowhere]]\n');
	write('Loop.md', 'FX-LOOP ![[Loop]]\n');
	write('.obsidian/Hidden.md', 'FX-HIDDEN\n');
});
afterAll(() => rmSync(vault, { recursive: true, force: true }));

describe('US-002 AC-1: expected tokens (oracle)', () => {
	it('US-002 AC-1: own sentinels and map labels, labels with spaces kept whole', () => {
		expect(expectedTokens(vault)['A.md']).toEqual(['FX-A', 'Alpha', 'Two Words']);
	});
	it('US-002 AC-1: a wikilink embed adds the target tokens', () => {
		expect(expectedTokens(vault)['Wiki.md']).toEqual(['FX-WIKI', 'FX-A', 'Alpha', 'Two Words']);
	});
	it('US-002 AC-1: a markdown-link embed is URL-decoded and resolved by file name', () => {
		expect(expectedTokens(vault)['Link.md']).toEqual(['FX-LINK', 'FX-DEEP']);
	});
	it('US-002 AC-1: a heading embed adds its section only, sub-headings included, next same-level section not', () => {
		expect(expectedTokens(vault)['Head.md']).toEqual(['FX-ONE', 'FX-SUB', 'FX-TWO']);
		expect(expectedTokens(vault)['Head.md']).toHaveLength(3);
	});
	it('US-002 AC-1: a heading embed stops at the next heading of the same level (FX-TWO not in #One)', () => {
		// Added after a mutation survived: Head.md embeds #One and #Two, so a
		// section running to the end gave the same de-duplicated tokens.
		expect(expectedTokens(vault)['HeadOne.md']).toEqual(['FX-ONE', 'FX-SUB']);
	});
	it('US-002 AC-1: a meta-bind-embed block adds the embedded note', () => {
		expect(expectedTokens(vault)['Meta.md']).toEqual(['FX-A', 'Alpha', 'Two Words']);
	});
	it('US-002 AC-1: embeds are followed recursively (depth 2)', () => {
		expect(expectedTokens(vault)['Chain.md']).toEqual(['FX-WIKI', 'FX-A', 'Alpha', 'Two Words']);
	});
	it('US-002 AC-1: an unknown target adds nothing', () => {
		expect(expectedTokens(vault)['Missing.md']).toEqual(['FX-MISS']);
	});
	it('US-002 AC-1: a self-embed ends at the depth limit and is de-duplicated', () => {
		expect(expectedTokens(vault)['Loop.md']).toEqual(['FX-LOOP']);
	});
	it('US-002 AC-1: hidden folders are not notes', () => {
		expect(Object.keys(expectedTokens(vault))).not.toContain('.obsidian/Hidden.md');
	});
});

describe('US-002 AC-2: embeds of a page', () => {
	const embed = (alt: string, inner: string, type = ''): string =>
		`<span class="internal-embed markdown-embed inline-embed" alt="${alt}"${type ? ` data-type="${type}"` : ''}><div class="markdown-embed-content">${inner}</div></span>`;

	it('US-002 AC-2: alt, type and text per embed, in document order; svg text included; scripts not', () => {
		const html = `<html><body><span class="el-p">${embed('Section One', '<p>FX-LONG-1</p>', 'heading')}<br>${embed('Map 1', '<svg><text>Alpha</text></svg>')}</span><script>var x = "FX-NOT";</script></body></html>`;
		expect(embedsOf(html)).toEqual([
			{ alt: 'Section One', type: 'heading', text: 'FX-LONG-1', nested: [] },
			{ alt: 'Map 1', type: '', text: 'Alpha', nested: [] },
		]);
	});
	it('US-002 AC-2: nested embeds are listed under their parent and also on their own', () => {
		const html = `<body>${embed('Outer', `<p>FX-OUT</p>${embed('Inner', '<p>FX-IN</p>')}`)}</body>`;
		const e = embedsOf(html);
		expect(e.map((x) => x.alt)).toEqual(['Outer', 'Inner']);
		expect(e[0].nested).toEqual(['Inner']);
		expect(e[0].text).toContain('FX-IN');
	});
});

describe('US-002 AC-4: <div> inside <p>, counted in the raw markup', () => {
	it('US-002 AC-4: a div written inside an open p counts', () => {
		expect(divsInsideParagraphs('<p>a<div>b</div></p>')).toBe(1);
	});
	it('US-002 AC-4: <path> and <param> are not <p>', () => {
		expect(
			divsInsideParagraphs('<svg><path d="x"/></svg><div></div><object><param name="a"><div></div></object>'),
		).toBe(0);
	});
	it('US-002 AC-4: a closed p does not count, a p inside a div does not count', () => {
		expect(divsInsideParagraphs('<p>a</p><div><p>b</p></div><div></div>')).toBe(0);
	});
	it('US-002 AC-4: void and self-closing tags do not stay open', () => {
		expect(divsInsideParagraphs('<p>a<br><img src="x"></p><div></div><p><span/></p><div></div>')).toBe(0);
	});
	it('US-002 AC-4: script, style and comments are skipped', () => {
		expect(
			divsInsideParagraphs('<script>"<p><div>"</script><!-- <p><div> --><style>p div{}</style><div></div>'),
		).toBe(0);
	});
	it('US-002 AC-4: nested spans inside a p do not hide the p', () => {
		expect(divsInsideParagraphs('<p><span class="e"><div>x</div></span></p>')).toBe(1);
	});
});
