// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { domOf } from '../support/dom';
import { pageFrontmatter, removeEmbedFrontmatter } from '../../src/core/render/frontmatter';

// US-002 AC-14, D10: the page's own frontmatter is the one upstream's step
// moves; an embedded note's frontmatter is removed from its embed (measured:
// the unrestricted step emptied 4 of 4 such embeds in the vault).

/** A render's DOM (`<p>` may hold blocks, as the render leaves it; tests/support/dom.ts). */
const root = domOf;
const FM = (t: string): string => `<pre class="frontmatter language-yaml">${t}</pre>`;
const embed = (inner: string): string =>
	`<span class="internal-embed markdown-embed" src="Front Note"><div class="markdown-embed-content">` +
	`<div class="markdown-preview-view markdown-rendered mod-frontmatter">${inner}</div></div></span>`;

describe('US-002 AC-14: the page own frontmatter', () => {
	it("US-002 AC-14: an embed's frontmatter earlier in the page is skipped; the page's own is found", () => {
		const r = root(
			`<div class="el-p"><p>${embed(FM('tags: probe') + '<p>FX-F12</p>')}</p></div><div class="el-pre">${FM('own')}</div>`,
		);
		expect(pageFrontmatter(r)?.textContent).toBe('own');
	});

	it('US-002 AC-14: only frontmatter inside embeds → none (F13 shape)', () => {
		const r = root(
			`<div class="el-p"><p>FX-F13-BEFORE</p></div><div class="el-p"><p>${embed(FM('tags: probe') + '<p>FX-F12</p>')}</p></div>`,
		);
		expect(pageFrontmatter(r)).toBeNull();
	});

	it('US-002 AC-14: a page without frontmatter → none; with its own only → that one (F12 shape)', () => {
		expect(pageFrontmatter(root('<div class="el-p"><p>x</p></div>'))).toBeNull();
		const r = root(`<div class="el-pre">${FM('title: Front Note')}</div><div class="el-p"><p>FX-F12</p></div>`);
		expect(pageFrontmatter(r)).toBe(r.querySelector('.frontmatter'));
	});
});

describe('US-002 AC-14, D10: frontmatter inside embeds', () => {
	it('US-002 AC-14: removes the embedded note’s frontmatter and nothing else of the embed (F13 shape)', () => {
		const r = root(`<div class="el-p"><p>${embed(FM('tags: probe') + '<h2>Part</h2><p>FX-F12</p>')}</p></div>`);
		expect(removeEmbedFrontmatter(r)).toBe(1);
		const content = r.querySelector('.markdown-embed-content') as HTMLElement;
		expect(r.querySelector('.frontmatter')).toBeNull();
		expect(content.textContent).toBe('PartFX-F12');
		expect(r.textContent).not.toContain('probe');
		expect(r.querySelector('.markdown-embed .markdown-preview-view')).not.toBeNull();
	});

	it("US-002 AC-14: nested embeds lose theirs too; the page's own frontmatter stays", () => {
		const r = root(
			`<div class="el-pre">${FM('own')}</div><p>${embed(FM('a') + `<p>${embed(FM('b') + '<p>x</p>')}</p>`)}</p>`,
		);
		expect(removeEmbedFrontmatter(r)).toBe(2);
		expect(Array.from(r.querySelectorAll('.frontmatter')).map((f) => f.textContent)).toEqual(['own']);
	});

	it('US-002 AC-14: the preview shape (frontmatter in an el-pre wrapper inside the embed) is handled the same', () => {
		const r = root(
			`<p><span class="markdown-embed"><div class="markdown-embed-content"><div class="markdown-preview-sizer"><div class="el-pre">${FM('t')}</div><div class="el-p"><p>FX-F12</p></div></div></div></span></p>`,
		);
		expect(removeEmbedFrontmatter(r)).toBe(1);
		expect(r.querySelector('.markdown-embed-content')?.textContent).toBe('FX-F12');
	});

	it('US-002 AC-14: nothing to remove → 0, tree unchanged', () => {
		const r = root(`<div class="el-pre">${FM('own')}</div>`);
		const before = r.innerHTML;
		expect(removeEmbedFrontmatter(r)).toBe(0);
		expect(r.innerHTML).toBe(before);
	});
});
