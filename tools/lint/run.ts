import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { compareUpstreamLint } from './baseline';

/** US-001 | AC-2: the upstream source paths; build output is not source. */
export const UPSTREAM_PATHS = ['src/plugin', 'src/frontend', 'src/shared', 'src/assets'];
const IGNORE = 'src/frontend/dist/**';

interface EslintFileResult {
	errorCount: number;
	warningCount: number;
}

/**
 * US-001 | AC-2: counts the upstream lint findings with today's config.
 *
 * Runs eslint with the JSON formatter over the upstream paths (build output
 * ignored) and sums errors and warnings per file. Assumes eslint picks
 * `eslint.config.mjs` (ESLint 8.57: flat config). Throws when eslint gives
 * no parsable JSON, so a crash is never read as zero findings (SCAR-015).
 */
export function countUpstreamFindings(): number {
	const r = spawnSync('npx', ['eslint', ...UPSTREAM_PATHS, '--ignore-pattern', IGNORE, '--format', 'json'], {
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024,
	});
	let files: EslintFileResult[];
	try {
		files = JSON.parse(r.stdout) as EslintFileResult[];
	} catch {
		throw new Error(`eslint gave no JSON (exit ${String(r.status)}): ${r.stderr.slice(0, 500)}`);
	}
	return files.reduce((n, f) => n + f.errorCount + f.warningCount, 0);
}

/**
 * US-001 | AC-2: step 3 of `npm run lint`; exits 1 when the upstream count
 * grew. Prints the hint when it fell; never writes the baseline file (D3).
 */
function main(): void {
	const baseline = (JSON.parse(readFileSync('tools/lint-baseline.json', 'utf8')) as { upstream: number }).upstream;
	const count = countUpstreamFindings();
	const result = compareUpstreamLint(count, baseline);
	if (result.message) console.log(result.message);
	else console.log(`upstream lint findings ${count} = baseline ${baseline}`);
	process.exit(result.ok ? 0 : 1);
}

main();
