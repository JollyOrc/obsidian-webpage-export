/** US-004 | D2: how long no plugin block may change before the page is copied (fixed, not a setting). */
export const QUIET_MS = 150;

/** US-004 | D3: the most a note waits for its plugin blocks, from the end of the render (US-002 AC-3). */
export const LIMIT_MS = 5000;

/** US-004 | AC-4: why a block had not finished at the limit. */
export type UnfinishedReason = 'no output' | 'still changing';

/** US-004 | AC-2: what the render path knows about one plugin block at a poll. */
export interface BlockState {
	/** The block element's first class (`block-language-<language>`). */
	firstClass: string;
	/** Whether the block has output by AC-1's rule (`hasOutput`). */
	hasOutput: boolean;
	/** When the block's subtree last changed, in the same clock as `now` and `start`. */
	lastChange: number;
}

/** US-004 | AC-2, AC-4: the decision of one poll. */
export type CopyDecision =
	| { action: 'wait' }
	| { action: 'copy' }
	| { action: 'limit'; unfinished: { firstClass: string; reason: UnfinishedReason }[] };

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
/** US-004 | D1: elements that are no output of a block. */
const NOT_OUTPUT = new Set(['STYLE', 'SCRIPT', 'LINK']);

/**
 * US-004 | AC-1 (D1): Whether a plugin block holds output.
 *
 * True when one of the block's direct children is an element other than
 * `<style>`, `<script>` or `<link>`, or a text node with text other than
 * whitespace. Comments and other nodes never count. Only direct children are
 * read: an element that itself holds only a `<style>` is output, and an empty
 * element is output too (the quiet time of AC-2 waits for its content).
 */
export function hasOutput(block: Element): boolean {
	for (const node of Array.from(block.childNodes)) {
		if (node.nodeType === ELEMENT_NODE && !NOT_OUTPUT.has((node as Element).tagName.toUpperCase())) return true;
		if (node.nodeType === TEXT_NODE && (node.textContent ?? '').trim() !== '') return true;
	}
	return false;
}

/**
 * US-004 | AC-2, AC-4, AC-5 (D2, D3, D5): Whether the page may be copied now.
 *
 * `start` is the end of `MarkdownRenderer.render`; `now` and every
 * `lastChange` use the same clock. No blocks: copy at once (AC-5). Every
 * block with output and no change for `QUIET_MS` or longer: copy. Otherwise,
 * once `LIMIT_MS` have passed since `start`: limit, listing in page order each
 * block without output (`no output`) or changed less than `QUIET_MS` ago
 * (`still changing`); finished blocks are not listed. Otherwise: wait.
 * Reports nothing itself (SCAR-038).
 */
export function decideCopy(blocks: BlockState[], now: number, start: number): CopyDecision {
	if (blocks.length === 0) return { action: 'copy' };
	const quiet = (b: BlockState): boolean => now - b.lastChange >= QUIET_MS;
	if (blocks.every((b) => b.hasOutput && quiet(b))) return { action: 'copy' };
	if (now - start < LIMIT_MS) return { action: 'wait' };
	const unfinished: { firstClass: string; reason: UnfinishedReason }[] = [];
	for (const b of blocks) {
		if (!b.hasOutput) unfinished.push({ firstClass: b.firstClass, reason: 'no output' });
		else if (!quiet(b)) unfinished.push({ firstClass: b.firstClass, reason: 'still changing' });
	}
	return { action: 'limit', unfinished };
}

/**
 * US-004 | AC-4 (D4): The warning for one block that did not finish.
 *
 * `Plugin block <firstClass> in <notePath> did not finish within <LIMIT_MS> ms (<reason>)`.
 * Formats only; the render path writes it once per block.
 */
export function unfinishedWarning(firstClass: string, notePath: string, reason: UnfinishedReason): string {
	return `Plugin block ${firstClass} in ${notePath} did not finish within ${LIMIT_MS} ms (${reason})`;
}
