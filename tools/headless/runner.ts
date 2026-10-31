import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runWithLimit } from './limit';
import { fallbackNotes, parseRunReport, type ReportResult } from './run-report';
import { summarizeRuns, type NoteSummary } from './summary';

/** US-001 AC-8: Obsidian version in the test image (D5, measured 2026-10-30). */
export const OBSIDIAN_VERSION = '1.14.5';

const PLUGIN_FILES = ['main.js', 'manifest.json', 'styles.css'];
const EXPORT_SCRIPT = resolve('tools/headless/export-report.mjs');

/** US-001 AC-9 to AC-11: one headless run. */
export interface HeadlessRun {
	id: string;
	status: 'ok' | 'failed' | 'timeout';
	message: string;
	outputDir: string;
	/** The temporary copy that was mounted; removed after the run. */
	mountedVault: string;
	report: ReportResult;
}

/** US-001 AC-11: all runs, their summary per note and the Obsidian version reported. */
export interface HeadlessResult {
	runs: HeadlessRun[];
	summary: Record<string, NoteSummary>;
	obsidianVersion: string;
}

/** Runs a command; throws with its output on a non-zero exit. */
function sh(cmd: string, args: string[]): string {
	const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
	if (r.status !== 0)
		throw new Error(`${cmd} ${args.join(' ')} failed (${String(r.status)}): ${r.stderr.slice(-2000)}`);
	return r.stdout;
}

/**
 * US-001 AC-8: the image tag `owe:<short commit>[-dirty]`.
 *
 * `-dirty` when `git status --porcelain` lists anything, so an image of
 * uncommitted code is never mistaken for one of the commit.
 */
export function imageTag(): string {
	const commit = sh('git', ['rev-parse', '--short', 'HEAD']).trim();
	const dirty = sh('git', ['status', '--porcelain']).trim() !== '';
	return `owe:${commit}${dirty ? '-dirty' : ''}`;
}

/**
 * US-001 AC-8: builds the test image from the repository's Dockerfile with
 * the local build output and Obsidian 1.14.5.
 *
 * Copies `main.js`, `manifest.json`, `styles.css` (the current `npm run
 * build` output; the gate builds before `test:integration`) into a
 * temporary folder passed as the BuildKit context `localplugin`
 * (`.dockerignore` excludes `main.js` from the main context) and selects the
 * `plugin-local` stage. Always builds; Docker's cache makes an unchanged
 * build fast, and a changed `main.js` is never served from a stale image.
 */
export async function buildImage(): Promise<{ tag: string }> {
	for (const f of PLUGIN_FILES) if (!existsSync(f)) throw new Error(`${f} missing: run npm run build first`);
	const ctx = mkdtempSync(join(tmpdir(), 'owe-plugin-'));
	try {
		for (const f of PLUGIN_FILES) cpSync(f, join(ctx, f));
		const tag = imageTag();
		sh('docker', [
			'build',
			'--build-arg',
			'PLUGIN_STAGE=plugin-local',
			'--build-arg',
			`OBSIDIAN_VERSION=${OBSIDIAN_VERSION}`,
			'--build-context',
			`localplugin=${ctx}`,
			'-t',
			tag,
			'.',
		]);
		return { tag };
	} finally {
		rmSync(ctx, { recursive: true, force: true });
	}
}

/** US-001 AC-8: sha256 of the plugin files inside the image (`/plugin/<file>`). */
export async function imagePluginChecksums(tag: string): Promise<Record<string, string>> {
	const out = sh('docker', [
		'run',
		'--rm',
		'--entrypoint',
		'sha256sum',
		tag,
		...PLUGIN_FILES.map((f) => `/plugin/${f}`),
	]);
	const sums: Record<string, string> = {};
	for (const line of out.trim().split('\n')) {
		const [hash, path] = line.trim().split(/\s+/);
		sums[path.replace('/plugin/', '')] = hash;
	}
	return sums;
}

/**
 * US-001 AC-13: the exported page of a vault note.
 *
 * Transforms (SCAR-001), measured on the export of the fixture vault
 * (2026-10-30): every path part lower case, spaces to `-`, `.md` to `.html`
 * (`Composed/Big Page.md` → `composed/big-page.html`). Other characters are
 * kept (`!` measured in the spike); characters the fixture does not use are
 * not covered.
 */
export function pagePath(note: string): string {
	return note.toLowerCase().replace(/ /g, '-').replace(/\.md$/, '.html');
}

type Manifest = { notes: { path: string }[] };

