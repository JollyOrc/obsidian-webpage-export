import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildImage, pagePath, runHeadless, type HeadlessResult } from '../../tools/headless/runner';
import { expectedTokens } from '../support/expected-tokens';
import { readPage } from '../support/html-reader';
import { divsInsideParagraphs, embedsOf } from '../support/page-structure';

// US-002 against the headless Obsidian 1.14.5, every criterion in 3 of 3 runs.
// Time limits (SCAR-030): image build 600 s (US-001); one run 10–15 s measured
// in the spike (28–44 s for 3), capped at 120 s by the runner → 3 runs 450 s.
const BUILD_LIMIT = 600_000;
const THREE_RUNS = 450_000;
const VAULT = 'tests/fixtures/vault';
const FALLBACK = /Failed to render all sections in file .+, using fallback!/;
/** US-002 AC-12: the reading view's class list, measured for every fixture and vault note (node-insert-event aside). */
const PREVIEW_CLASSES = [
	'allow-fold-headings',
	'allow-fold-lists',
	'is-readable-line-width',
	'markdown-preview-view',
	'markdown-rendered',
	'obsidian-document',
	'show-indentation-guide',
	'show-properties',
];

const expected = (): Record<string, string[]> => expectedTokens(VAULT);
const html = (r: HeadlessResult, run: number, note: string): string =>
	readFileSync(join(r.runs[run].outputDir, pagePath(note)), 'utf8');
const warnings = (r: HeadlessResult, run: number): string[] => {
	const rep = r.runs[run].report;
	return rep.ok ? rep.report.warnings : [];
};
/** Per run, the notes whose page misses expected tokens, with the count (SCAR-015: content, not status). */
const incomplete = (r: HeadlessResult): Record<string, number>[] =>
	r.runs.map((_, i) => {
		const out: Record<string, number> = {};
		for (const [note, tokens] of Object.entries(expected())) {
			const text = readPage(html(r, i, note)).text;
			const missing = tokens.filter((t) => !text.includes(t)).length;
			if (missing) out[note] = missing;
		}
		return out;
	});

let tag = '';
let base: HeadlessResult;
beforeAll(async () => {
	tag = (await buildImage()).tag;
	base = await runHeadless({ image: tag, vault: VAULT, runs: 3 });
}, BUILD_LIMIT + THREE_RUNS);

