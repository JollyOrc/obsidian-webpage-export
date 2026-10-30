/** US-001 AC-8b: the report the injected script writes to `/output/.run-report.json`. */
export interface RunReport {
	obsidianVersion: string;
	startedAt: string;
	endedAt: string;
	exported: boolean;
	warnings: string[];
	errors: string[];
}

/** US-001 AC-8b: a read report, or the reason the run counts as failed. */
export type ReportResult = { ok: true; report: RunReport } | { ok: false; reason: 'no run report' };

const NO_REPORT = { ok: false, reason: 'no run report' } as const;

/**
 * US-001 AC-8b: reads the run report; a missing file (`undefined`), invalid
 * JSON or a missing or mistyped required field is `no run report`, never a
 * pass. `exported: false` is a valid report of a failed export.
 */
export function parseRunReport(text: string | undefined): ReportResult {
	if (text === undefined) return NO_REPORT;
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch {
		return NO_REPORT;
	}
	if (typeof data !== 'object' || data === null) return NO_REPORT;
	const r = data as Record<string, unknown>;
	const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
	if (
		typeof r.obsidianVersion !== 'string' ||
		typeof r.startedAt !== 'string' ||
		typeof r.endedAt !== 'string' ||
		typeof r.exported !== 'boolean' ||
		!strings(r.warnings) ||
		!strings(r.errors)
	) {
		return NO_REPORT;
	}
	return {
		ok: true,
		report: {
			obsidianVersion: r.obsidianVersion,
			startedAt: r.startedAt,
			endedAt: r.endedAt,
			exported: r.exported,
			warnings: r.warnings,
			errors: r.errors,
		},
	};
}

const FALLBACK = /Failed to render all sections in file (.+), using fallback!/;

/**
 * US-001 AC-8b, AC-11: the file names of the notes the exporter rendered
 * with its fallback, in report order.
 *
 * Matches the exact sentence of `render-api.ts` anywhere in a warning (the
 * capture adds a `[WARNING]` prefix, measured 2026-10-30); other warnings
 * are ignored (SCAR-026).
 */
export function fallbackNotes(report: RunReport): string[] {
	return report.warnings.flatMap((w) => {
		const m = FALLBACK.exec(w);
		return m ? [m[1]] : [];
	});
}
