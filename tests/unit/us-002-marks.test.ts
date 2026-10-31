// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { domOf } from '../support/dom';
import { addPreviewMarks, documentClass, type SubpathKind } from '../../src/core/render/marks';

// US-002 AC-12, AC-13: the marks the reading view writes and
// `MarkdownRenderer.render` does not (measured: 0 in 364 notes), with the
// preview's markup (measured on the preview's output of the vault copy).

const ARROW_PATH = 'M3 8L12 17L21 8';
/** A render's DOM (`<p>` may hold blocks, as the render leaves it; tests/support/dom.ts). */
const root = domOf;
const embed = (src: string, inner = '<p>x</p>'): string =>
	`<span class="internal-embed markdown-embed inline-embed is-loaded" src="${src}">` +
	`<div class="embed-title markdown-embed-title"></div>` +
	`<div class="markdown-embed-content"><div class="markdown-preview-view markdown-rendered">${inner}</div></div></span>`;
const none = (): SubpathKind => ({ kind: 'none' });
const hasArrow = (h: Element | null): boolean =>
	h?.firstElementChild?.className === 'heading-collapse-indicator collapse-indicator collapse-icon';

describe('US-002 AC-12: heading arrows', () => {
	it('US-002 AC-12: a heading of the note gets the preview arrow as first child (exact markup)', () => {
		const r = root('<h2 data-heading="Part">Part</h2><p>x</p>');
		const counts = addPreviewMarks(r, none);
		const h = r.querySelector('h2');
		expect(hasArrow(h)).toBe(true);
		const ind = h?.firstElementChild as HTMLElement;
		expect(ind.tagName).toBe('SPAN');
		const svg = ind.querySelector(':scope > svg');
		expect(svg?.getAttribute('class')).toBe('svg-icon right-triangle');
		expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
		expect(svg?.querySelector('path')?.getAttribute('d')).toBe(ARROW_PATH);
		expect(h?.textContent).toBe('Part');
		expect(counts.arrows).toBe(1);
	});

	it('US-002 AC-12: h1 to h6 of the note and headings of an embed view get one; nested embeds too', () => {
		const r = root(
			'<h1>a</h1><h3>b</h3><h6>c</h6>' + `<p>${embed('X', `<h4>d</h4>${embed('Y', '<h5>e</h5>')}`)}</p>`,
		);
		expect(addPreviewMarks(r, none).arrows).toBe(5);
		for (const h of Array.from(r.querySelectorAll('h1,h3,h4,h5,h6')))
			expect(hasArrow(h), h.textContent ?? '').toBe(true);
	});

	it('US-002 AC-12: headings inside callouts, list items and table cells get none', () => {
		const r = root(
			'<div class="callout"><div class="callout-content"><h2>c</h2></div></div>' +
				'<ul><li><h3>l</h3></li></ul><table><tbody><tr><td><h4>t</h4></td></tr></tbody></table>',
		);
		expect(addPreviewMarks(r, none).arrows).toBe(0);
		expect(r.querySelectorAll('.heading-collapse-indicator')).toHaveLength(0);
	});

	it('US-002 AC-12: a heading that has an arrow already gets no second one; a second call adds nothing', () => {
		const r = root('<h2>a</h2>');
		addPreviewMarks(r, none);
		expect(addPreviewMarks(r, none).arrows).toBe(0);
		expect(r.querySelectorAll('.heading-collapse-indicator')).toHaveLength(1);
	});
});

describe('US-002 AC-12: embed link icon', () => {
	it('US-002 AC-12: every markdown embed gets the "Open link" icon as last child (exact markup)', () => {
		const r = root(`<p>${embed('X')}</p>`);
		expect(addPreviewMarks(r, none).links).toBe(1);
		const e = r.querySelector('.markdown-embed') as HTMLElement;
		const link = e.lastElementChild as HTMLElement;
		expect(link.tagName).toBe('DIV');
		expect(link.className).toBe('markdown-embed-link');
		expect(link.getAttribute('aria-label')).toBe('Open link');
		expect(link.querySelector(':scope > svg')?.getAttribute('class')).toBe('svg-icon lucide-maximize-2');
		expect(link.querySelectorAll('path')).toHaveLength(4);
	});

	it('US-002 AC-12: nested embeds get one each; image embeds get none; no second icon', () => {
		const r = root(
			`<p>${embed('X', embed('Y'))}</p><p><span class="internal-embed media-embed image-embed" src="p.png"><img></span></p>`,
		);
		expect(addPreviewMarks(r, none).links).toBe(2);
		expect(addPreviewMarks(r, none).links).toBe(0);
		expect(r.querySelectorAll('.markdown-embed-link')).toHaveLength(2);
		expect(r.querySelector('.image-embed .markdown-embed-link')).toBeNull();
	});
});