describe('US-002 default export (3 runs)', () => {
	it('US-002 AC-1: every page has every expected token, in every run (Big Page: 102)', () => {
		expect(base.runs.every((r) => r.status === 'ok')).toBe(true);
		expect(expected()['Composed/Big Page.md']).toHaveLength(102);
		expect(incomplete(base)).toEqual([{}, {}, {}]);
	});

	it('US-002 AC-2: Big Page: 8 heading embeds, each holding its own section sentinel and no map embed', () => {
		for (let i = 0; i < 3; i++) {
			const heads = embedsOf(html(base, i, 'Composed/Big Page.md')).filter((e) => e.type === 'heading');
			expect(heads).toHaveLength(8);
			heads.forEach((h) => {
				const n = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'].indexOf(h.alt.replace(/^.*Section /, '')) + 1;
				expect(h.text, h.alt).toContain(`FX-LONG-${n}`);
				expect(
					h.nested.filter((a) => /^Map \d$/.test(a)),
					h.alt,
				).toEqual([]);
			});
		}
	});

	it('US-002 AC-2: Big Page: each map embed holds the 12 labels of its own map', () => {
		const maps = embedsOf(html(base, 0, 'Composed/Big Page.md')).filter((e) => /^Map \d$/.test(e.alt));
		expect(maps).toHaveLength(8);
		for (const m of maps) {
			const labels = [
				...readFileSync(join(VAULT, `Maps/${m.alt}.md`), 'utf8').matchAll(/^\d{4} \S+ "([^"]+)"$/gm),
			].map((x) => x[1]);
			expect(labels).toHaveLength(12);
			for (const l of labels) expect(m.text, `${m.alt}: ${l}`).toContain(l);
		}
	});

	it('US-002 AC-2: Nested Embed: the outer embed contains the inner one, which holds FX-F1-BEFORE', () => {
		const e = embedsOf(html(base, 0, 'Embeds/Nested Embed.md'));
		expect(e[0].nested.length).toBeGreaterThanOrEqual(1);
		expect(e[1].text).toContain('FX-F1-BEFORE');
	});

	it('US-002 AC-3: no run uses the fallback renderer or reports sections not drawn', () => {
		for (let i = 0; i < 3; i++) {
			expect(warnings(base, i).filter((w) => FALLBACK.test(w) || w.includes('Not all sections drawn'))).toEqual(
				[],
			);
		}
	});

	it('US-002 AC-3: pages come from the detached render: no embed holds a reading-view sizer (preview: 2 on Heading Embed)', () => {
		// Measured (spike): the reading view writes `.markdown-preview-sizer`
		// inside each embed, the detached render none.
		const notes = Object.keys(expected());
		for (let i = 0; i < 3; i++) {
			let embeds = 0;
			for (const n of notes) {
				const doc = new JSDOM(html(base, i, n)).window.document;
				embeds += doc.querySelectorAll('.markdown-embed').length;
				expect(doc.querySelectorAll('.markdown-embed .markdown-preview-sizer').length, n).toBe(0);
			}
			expect(embeds, 'embeds checked').toBe(28);
		}
	});

	it('US-002 AC-4: no exported fixture page has a <div> inside a <p>', () => {
		const notes = Object.keys(expected());
		expect(notes.length).toBe(28);
		for (let i = 0; i < 3; i++) for (const n of notes) expect(divsInsideParagraphs(html(base, i, n)), n).toBe(0);
	});

	it('US-002 AC-7: F10 exports as Obsidian shows it: the embed holds the map <svg>, no placeholder, no warning', () => {
		for (let i = 0; i < 3; i++) {
			const page = html(base, i, 'Failures/Embed Broken Map.md');
			expect(page).not.toContain('owe-export-placeholder');
			expect(readPage(page).text).toContain('FX-F10');
			expect(
				embedsOf(page).some((e) => e.alt === 'Broken Map'),
				'Broken Map embed present',
			).toBe(true);
			const doc = new JSDOM(page).window.document;
			expect(
				doc.querySelector('.markdown-embed[alt="Broken Map"] svg'),
				'an svg inside the embed',
			).not.toBeNull();
			expect(warnings(base, i).filter((w) => w.includes('Embed not exported:'))).toEqual([]);
		}
	});

	it('US-002 AC-7 / D6: F11: the embedded empty note gets no placeholder and no warning (regression guard; D6 itself: unit tests)', () => {
		for (let i = 0; i < 3; i++) {
			const page = html(base, i, 'Failures/Embed Empty Note.md');
			expect(page).not.toContain('owe-export-placeholder');
			expect(readPage(page).text).toContain('FX-F11');
			expect(warnings(base, i).some((w) => w.includes('Empty Note'))).toBe(false);
		}
	});

	it('US-002 AC-7: no page of the fixture has a placeholder (nothing fails to export)', () => {
		for (let i = 0; i < 3; i++) {
			const withPlaceholder = Object.keys(expected()).filter((note) =>
				html(base, i, note).includes('owe-export-placeholder'),
			);
			expect(withPlaceholder).toEqual([]);
		}
	});
});

describe('US-002 AC-6: with useFallbackRenderer: true (3 runs)', () => {
	it(
		'US-002 AC-6: every page complete, Big Page heading embeds hold their content',
		async () => {
			const fb = await runHeadless({
				image: tag,
				vault: VAULT,
				runs: 3,
				exportOptions: { useFallbackRenderer: true },
			});
			expect(fb.runs.every((r) => r.status === 'ok')).toBe(true);
			expect(incomplete(fb)).toEqual([{}, {}, {}]);
			for (let i = 0; i < 3; i++) {
				const heads = embedsOf(html(fb, i, 'Composed/Big Page.md')).filter((e) => e.type === 'heading');
				expect(heads.filter((h) => h.text.includes('FX-LONG'))).toHaveLength(8);
				// AC-14 holds on every path
				const fe = new JSDOM(html(fb, i, 'Embeds/Front Embed.md')).window.document;
				expect(fe.querySelectorAll('.frontmatter'), 'Front Embed frontmatter').toHaveLength(0);
				expect(fe.querySelector('.markdown-embed')?.textContent ?? '').toContain('FX-F12');
			}
		},
		THREE_RUNS,
	);
});

/** The `.obsidian-document` of a page (jsdom); every page of a note has one. */
const docOf = (r: HeadlessResult, run: number, note: string): Element => {
	const d = new JSDOM(html(r, run, note)).window.document.querySelector('.obsidian-document');
	if (!d) throw new Error(`no .obsidian-document in ${note}`);
	return d;
};

