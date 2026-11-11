// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
	LIMIT_MS,
	QUIET_MS,
	decideCopy,
	hasOutput,
	unfinishedWarning,
	type BlockState,
} from '../../src/core/render/blocks';

// US-004 AC-1, AC-2, AC-4, AC-5 and D1–D5: when a plugin block counts as
// having output, when a page may be copied, and what is reported at the
// limit. Pure rules; the wiring into the render is covered by the
// integration test (AC-6) and the repository test.

const block = (inner: string): HTMLElement => {
	const el = document.createElement('div');
	el.className = 'block-language-fx-steps';
	el.innerHTML = inner;
	return el;
};
const STYLE = '<style scope=" ">.card { color: red }</style>';
const state = (s: Partial<BlockState>): BlockState => ({
	firstClass: 'block-language-fx-steps',
	hasOutput: true,
	lastChange: 0,
	...s,
});

describe('US-004 AC-1: a block holding only non-content has no output (D1)', () => {
	it('US-004 AC-1: a block whose only child is the <style> of the example has no output', () => {
		expect(hasOutput(block(STYLE))).toBe(false);
	});

	it('US-004 AC-1: the same block with <style>…</style><div class="card">Ready</div> has output', () => {
		expect(hasOutput(block(`${STYLE}<div class="card">Ready</div>`))).toBe(true);
	});

	it('US-004 AC-1: <script>, <link>, comments and whitespace text alone are no output', () => {
		const b = block(`${STYLE}<script>1</script>\n  <link rel="stylesheet" href="x.css"><!-- c -->\n`);
		expect(b.childNodes.length).toBeGreaterThan(4); // every kind is really present
		expect(hasOutput(b)).toBe(false);
	});

	it('US-004 AC-1: an empty block has no output', () => {
		expect(hasOutput(block(''))).toBe(false);
	});

	it('US-004 AC-1: a text node other than whitespace is output', () => {
		expect(hasOutput(block(`${STYLE}x`))).toBe(true);
	});

	it('US-004 AC-1: any other element is output, even an empty one (the quiet time of AC-2 waits for its content)', () => {
		expect(hasOutput(block(`${STYLE}<div class="card"></div>`))).toBe(true);
		expect(hasOutput(block('<span></span>'))).toBe(true);
	});

	it("US-004 AC-1: only the block's own children count: a <style> inside a <div> makes the <div> output", () => {
		expect(hasOutput(block(`<div>${STYLE}</div>`))).toBe(true);
	});
});

describe('US-004 AC-2, AC-5: when the page is copied (D2 150 ms, D3 5 000 ms)', () => {
	it('US-004 D2, D3: the quiet time is 150 ms and the limit 5 000 ms, fixed', () => {
		expect(QUIET_MS).toBe(150);
		expect(LIMIT_MS).toBe(5000);
	});

	it('US-004 AC-5: a note without plugin blocks is copied at once, without the quiet time', () => {
		expect(decideCopy([], 1000, 1000)).toEqual({ action: 'copy' });
	});

	it('US-004 AC-2: every block has output, the last change 149 ms ago → wait; 150 ms ago → copy', () => {
		expect(decideCopy([state({ lastChange: 1000 })], 1149, 900)).toEqual({ action: 'wait' });
		expect(decideCopy([state({ lastChange: 1000 })], 1150, 900)).toEqual({ action: 'copy' });
	});

	it('US-004 AC-2: a block without output keeps the page waiting, however long the others are quiet', () => {
		const blocks = [state({ lastChange: 0 }), state({ hasOutput: false, lastChange: 0 })];
		expect(decideCopy(blocks, 4000, 0)).toEqual({ action: 'wait' });
	});

	it('US-004 AC-3 (b): two blocks, the second changed 100 ms ago while the first is quiet → wait', () => {
		const blocks = [state({ lastChange: 300 }), state({ lastChange: 900 })];
		expect(decideCopy(blocks, 1000, 0)).toEqual({ action: 'wait' });
		expect(decideCopy(blocks, 1050, 0)).toEqual({ action: 'copy' });
	});

	it('US-004 AC-2: the limit counts from the end of the render (start), not from the last change', () => {
		const changing = [state({ lastChange: 5100 })];
		expect(decideCopy(changing, 5150, 200)).toEqual({ action: 'wait' }); // 4 950 ms after start
	});
});

describe('US-004 AC-4: at the limit, each unfinished block is reported once (D4, D5)', () => {
	it('US-004 AC-4 / D5: a block with only its <style> at the limit → limit, reason "no output"', () => {
		expect(decideCopy([state({ hasOutput: false, lastChange: 10 })], 5000, 0)).toEqual({
			action: 'limit',
			unfinished: [{ firstClass: 'block-language-fx-steps', reason: 'no output' }],
		});
	});

	it('US-004 AC-4: a block still changing 10 ms before the limit → limit, reason "still changing"', () => {
		expect(decideCopy([state({ lastChange: 4990 })], 5000, 0)).toEqual({
			action: 'limit',
			unfinished: [{ firstClass: 'block-language-fx-steps', reason: 'still changing' }],
		});
	});

	it('US-004 AC-4: only the unfinished blocks are listed, each once, in page order', () => {
		const blocks = [
			state({ firstClass: 'block-language-a', lastChange: 100 }),
			state({ firstClass: 'block-language-b', hasOutput: false }),
			state({ firstClass: 'block-language-c', lastChange: 4950 }),
		];
		expect(decideCopy(blocks, 5000, 0)).toEqual({
			action: 'limit',
			unfinished: [
				{ firstClass: 'block-language-b', reason: 'no output' },
				{ firstClass: 'block-language-c', reason: 'still changing' },
			],
		});
	});

	it('US-004 AC-4: at the limit with every block finished, the page is copied without a report', () => {
		expect(decideCopy([state({ lastChange: 4800 })], 5000, 0)).toEqual({ action: 'copy' });
	});

	it("US-004 AC-4 / D4: the warning text names the block's first class, the note, the limit and the reason", () => {
		expect(unfinishedWarning('block-language-fx-steps', 'Steps/Step Nothing.md', 'no output')).toBe(
			'Plugin block block-language-fx-steps in Steps/Step Nothing.md did not finish within 5000 ms (no output)',
		);
		expect(unfinishedWarning('block-language-dataviewjs', 'A/B c.md', 'still changing')).toBe(
			'Plugin block block-language-dataviewjs in A/B c.md did not finish within 5000 ms (still changing)',
		);
	});
});
