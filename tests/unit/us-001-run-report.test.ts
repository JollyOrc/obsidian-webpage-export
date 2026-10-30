import { describe, expect, it } from 'vitest';
import { fallbackNotes, parseRunReport } from '../../tools/headless/run-report';

// US-001 AC-8b: the injected script writes /output/.run-report.json; a
// missing or unparsable report is a failed run, never a pass.

const valid = {
	obsidianVersion: '1.14.5',
	startedAt: '2026-10-30T12:00:00.000Z',
	endedAt: '2026-10-30T12:00:17.000Z',
	exported: true,
	warnings: ['Failed to render all sections in file Big Page.md, using fallback!'],
	errors: [],
};

describe('US-001 AC-8b: run report', () => {
	it('US-001 AC-8b: a valid report is read with every field', () => {
		const r = parseRunReport(JSON.stringify(valid));
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.report.obsidianVersion).toBe('1.14.5');
		expect(r.report.exported).toBe(true);
		expect(r.report.warnings).toHaveLength(1);
		expect(r.report.startedAt).toBe(valid.startedAt);
		expect(r.report.endedAt).toBe(valid.endedAt);
	});

	it('US-001 AC-8b: a missing report fails with `no run report`', () => {
		expect(parseRunReport(undefined)).toEqual({ ok: false, reason: 'no run report' });
	});

	it('US-001 AC-8b: an unparsable report fails with `no run report`', () => {
		expect(parseRunReport('{"obsidianVersion": "1.14.5", ')).toEqual({ ok: false, reason: 'no run report' });
	});

	it('US-001 AC-8b: a report without a required field fails with `no run report`', () => {
		const { exported: _dropped, ...partial } = valid;
		expect(parseRunReport(JSON.stringify(partial))).toEqual({ ok: false, reason: 'no run report' });
	});

	it('US-001 AC-8b: exported=false is read as a failed export, not a pass', () => {
		const r = parseRunReport(JSON.stringify({ ...valid, exported: false }));
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.report.exported).toBe(false);
	});

	it('US-001 AC-8b: the fallback warning names the note', () => {
		const r = parseRunReport(
			JSON.stringify({
				...valid,
				warnings: [
					'Failed to render all sections in file Big Page.md, using fallback!',
					'Creating an RSS feed requires a site url to be set in the export settings.',
					'Failed to render all sections in file Spells now hexmaps too!.md, using fallback!',
				],
			}),
		);
		expect(r.ok).toBe(true);
		if (r.ok) expect(fallbackNotes(r.report)).toEqual(['Big Page.md', 'Spells now hexmaps too!.md']);
	});
});
