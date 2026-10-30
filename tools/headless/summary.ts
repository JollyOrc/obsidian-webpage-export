import type { PageFacts } from '../../tests/support/html-reader';

/** US-001 AC-11: what one run observed. */
export interface RunObservation {
	/** File names from the fallback warnings (`Big Page.md`). */
	fallbackNotes: string[];
	/** Vault paths of the notes whose page was written (`Composed/Big Page.md`). */
	writtenPages: string[];
}

/** US-001 AC-11: per note, counted over all runs. */
export interface NoteSummary {
	fallback: string;
	written: string;
}

/** US-001 AC-11: the file name of a vault path (`A/B/Note.md` → `Note.md`). */
function fileName(path: string): string {
	return path.slice(path.lastIndexOf('/') + 1);
}

/**
 * US-001 AC-11: counts per note in how many runs it went to the fallback and
 * in how many its page was written: `fallback: k/n`, `written: k/n`.
 *
 * The fallback warning names only the file, so it is credited to the note
 * with that file name. Two notes with the same file name are refused
 * (`duplicate note name: <name>`); the fixture keeps names unique (AC-6,
 * SCAR-011).
 */
export function summarizeRuns(notes: string[], runs: RunObservation[]): Record<string, NoteSummary> {
	const seen = new Set<string>();
	for (const n of notes) {
		const f = fileName(n);
		if (seen.has(f)) throw new Error(`duplicate note name: ${f}`);
		seen.add(f);
	}
	const out: Record<string, NoteSummary> = {};
	for (const n of notes) {
		const fb = runs.filter((r) => r.fallbackNotes.includes(fileName(n))).length;
		const wr = runs.filter((r) => r.writtenPages.includes(n)).length;
		out[n] = { fallback: `fallback: ${fb}/${runs.length}`, written: `written: ${wr}/${runs.length}` };
	}
	return out;
}

/**
 * US-001 AC-13: the problems of one page against what it must hold.
 *
 * `empty map block` when any map block has no `<svg>` (SCAR-015 blank
 * case); `map blocks: <found> of <expected>` when fewer blocks than expected
 * were written. An empty list means the page passed.
 */
export function checkPage(page: PageFacts, expected: { mapBlocks?: number }): string[] {
	const problems: string[] = [];
	if (page.emptyMapBlocks > 0) problems.push('empty map block');
	if (expected.mapBlocks !== undefined && page.mapBlocks < expected.mapBlocks) {
		problems.push(`map blocks: ${page.mapBlocks} of ${expected.mapBlocks}`);
	}
	return problems;
}