describe('US-002 AC-11 to AC-15: the detached output (default export, 3 runs)', () => {
	it('US-002 AC-11: Front Note: section wrappers el-p, el-h2, el-p after the frontmatter moved; Long Note: 6 el-h2', () => {
		for (let i = 0; i < 3; i++) {
			const sizer = docOf(base, i, 'Plain/Front Note.md').querySelector(':scope > .markdown-preview-sizer');
			const wrappers = Array.from(sizer?.children ?? [])
				.map((c) => c.className)
				.filter((c) => c.startsWith('el-'));
			expect(wrappers).toEqual(['el-p', 'el-h2', 'el-p']);
			const long = docOf(base, i, 'Long Note.md');
			expect(long.querySelectorAll(':scope > .markdown-preview-sizer > div.el-h2 > h2')).toHaveLength(6);
		}
	});

	it('US-002 AC-11: every sizer child is a section wrapper, the title header, the footer or the pusher (all pages)', () => {
		const notes = Object.keys(expected());
		for (let i = 0; i < 3; i++) {
			let children = 0;
			for (const n of notes) {
				const sizer = docOf(base, i, n).querySelector(':scope > .markdown-preview-sizer');
				for (const c of Array.from(sizer?.children ?? [])) {
					children++;
					expect(
						/^(el-[a-z0-9]+|header|footer|markdown-pusher)$/.test(c.className),
						`${n}: ${c.className}`,
					).toBe(true);
				}
			}
			expect(children, 'children checked').toBeGreaterThan(notes.length);
		}
	});

	it('US-002 AC-12: fixture totals as the preview: 23 arrows, 28 embed icons, 10 heading embeds; Big Page title has none', () => {
		for (let i = 0; i < 3; i++) {
			let arrows = 0;
			let icons = 0;
			let heading = 0;
			for (const n of Object.keys(expected())) {
				const d = docOf(base, i, n);
				arrows += d.querySelectorAll(
					'h1 > .heading-collapse-indicator, h2 > .heading-collapse-indicator, h3 > .heading-collapse-indicator, h4 > .heading-collapse-indicator, h5 > .heading-collapse-indicator, h6 > .heading-collapse-indicator',
				).length;
				icons += d.querySelectorAll('.markdown-embed > .markdown-embed-link').length;
				heading += d.querySelectorAll('.markdown-embed[data-type="heading"]').length;
			}
			expect({ arrows, icons, heading }).toEqual({ arrows: 23, icons: 28, heading: 10 });
			const big = docOf(base, i, 'Composed/Big Page.md');
			expect(big.querySelectorAll('.page-title .heading-collapse-indicator')).toHaveLength(0);
		}
	});

	it("US-002 AC-12: every page's root class list is the reading view's (node-insert-event aside)", () => {
		for (let i = 0; i < 3; i++) {
			for (const n of Object.keys(expected())) {
				const cls = docOf(base, i, n)
					.className.split(/\s+/)
					.filter((c) => c && c !== 'node-insert-event')
					.sort();
				expect(cls, n).toEqual(PREVIEW_CLASSES);
			}
		}
	});

	it('US-002 AC-13: Missing Heading Embed shows "Unable to find", both sentinels, no Long Note text, no warning', () => {
		for (let i = 0; i < 3; i++) {
			const page = html(base, i, 'Embeds/Missing Heading Embed.md');
			const text = readPage(page).text;
			expect(text).toContain('Unable to find “No Such Heading” in Long Note');
			expect(text).toContain('FX-F14-BEFORE');
			expect(text).toContain('FX-F14-AFTER');
			for (let k = 1; k <= 6; k++) expect(text, `FX-LONG-${k}`).not.toContain(`FX-LONG-${k}`);
			expect(page).not.toContain('owe-export-placeholder');
			const e = new JSDOM(page).window.document.querySelector('.markdown-embed');
			expect(e?.hasAttribute('data-type')).toBe(false);
			expect(
				warnings(base, i).filter((w) => w.includes('No Such Heading') || w.includes('Missing Heading')),
			).toEqual([]);
		}
	});

	it("US-002 AC-14: Front Note: its frontmatter before the sizer, none inside; Front Embed: no frontmatter, embed holds FX-F12, no 'probe'", () => {
		for (let i = 0; i < 3; i++) {
			const fn = docOf(base, i, 'Plain/Front Note.md');
			expect(fn.querySelectorAll(':scope > .frontmatter')).toHaveLength(1);
			expect(fn.querySelectorAll('.markdown-preview-sizer .frontmatter')).toHaveLength(0);
			expect(fn.textContent).toContain('FX-F12');
			const fe = docOf(base, i, 'Embeds/Front Embed.md');
			expect(fe.querySelectorAll('.frontmatter')).toHaveLength(0);
			expect(fe.querySelector('.markdown-embed')?.textContent ?? '').toContain('FX-F12');
			expect(fe.textContent).not.toContain('probe');
		}
	});

	it('US-002 AC-15: Folded Callout: FX-F15 inside a callout that is collapsed', () => {
		for (let i = 0; i < 3; i++) {
			const c = docOf(base, i, 'Composed/Folded Callout.md').querySelector('.callout');
			expect(c, 'callout present').not.toBeNull();
			expect(c?.classList.contains('is-collapsed')).toBe(true);
			expect(c?.textContent ?? '').toContain('FX-F15');
		}
	});
});
