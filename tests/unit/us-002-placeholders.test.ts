// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { markUnexportedEmbeds } from '../../src/core/embeds/placeholders';

// US-002 AC-7, D2, D6: embeds that stay empty get a visible placeholder and
// a warning; embeds of genuinely empty targets do not.

const page = (inner: string): HTMLElement => {
	const el = document.createElement('div');
	el.innerHTML = inner;
	return el;
};
const EMPTY_EMBED = (src: string): string =>
	`<span class="internal-embed markdown-embed inline-embed is-loaded" alt="${src}" src="${src}"></span>`;
const never = (): boolean => false;

describe('US-002 AC-7: placeholders', () => {
	it('US-002 AC-7: an embed without content element gets the placeholder inside it, and one warning (F10 shape)', () => {
		const root = page(`<div class="el-p">${EMPTY_EMBED('Broken Map')}</div>`);
		const warnings = markUnexportedEmbeds(root, 'Failures/Embed Broken Map.md', never);
		const embed = root.querySelector('.markdown-embed') as HTMLElement;
		expect(embed.children).toHaveLength(1);
		const ph = embed.firstElementChild as HTMLElement;
		expect(ph.tagName).toBe('DIV');
		expect(ph.className).toBe('owe-export-placeholder');
		expect(ph.textContent).toBe('Embedded content could not be exported: Broken Map');
		expect(warnings).toEqual([
			{
				note: 'Failures/Embed Broken Map.md',
				target: 'Broken Map',
				message: 'Embed not exported: Failures/Embed Broken Map.md → Broken Map',
			},
		]);
	});

	it('US-002 AC-7: an empty content element (no text, no svg, no img) counts as empty', () => {
		const root = page(
			'<span class="internal-embed markdown-embed" src="X"><div class="markdown-embed-content"><div> </div></div></span>',
		);
		expect(markUnexportedEmbeds(root, 'n.md', never)).toHaveLength(1);
	});

	it('US-002 AC-7: content with text, with only an <svg>, or with only an <img> is left alone', () => {
		for (const inner of ['<p>text</p>', '<svg></svg>', '<img src="a.png">']) {
			const root = page(
				`<span class="internal-embed markdown-embed" src="X"><div class="markdown-embed-content">${inner}</div></span>`,
			);
			const before = root.innerHTML;
			expect(markUnexportedEmbeds(root, 'n.md', never)).toEqual([]);
			expect(root.innerHTML).toBe(before);
		}
	});

	it('US-002 AC-7 / D6: an embed of a genuinely empty target is left alone, without warning (F11 shape)', () => {
		const root = page(EMPTY_EMBED('Empty Note'));
		const before = root.innerHTML;
		const seen: string[] = [];
		const warnings = markUnexportedEmbeds(root, 'Failures/Embed Empty Note.md', (t) => {
			seen.push(t);
			return t === 'Empty Note';
		});
		expect(warnings).toEqual([]);
		expect(root.innerHTML).toBe(before);
		expect(seen).toEqual(['Empty Note']);
	});

	it('US-002 AC-7: Obsidian`s "not created yet" span is not a markdown-embed and is left alone', () => {
		const root = page(
			'<span class="internal-embed is-loaded file-embed mod-empty" src="No Such Note">“No Such Note” is not created yet. Click to create.</span>',
		);
		expect(markUnexportedEmbeds(root, 'n.md', never)).toEqual([]);
	});

	it('US-002 AC-7: a target with < and & is set as text, not markup', () => {
		const root = page(EMPTY_EMBED('A &lt;b&gt; &amp; C'));
		markUnexportedEmbeds(root, 'n.md', never);
		const ph = root.querySelector('.owe-export-placeholder') as HTMLElement;
		expect(ph.textContent).toBe('Embedded content could not be exported: A <b> & C');
		expect(ph.querySelector('b')).toBeNull();
	});

	it('US-002 AC-7: a filled outer embed with an empty nested embed: only the nested one is marked', () => {
		const root = page(
			`<span class="internal-embed markdown-embed" src="Outer"><div class="markdown-embed-content"><p>FX-OUT</p>${EMPTY_EMBED('Inner')}</div></span>`,
		);
		const warnings = markUnexportedEmbeds(root, 'n.md', never);
		expect(warnings.map((w) => w.target)).toEqual(['Inner']);
		expect(root.querySelector('[src="Outer"] > .owe-export-placeholder')).toBeNull();
	});

	it('US-002 AC-7: an outer embed holding only an empty nested embed: the nested one is marked, not the outer', () => {
		// Added at #5 (SCAR-023): only this shape reaches the innermost-first rule.
		const root = page(
			`<span class="internal-embed markdown-embed" src="Outer"><div class="markdown-embed-content">${EMPTY_EMBED('Inner')}</div></span>`,
		);
		expect(markUnexportedEmbeds(root, 'n.md', never).map((w) => w.target)).toEqual(['Inner']);
		expect(root.querySelector('[src="Inner"] > .owe-export-placeholder')).not.toBeNull();
	});

	it('US-002 AC-7: two empty embeds on one page give two placeholders and two warnings, in order', () => {
		const root = page(EMPTY_EMBED('One') + EMPTY_EMBED('Two'));
		expect(markUnexportedEmbeds(root, 'n.md', never).map((w) => w.target)).toEqual(['One', 'Two']);
		expect(root.querySelectorAll('.owe-export-placeholder')).toHaveLength(2);
	});
});
