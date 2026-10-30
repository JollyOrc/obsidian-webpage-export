/** Result of comparing the upstream lint count with its baseline. */
export interface BaselineResult {
	ok: boolean;
	message: string;
}

/**
 * US-001 | AC-2: Upstream lint findings may not grow beyond the baseline.
 *
 * Compares the counted findings of the upstream paths with the recorded
 * baseline. Transforms (SCAR-001): none of the inputs; the result is one of
 * - `count === baseline`: ok, empty message;
 * - `count > baseline`: not ok, `upstream lint findings <count> > baseline <baseline>`;
 * - `count < baseline`: ok, `upstream lint findings <count> < baseline <baseline>: lower the baseline`.
 * The baseline file is never rewritten here (decision D3).
 */
export function compareUpstreamLint(count: number, baseline: number): BaselineResult {
	if (count > baseline) {
		return { ok: false, message: `upstream lint findings ${count} > baseline ${baseline}` };
	}
	if (count < baseline) {
		return { ok: true, message: `upstream lint findings ${count} < baseline ${baseline}: lower the baseline` };
	}
	return { ok: true, message: '' };
}