describe('US-002 AC-12: data-type of heading embeds', () => {
	it('US-002 AC-12: an embed whose subpath resolves to a heading gets data-type="heading"; others none', () => {
		const r = root(`<p>${embed('Long Note#Section Three')}${embed('Map Alpha')}</p>`);
		const seen: string[] = [];
		const counts = addPreviewMarks(r, (src) => {
			seen.push(src);
			return src.includes('#') ? { kind: 'heading' } : { kind: 'none' };
		});
		const [a, b] = Array.from(r.querySelectorAll('.markdown-embed'));
		expect(a.getAttribute('data-type')).toBe('heading');
		expect(b.hasAttribute('data-type')).toBe(false);
		expect(counts.headingType).toBe(1);
		expect(seen).toEqual(['Long Note#Section Three', 'Map Alpha']);
	});
});

describe('US-002 AC-13: embed of a missing heading', () => {
	const missing = (): SubpathKind => ({ kind: 'missing', heading: 'No Such Heading', target: 'Long Note' });

	it('US-002 AC-13: the content becomes exactly the preview h5 (plus AC-12 arrow); no data-type', () => {
		const whole = '<h2>Section One</h2><p>FX-LONG-1</p><h2>Section Two</h2><p>FX-LONG-2</p>';
		const r = root(`<p>${embed('Long Note#No Such Heading', whole)}</p>`);
		const counts = addPreviewMarks(r, missing);
		const e = r.querySelector('.markdown-embed') as HTMLElement;
		const content = e.querySelector(':scope > .markdown-embed-content') as HTMLElement;
		expect(content.children).toHaveLength(1);
		const view = content.firstElementChild as HTMLElement;
		expect(view.className).toBe('markdown-preview-view markdown-rendered');
		expect(view.children).toHaveLength(1);
		const h5 = view.firstElementChild as HTMLElement;
		const T = 'Unable to find “No Such Heading” in Long Note';
		expect(h5.tagName).toBe('H5');
		expect(h5.getAttribute('data-heading')).toBe(T);
		expect(h5.getAttribute('dir')).toBe('auto');
		expect(h5.textContent).toBe(T);
		expect(hasArrow(h5)).toBe(true);
		expect(e.textContent).not.toContain('FX-LONG');
		expect(e.hasAttribute('data-type')).toBe(false);
		expect(counts.unable).toBe(1);
		expect(e.lastElementChild?.className).toBe('markdown-embed-link');
	});

	it('US-002 AC-13: heading and note names are set as text (< and & appear literally)', () => {
		const r = root(`<p>${embed('A#x')}</p>`);
		addPreviewMarks(r, () => ({ kind: 'missing', heading: '<b>&amp;</b>', target: 'R&D <x>' }));
		const h5 = r.querySelector('h5') as HTMLElement;
		expect(h5.textContent).toBe('Unable to find “<b>&amp;</b>” in R&D <x>');
		expect(h5.querySelector('b')).toBeNull();
	});

	it('US-002 AC-13: kind none (no subpath, block subpath, unknown target) leaves the content as written', () => {
		const r = root(`<p>${embed('Long Note#^abc', '<p>FX-BLOCK</p>')}</p>`);
		addPreviewMarks(r, none);
		expect(r.querySelector('.markdown-embed-content')?.textContent).toBe('FX-BLOCK');
	});
});

describe('US-002 AC-13: nested embeds of a replaced embed', () => {
	it('US-002 AC-13: embeds inside the replaced content are gone and not resolved or marked', () => {
		const r = root(`<p>${embed('Long Note#Gone', `<p>${embed('Inner#H')}</p>`)}</p>`);
		const seen: string[] = [];
		const counts = addPreviewMarks(r, (src) => {
			seen.push(src);
			return src === 'Long Note#Gone'
				? { kind: 'missing', heading: 'Gone', target: 'Long Note' }
				: { kind: 'heading' };
		});
		expect(seen).toEqual(['Long Note#Gone']);
		expect(counts).toEqual({ arrows: 1, links: 1, headingType: 0, unable: 1 });
		expect(r.querySelectorAll('.markdown-embed')).toHaveLength(1);
	});
});

describe('US-002 AC-12: page root class', () => {
	it("US-002 AC-12: obsidian-document followed by the reading view's class list (measured list)", () => {
		const list =
			'markdown-preview-view markdown-rendered node-insert-event is-readable-line-width allow-fold-headings allow-fold-lists show-indentation-guide show-properties';
		expect(documentClass(list)).toBe(`obsidian-document ${list}`);
	});

	it('US-002 AC-12: an empty list gives obsidian-document alone', () => {
		expect(documentClass('')).toBe('obsidian-document');
		expect(documentClass('  ')).toBe('obsidian-document');
	});
});
