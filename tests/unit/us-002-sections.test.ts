// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { domOf } from '../support/dom';
import { wrapSections } from '../../src/core/render/sections';

// US-002 AC-11: each top-level block of the detached render is copied into
// the sizer inside its own `div.el-<tag>`, as the reading view writes its
// sections (M08: without them the frontmatter step removed the sizer).

/** A render's DOM (`<p>` may hold blocks, as the render leaves it; tests/support/dom.ts). */
const rendered = domOf;
const sizer = (): HTMLElement => {
	const el = document.createElement('div');
	el.className = 'markdown-preview-sizer markdown-preview-section';
	return el;
};
const classes = (el: Element): string[] => Array.from(el.children).map((c) => c.className);

describe('US-002 AC-11: section wrappers', () => {
	it('US-002 AC-11: F12 shape: pre, p, h2, p → el-pre, el-p, el-h2, el-p, in source order, one block each', () => {
		const src = rendered(
			'<pre class="frontmatter">title: Front Note</pre>\n<p>FX-F12 body</p>\n<h2>Part</h2>\n<p>More text FX-F12B.</p>',
		);
		const out = sizer();
		expect(wrapSections(src, out)).toBe(4);
		expect(classes(out)).toEqual(['el-pre', 'el-p', 'el-h2', 'el-p']);
		for (const w of Array.from(out.children)) expect(w.children).toHaveLength(1);
		expect(out.querySelector('.el-h2 > h2')?.textContent).toBe('Part');
		expect(out.querySelector('.el-pre > pre.frontmatter')).not.toBeNull();
	});

	it('US-002 AC-11: text nodes with only whitespace are dropped; other text nodes go into el-p', () => {
		const src = rendered('\n  <p>A</p>\n\n loose text \n<ul><li>B</li></ul>');
		const out = sizer();
		expect(wrapSections(src, out)).toBe(3);
		expect(classes(out)).toEqual(['el-p', 'el-p', 'el-ul']);
		expect(out.children[1].textContent).toBe('\n\n loose text \n');
	});

	it('US-002 AC-11: the class is the lower-case tag name of any element (div, table, blockquote)', () => {
		const src = rendered('<DIV class="callout"></DIV><table></table><blockquote></blockquote>');
		const out = sizer();
		wrapSections(src, out);
		expect(classes(out)).toEqual(['el-div', 'el-table', 'el-blockquote']);
	});

	it('US-002 AC-11, AC-2: nodes are copied (the source keeps its children); embeds and their content stay inside', () => {
		const src = rendered(
			'<p><span class="internal-embed markdown-embed" src="A"><div class="markdown-embed-content"><p>FX-A</p></div></span></p>',
		);
		const before = src.innerHTML;
		const out = sizer();
		wrapSections(src, out);
		expect(src.innerHTML).toBe(before);
		expect(out.querySelector('.el-p .markdown-embed .markdown-embed-content')?.textContent).toBe('FX-A');
	});

	it('US-002 AC-11: content inside an embed is not wrapped', () => {
		const src = rendered(
			'<p><span class="markdown-embed"><div class="markdown-embed-content"><div class="markdown-preview-view"><h2>H</h2><p>x</p></div></div></span></p>',
		);
		const out = sizer();
		wrapSections(src, out);
		expect(out.querySelectorAll('[class^="el-"]')).toHaveLength(1);
	});

	it('US-002 AC-11: existing children of the sizer (title header, pusher) stay first', () => {
		const src = rendered('<p>A</p>');
		const out = sizer();
		out.innerHTML = '<div class="markdown-pusher"></div>';
		wrapSections(src, out);
		expect(classes(out)).toEqual(['markdown-pusher', 'el-p']);
	});

	it('US-002 AC-11: comments are dropped', () => {
		const out = sizer();
		expect(wrapSections(rendered('<!-- c --><p>A</p><!-- d -->'), out)).toBe(1);
		expect(classes(out)).toEqual(['el-p']);
	});

	it('US-002 AC-11: an empty render writes nothing and returns 0', () => {
		const out = sizer();
		expect(wrapSections(rendered('\n'), out)).toBe(0);
		expect(out.children).toHaveLength(0);
	});
});

describe('US-002 AC-11: the test helper domOf (SCAR-028)', () => {
	it('US-002 AC-11: keeps a block inside a <p>, where innerHTML would close the <p>', () => {
		const html = '<p class="a"><span><div>B</div></span>t</p><pre><p>q</p></pre>';
		const plain = document.createElement('div');
		plain.innerHTML = html;
		expect(plain.querySelector('p > span > div')).toBeNull();
		const r = domOf(html);
		expect(r.querySelector('p.a > span > div')?.textContent).toBe('B');
		expect(r.querySelector('p.a')?.textContent).toBe('Bt');
		expect(r.querySelector('pre > p')?.textContent).toBe('q');
		expect(r.querySelectorAll('x-p')).toHaveLength(0);
	});
});
