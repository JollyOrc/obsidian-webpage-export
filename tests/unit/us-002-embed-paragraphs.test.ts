// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { unwrapEmbedParagraphs } from '../../src/core/embeds/paragraphs';

// US-002 AC-5: the p-tag step. Shapes that went through the HTML parser are
// built by parsing with jsdom (spec-conformant, measured like Chromium);
// shapes copied as DOM (fallback, A3 main path) are built with the DOM API.

const EMBED = 'internal-embed markdown-embed inline-embed';

/** An embed element with content, built without the parser (DOM copy path). */
function embed(alt: string, text: string): HTMLElement {
	const span = document.createElement('span');
	span.className = EMBED;
	span.setAttribute('alt', alt);
	const content = document.createElement('div');
	content.className = 'markdown-embed-content';
	const p = document.createElement('p');
	p.textContent = text;
	content.appendChild(p);
	span.appendChild(content);
	return span;
}

/** A section `div.el-p` holding one `<p>` with the given children, built without the parser. */
function section(...children: Node[]): HTMLElement {
	const el = document.createElement('div');
	el.className = 'el-p';
	const p = document.createElement('p');
	for (const c of children) p.appendChild(c);
	el.appendChild(p);
	return el;
}

/** A section parsed from markup, as Obsidian's page is when it goes through `innerHTML`. */
function parsed(innerHtml: string): HTMLElement {
	const el = document.createElement('div');
	el.className = 'el-p';
	el.innerHTML = innerHtml;
	return el;
}

const embedText = (root: Element, alt: string): string =>
	(root.querySelector(`[alt="${alt}"]`)?.textContent ?? '').trim();

describe('US-002 AC-5: the p-tag step', () => {
	it('US-002 AC-5: one filled embed: the <p> becomes a block span, the embed is unchanged', () => {
		const e = embed('A', 'A text');
		const before = e.outerHTML;
		const root = section(e);
		unwrapEmbedParagraphs(root);
		expect(root.querySelector('p:has(> .markdown-embed)')).toBeNull();
		const span = root.firstElementChild as HTMLElement;
		expect(span.tagName).toBe('SPAN');
		expect(span.style.display).toBe('block');
		expect(span.style.marginBlockStart).toBe('var(--p-spacing)');
		expect(span.style.marginBlockEnd).toBe('var(--p-spacing)');
		expect((span.querySelector('[alt="A"]') as HTMLElement).outerHTML).toBe(before);
	});

	it('US-002 AC-5: two filled embeds in one <p>: both kept, in order, neither inside the other (the Big Page case)', () => {
		const root = section(embed('Section One', 'FX-LONG-1'), document.createElement('br'), embed('Map 1', 'Alpha'));
		unwrapEmbedParagraphs(root);
		const alts = Array.from(root.querySelectorAll('.markdown-embed')).map((e) => e.getAttribute('alt'));
		expect(alts).toEqual(['Section One', 'Map 1']);
		expect(embedText(root, 'Section One')).toBe('FX-LONG-1');
		expect(embedText(root, 'Map 1')).toBe('Alpha');
		expect(root.querySelector('[alt="Section One"] .markdown-embed')).toBeNull();
	});

	it('US-002 AC-5: one embed through the parser: its block is moved back in, the parser`s empty <p> removed', () => {
		const root = parsed(
			`<p><span class="${EMBED}" alt="A"><div class="markdown-embed-content"><p>A text</p></div></span></p>`,
		);
		// the measured parse result: the embed is empty, its block after the <p>
		expect(embedText(root, 'A')).toBe('');
		unwrapEmbedParagraphs(root);
		expect(embedText(root, 'A')).toBe('A text');
		expect(root.querySelectorAll('p').length).toBe(1); // only the content's own <p>
		expect(root.querySelector('p:empty')).toBeNull();
		expect(root.querySelector('p div')).toBeNull();
	});

	it('US-002 AC-5: two embeds through the parser: the first gets only its own block, the second keeps its content (D3)', () => {
		const root = parsed(
			`<p><span class="${EMBED}" alt="A"><div class="markdown-embed-content">A text</div></span><br> ` +
				`<span class="${EMBED}" alt="B"><div class="markdown-embed-content">B text</div></span></p>`,
		);
		unwrapEmbedParagraphs(root);
		expect(embedText(root, 'A')).toBe('A text');
		expect(embedText(root, 'B')).toBe('B text');
		expect(root.querySelector('[alt="A"] [alt="B"]')).toBeNull();
		const alts = Array.from(root.querySelectorAll('.markdown-embed')).map((e) => e.getAttribute('alt'));
		expect(alts).toEqual(['A', 'B']);
		expect(root.querySelector('p:empty')).toBeNull();
	});

	it('US-002 AC-5: a really empty embed (F10/F11 shape, no parser marker) does not take in a following <div>', () => {
		// Added at #5 (SCAR-023): no test reached the "only with the marker" rule.
		const empty = document.createElement('span');
		empty.className = EMBED;
		empty.setAttribute('alt', 'Broken Map');
		const root = section(empty);
		const other = document.createElement('div');
		other.textContent = 'unrelated block';
		root.appendChild(other);
		unwrapEmbedParagraphs(root);
		expect((root.querySelector('[alt="Broken Map"]') as HTMLElement).childNodes).toHaveLength(0);
		expect(root.lastElementChild?.textContent).toBe('unrelated block');
	});

	it('US-002 AC-5: the marker search stops at a content paragraph (a later empty <p> is not the marker)', () => {
		const root = parsed(
			`<p><span class="${EMBED}" alt="A"></span></p><div>not A</div><p>next paragraph</p><p></p>`,
		);
		unwrapEmbedParagraphs(root);
		expect(embedText(root, 'A')).toBe('');
		expect(root.querySelectorAll('p')).toHaveLength(2);
	});

	it('US-002 AC-5: a <p> without an embed is not touched', () => {
		const root = parsed('<p>plain <b>text</b></p>');
		const before = root.innerHTML;
		unwrapEmbedParagraphs(root);
		expect(root.innerHTML).toBe(before);
	});

	it('US-002 AC-5: a <p> inside an embed`s content is not unwrapped (only paragraphs that hold an embed)', () => {
		const root = section(embed('A', 'inner paragraph'));
		unwrapEmbedParagraphs(root);
		expect(root.querySelector('[alt="A"] .markdown-embed-content > p')?.textContent).toBe('inner paragraph');
	});
});
