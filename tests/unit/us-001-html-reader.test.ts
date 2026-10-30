import { describe, expect, it } from 'vitest';
import { readPage } from '../support/html-reader';

// US-001 AC-12: the one reader of exported pages, one test per rule
// (SCAR-028). Samples are hand-written in the shape the exporter writes
// (spike-docker.md: `block-language-text-mapper` > `div.textmapper` > `svg`).

const mapBlock = (labels: string[]): string =>
	'<div class="block-language-text-mapper"><div class="textmapper">' +
	'<svg xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10 10">' +
	'<rect x="0" y="0" width="10" height="10" fill="white"></rect>' +
	labels.map((l) => `<g><text x="1" y="1">${l}</text></g>`).join('') +
	'</svg></div></div>';

const page = (body: string): string =>
	'<!DOCTYPE html><html><head><title>t</title><style>.x{}</style></head>' +
	`<body><div class="markdown-preview-sizer markdown-preview-section">${body}</div>` +
	'<script>let rs = document.querySelector("#right-sidebar");</script></body></html>';

describe('US-001 AC-12: html reader', () => {
	it('US-001 AC-12: finds text inside <svg> (map labels), the spike case >Alpha<', () => {
		const r = readPage(page(mapBlock(['Alpha', 'Beta'])));
		expect(r.text).toContain('Alpha');
		expect(r.text).toContain('Beta');
	});

	it('US-001 AC-12: visible text outside svg, entities decoded', () => {
		const r = readPage(page('<p>FX-F9 Tom &amp; Jerry &lt;b&gt;</p>'));
		expect(r.text).toContain('FX-F9');
		expect(r.text).toContain('Tom & Jerry <b>');
	});

	it('US-001 AC-12: text of <script> and <style> is not visible text', () => {
		const r = readPage(page('<p>body</p>'));
		expect(r.text).not.toContain('right-sidebar');
		expect(r.text).not.toContain('.x{}');
	});

	it('US-001 AC-12: a `<` inside an inline script is not a tag (exported pages have `window.innerWidth < 768`)', () => {
		// Added at #3 (SCAR-023): the script sample above has no `<`, so a reader
		// that tokenized script content survived a mutation; 4 of 7 inline
		// scripts of a real exported page contain `<` (measured 2026-10-30).
		const r = readPage(
			page('<p>body</p>') +
				'<script>let w = window.innerWidth < 768 ? \'<div class="block-language-text-mapper">x</div>\' : "";</script>',
		);
		expect(r.mapBlocks).toBe(0);
		expect(r.text).not.toContain('innerWidth');
	});

	it('US-001 AC-12: counts map blocks, one per block-language-text-mapper element', () => {
		const r = readPage(page(mapBlock(['A']) + '<p>between</p>' + mapBlock(['B'])));
		expect(r.mapBlocks).toBe(2);
		expect(r.emptyMapBlocks).toBe(0);
	});

	it('US-001 AC-12: a map block without an <svg> counts as empty', () => {
		const r = readPage(page('<div class="block-language-text-mapper"></div>' + mapBlock(['A'])));
		expect(r.mapBlocks).toBe(2);
		expect(r.emptyMapBlocks).toBe(1);
	});

	it('US-001 AC-12: an <svg> after an empty map block is not credited to it', () => {
		// The spike reader split on the class name and counted later page icons
		// as part of the block; the reader must stay inside the element.
		const r = readPage(
			page(
				'<div class="block-language-text-mapper"><div class="textmapper"></div></div><svg class="icon"></svg>',
			),
		);
		expect(r.emptyMapBlocks).toBe(1);
	});

	it('US-001 AC-12: counts markdown-embed elements, nested ones too', () => {
		const r = readPage(
			page(
				'<div class="internal-embed markdown-embed"><div class="markdown-embed-content">' +
					'<div class="internal-embed markdown-embed"></div></div></div>',
			),
		);
		expect(r.markdownEmbeds).toBe(2);
	});

	it('US-001 AC-12: class matching is by whole class name, not substring', () => {
		const r = readPage(
			page('<div class="block-language-text-mapper-legend"></div><div class="markdown-embed-title"></div>'),
		);
		expect(r.mapBlocks).toBe(0);
		expect(r.markdownEmbeds).toBe(0);
	});

	it('US-001 AC-12: attributes in single quotes and extra whitespace are read', () => {
		const r = readPage(page("<div  class='x block-language-text-mapper'  ><svg><text>Q</text></svg></div>"));
		expect(r.mapBlocks).toBe(1);
		expect(r.emptyMapBlocks).toBe(0);
		expect(r.text).toContain('Q');
	});
});