/**
 * US-001 AC-9 to AC-11, AC-14: exports `vault` `runs` times in the headless
 * Obsidian and reports per run and per note.
 *
 * Each run: a fresh temporary copy of the vault (the image writes the plugin
 * into it) is mounted with a fresh `tests/.output/<run-id>/`, the injected
 * script of AC-8b replaces the image's, the container is limited to
 * `limitMs` (AC-10) and killed by name at the limit; the copy is removed
 * afterwards. `exportOptions` (US-002) are written as the plugin's
 * `data.json` into the copy. The vault itself is only read. Requires the third-party plugins
 * in the vault (`npm run fixtures:plugins`).
 */
export async function runHeadless(opts: {
	image: string;
	vault: string;
	runs?: number;
	limitMs?: number;
	exportOptions?: Record<string, unknown>;
}): Promise<HeadlessResult> {
	const runsWanted = opts.runs ?? 1;
	const plugins = join(opts.vault, '.obsidian', 'plugins');
	if (!existsSync(join(plugins, 'text-mapper')) || !existsSync(join(plugins, 'obsidian-meta-bind-plugin'))) {
		throw new Error('third-party plugins missing in the vault: run npm run fixtures:plugins');
	}
	const notes = (JSON.parse(readFileSync(join(opts.vault, 'fixture-manifest.json'), 'utf8')) as Manifest).notes.map(
		(n) => n.path,
	);
	const runs: HeadlessRun[] = [];
	for (let i = 0; i < runsWanted; i++) {
		const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}-${i + 1}`;
		const outputDir = resolve('tests/.output', id);
		mkdirSync(outputDir, { recursive: true });
		const mountedVault = mkdtempSync(join(tmpdir(), 'owe-vault-'));
		cpSync(opts.vault, mountedVault, { recursive: true });
		if (opts.exportOptions) {
			// US-002 AC-6, AC-10: export options reach the plugin as its data.json
			// (merged into the defaults, measured); the plugin files go beside it
			// so the image's start script does not skip the folder.
			const dir = join(mountedVault, '.obsidian', 'plugins', 'webpage-html-export');
			mkdirSync(dir, { recursive: true });
			for (const f of PLUGIN_FILES) cpSync(f, join(dir, f));
			writeFileSync(join(dir, 'data.json'), JSON.stringify({ exportOptions: opts.exportOptions }));
		}
		const logPath = join(outputDir, 'container.log');
		const name = `owe-run-${process.pid}-${i + 1}`;
		try {
			const limited = await runWithLimit({
				logPath,
				limitMs: opts.limitMs,
				start: () => {
					const log: Buffer[] = [];
					const child = spawn('docker', [
						'run',
						'--rm',
						'--name',
						name,
						'-e',
						'EXPORT_ENTIRE_VAULT=1',
						'-v',
						`${mountedVault}:/vault`,
						'-v',
						`${outputDir}:/output`,
						'-v',
						`${EXPORT_SCRIPT}:/export-vault.mjs:ro`,
						opts.image,
					]);
					child.stdout.on('data', (d: Buffer) => log.push(d));
					child.stderr.on('data', (d: Buffer) => log.push(d));
					return {
						done: new Promise<number>((res) =>
							child.on('close', (code) => {
								writeFileSync(logPath, Buffer.concat(log));
								res(code ?? 1);
							}),
						),
						kill: () => {
							spawnSync('docker', ['kill', name]);
						},
					};
				},
			});
			const reportFile = join(outputDir, '.run-report.json');
			const report = parseRunReport(existsSync(reportFile) ? readFileSync(reportFile, 'utf8') : undefined);
			let status = limited.status;
			let message = limited.message;
			if (status === 'ok' && !report.ok) {
				status = 'failed';
				message = `no run report; log: ${logPath}`;
			} else if (status === 'ok' && report.ok && !report.report.exported) {
				status = 'failed';
				message = `export failed: ${report.report.errors.join(' | ')}`;
			}
			runs.push({ id, status, message, outputDir, mountedVault, report });
		} finally {
			rmSync(mountedVault, { recursive: true, force: true });
		}
	}
	const observations = runs.map((r) => ({
		fallbackNotes: r.report.ok ? fallbackNotes(r.report.report) : [],
		writtenPages: notes.filter((n) => existsSync(join(r.outputDir, pagePath(n)))),
	}));
	const first = runs.find((r) => r.report.ok);
	return {
		runs,
		summary: summarizeRuns(notes, observations),
		obsidianVersion: first && first.report.ok ? first.report.report.obsidianVersion : 'unknown',
	};
}
