import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildImage, pagePath, runHeadless, type HeadlessResult } from '../../tools/headless/runner';

// US-004 against the headless Obsidian 1.14.5, every criterion in 3 of 3
// runs (the failure varied between runs on the desktop, M11). The blocks are
// drawn by the fixture's own plugin `fx-steps` (AC-6), which puts a <style>
// into each block before its output, as Dataview's dv.view does.
// Time limits (SCAR-030): image build 600 s (US-001); one run: US-002's
// 10–15 s plus the two 5 000 ms limits of S7 and S8 and two blocks of about
// 0.3–0.7 s; the runner caps a run at 120 s → 3 runs 450 s as US-002.
const BUILD_LIMIT = 600_000;
const THREE_RUNS = 450_000;
const VAULT = 'tests/fixtures/vault';
/** US-004 AC-2: the finished output of an `fx-steps` block, as the story's example. */
const CARD = '<div class="card" data-step="2">Ready</div>';
const STYLE_TEXT = '.card { color: red }';
const US004_WARNING = /^Plugin block (\S+) in (.+) did not finish within 5000 ms \((no output|still changing)\)$/;

const docOf = (r: HeadlessResult, run: number, note: string): Document =>
	new JSDOM(readFileSync(join(r.runs[run].outputDir, pagePath(note)), 'utf8')).window.document;
const warnings = (r: HeadlessResult, run: number): string[] => {
	const rep = r.runs[run].report;
	return rep.ok ? rep.report.warnings : [];
};
/** The `fx-steps` blocks of a page, in page order. */
const blocksOf = (d: Document): Element[] => Array.from(d.querySelectorAll('.block-language-fx-steps'));
/** US-004 AC-2: a block is exported finished when it holds the style and exactly the example card. */
const finished = (b: Element): boolean => {
	const cards = b.querySelectorAll('.card');
	return b.querySelector('style')?.textContent === STYLE_TEXT && cards.length === 1 && cards[0].outerHTML === CARD;
};
/** Per run, for `note`: how many fx-steps blocks the page has and how many are finished. */
const counts = (r: HeadlessResult, note: string): { blocks: number; finished: number }[] =>
	r.runs.map((_, i) => {
		const bs = blocksOf(docOf(r, i, note));
		return { blocks: bs.length, finished: bs.filter(finished).length };
	});

let base: HeadlessResult;
beforeAll(async () => {
	if (!existsSync(join(VAULT, '.obsidian/plugins/fx-steps/main.js'))) {
		throw new Error('fixture plugin fx-steps missing: run npm run fixtures (US-004 AC-6)');
	}
	const tag = (await buildImage()).tag;
	base = await runHeadless({ image: tag, vault: VAULT, runs: 3 });
}, BUILD_LIMIT + THREE_RUNS);

describe('US-004 plugin blocks finish before the copy (3 runs)', () => {
	it('US-004 AC-2: Step Block exports its block as <style>…</style><div class="card" data-step="2">Ready</div>', () => {
		expect(base.runs.every((r) => r.status === 'ok')).toBe(true);
		expect(counts(base, 'Steps/Step Block.md')).toEqual(Array(3).fill({ blocks: 1, finished: 1 }));
		const b = blocksOf(docOf(base, 0, 'Steps/Step Block.md'))[0];
		expect(Array.from(b.children).map((c) => c.tagName)).toEqual(['STYLE', 'DIV']);
	});

	it('US-004 AC-3 (a): the block inside the embedded Step Card is finished', () => {
		expect(counts(base, 'Steps/Embed Step Card.md')).toEqual(Array(3).fill({ blocks: 1, finished: 1 }));
		for (let i = 0; i < 3; i++) {
			const b = blocksOf(docOf(base, i, 'Steps/Embed Step Card.md'))[0];
			expect(b.closest('.markdown-embed'), `run ${i + 1}`).not.toBeNull();
		}
	});

	it('US-004 AC-3 (b): both blocks of Two Step Blocks are finished (the second 400 ms after the first)', () => {
		expect(counts(base, 'Steps/Two Step Blocks.md')).toEqual(Array(3).fill({ blocks: 2, finished: 2 }));
	});

	it('US-004 AC-3 (c): the block inside the callout is finished', () => {
		expect(counts(base, 'Steps/Step Block In Callout.md')).toEqual(Array(3).fill({ blocks: 1, finished: 1 }));
		const b = blocksOf(docOf(base, 0, 'Steps/Step Block In Callout.md'))[0];
		expect(b.closest('.callout')).not.toBeNull();
	});

	it('US-004 AC-3 (d): Step Card embedded twice: both copies of the block are finished', () => {
		expect(counts(base, 'Steps/Step Card Twice.md')).toEqual(Array(3).fill({ blocks: 2, finished: 2 }));
	});

	it('US-004 AC-4: exactly two US-004 warnings per run: Step Nothing (no output) and Step Forever (still changing)', () => {
		for (let i = 0; i < 3; i++) {
			const ours = warnings(base, i)
				.filter((w) => US004_WARNING.test(w))
				.sort();
			expect(ours, `run ${i + 1}`).toEqual([
				'Plugin block block-language-fx-steps in Steps/Step Forever.md did not finish within 5000 ms (still changing)',
				'Plugin block block-language-fx-steps in Steps/Step Nothing.md did not finish within 5000 ms (no output)',
			]);
		}
	});

	it('US-004 AC-4: no upstream "not rendered correctly" warning for any step note (SCAR-038: reported once)', () => {
		for (let i = 0; i < 3; i++) {
			expect(
				warnings(base, i).filter((w) => w.includes('not rendered correctly') && w.includes('Step')),
				`run ${i + 1}`,
			).toEqual([]);
		}
	});

	it('US-004 AC-4: at the limit the page is copied as it is: Step Nothing keeps only its <style>', () => {
		for (let i = 0; i < 3; i++) {
			const b = blocksOf(docOf(base, i, 'Steps/Step Nothing.md'));
			expect(b, `run ${i + 1}`).toHaveLength(1);
			expect(Array.from(b[0].children).map((c) => c.tagName)).toEqual(['STYLE']);
		}
	});
});
