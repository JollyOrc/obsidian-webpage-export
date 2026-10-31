import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
	buildImage,
	imagePluginChecksums,
	pagePath,
	runHeadless,
	type HeadlessResult,
} from '../../tools/headless/runner';
import { checkPage } from '../../tools/headless/summary';
import { readPage } from '../support/html-reader';

// US-001 AC-8 to AC-14 against a real headless Obsidian (Docker).
// Time limits (SCAR-030), from the spike (docs/technical/spike-docker.md):
// image build 2.5 min uncached → 600 s; one export run 15 to 19 s, capped at
// 120 s by the runner (AC-10) → 150 s per test; three runs → 400 s.
const BUILD_LIMIT = 600_000;
const RUN_LIMIT = 150_000;
const FIXTURE = 'tests/fixtures/vault';

const sha = (b: Buffer): string => createHash('sha256').update(b).digest('hex');

/** Checksum list of the fixture vault, `.obsidian/plugins` included (AC-9). */
function checksums(dir: string): Record<string, string> {
	const out: Record<string, string> = {};
	const walk = (d: string): void => {
		for (const name of readdirSync(d)) {
			const p = join(d, name);
			if (statSync(p).isDirectory()) walk(p);
			else out[relative(dir, p)] = sha(readFileSync(p));
		}
	};
	walk(dir);
	return out;
}

type Manifest = { notes: { path: string }[] };
const manifest = (): Manifest => JSON.parse(readFileSync(join(FIXTURE, 'fixture-manifest.json'), 'utf8')) as Manifest;

let tag = '';
let before: Record<string, string> = {};
let single: HeadlessResult;

beforeAll(async () => {
	tag = (await buildImage()).tag;
	before = checksums(FIXTURE);
	single = await runHeadless({ image: tag, vault: FIXTURE, runs: 1 });
}, BUILD_LIMIT + RUN_LIMIT);

describe('US-001 AC-8: image of the fork build', () => {
	it('US-001 AC-8: tag is the short commit, with -dirty for a changed tree', () => {
		expect(tag).toMatch(/^owe:[0-9a-f]{7,}(-dirty)?$/);
	});

	it(
		'US-001 AC-8: the image plugin files equal the local npm run build output',
		async () => {
			const inImage = await imagePluginChecksums(tag);
			for (const f of ['main.js', 'manifest.json', 'styles.css']) {
				expect(inImage[f], f).toBe(sha(readFileSync(f)));
			}
		},
		RUN_LIMIT,
	);
});

describe('US-001 AC-8b: run report', () => {
	it('US-001 AC-8b: the run writes a report: exported, Obsidian 1.14.5, start before end', () => {
		const run = single.runs[0];
		expect(run.status).toBe('ok');
		expect(run.report.ok).toBe(true);
		if (!run.report.ok) return;
		expect(run.report.report.exported).toBe(true);
		expect(run.report.report.obsidianVersion).toBe('1.14.5');
		expect(Date.parse(run.report.report.startedAt)).toBeLessThan(Date.parse(run.report.report.endedAt));
	});
});

describe('US-001 AC-9: runs on a copy', () => {
	it('US-001 AC-9: the mounted vault is a temporary copy, not the fixture', () => {
		expect(resolve(single.runs[0].mountedVault)).not.toBe(resolve(FIXTURE));
		expect(existsSync(single.runs[0].mountedVault)).toBe(false); // removed after the run
	});

	it('US-001 AC-9: the fixture checksum list is unchanged after the run', () => {
		expect(checksums(FIXTURE)).toEqual(before);
	});

	it('US-001 AC-9: output goes to tests/.output/<run-id>/', () => {
		expect(relative('tests/.output', single.runs[0].outputDir)).toMatch(/^[^./][^/]*$/);
	});
});

describe('US-001 AC-13: what the single run must contain', () => {
	it('US-001 AC-13: every fixture note has a page (count equals the manifest)', () => {
		const notes = manifest().notes.map((n) => n.path);
		const missing = notes.filter((n) => !existsSync(join(single.runs[0].outputDir, pagePath(n))));
		expect(notes.length).toBeGreaterThanOrEqual(19);
		expect(missing).toEqual([]);
	});

	it('US-001 AC-13: F1 page: 1 map block with an svg, labels and sentinels', () => {
		const r = readPage(readFileSync(join(single.runs[0].outputDir, pagePath('Maps/Map Alpha.md')), 'utf8'));
		expect(r.mapBlocks).toBe(1);
		expect(r.emptyMapBlocks).toBe(0);
		for (const t of ['Alpha', 'Beta', 'Gamma', 'FX-F1-BEFORE', 'FX-F1-AFTER']) expect(r.text).toContain(t);
	});

	it('US-001 AC-13: F9 page has FX-F9', () => {
		const r = readPage(readFileSync(join(single.runs[0].outputDir, pagePath('Plain/Control.md')), 'utf8'));
		expect(r.text).toContain('FX-F9');
	});

	it('US-001 AC-13: blank-case guard: a page with an empty map block is reported `empty map block`', () => {
		const blank = readPage(
			'<div class="markdown-preview-sizer"><div class="block-language-text-mapper"></div></div>',
		);
		expect(checkPage(blank, { mapBlocks: 1 })).toContain('empty map block');
		const full = readPage(
			'<div class="markdown-preview-sizer"><div class="block-language-text-mapper"><svg></svg></div></div>',
		);
		expect(checkPage(full, { mapBlocks: 1 })).toEqual([]);
	});
});

// US-001 AC-14 withdrawn (US-002 amendment 1, 2026-10-31): the export no
// longer renders in the reading view, so "sections not drawn" cannot occur
// and `maxPreviewHeight` no longer exists.
