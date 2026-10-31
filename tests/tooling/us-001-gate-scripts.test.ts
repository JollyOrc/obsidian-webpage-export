import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// US-001 AC-1 to AC-4: the gate scripts, run for real.
// Time limits (SCAR-030): `tsc -noEmit` over src measured 1.9 s, eslint over
// the upstream paths 2.2 s (alone, 2026-10-30); 60 s leaves room for a full
// parallel run.
const LIMIT = 60_000;

const pkg = () => JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
/** ANSI colour codes (ESC [ … m); built from the char code, as a literal ESC in a regex is a lint error. */
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

/**
 * US-001 AC-1, AC-2: runs an npm script and returns its result with ANSI
 * colour codes removed from stdout and stderr. Tools colour their output
 * when they detect CI (`GITHUB_ACTIONS`; measured: prettier's `[warn]`
 * became `[\x1b[33mwarn` in the release run of 2026-10-31), so the tests
 * match the text, not the colouring.
 */
const npm = (script: string) => {
	const r = spawnSync('npm', ['run', '--silent', script], { encoding: 'utf8', timeout: LIMIT });
	const plain = (s: string | null): string => (s ?? '').replace(ANSI, '');
	return { ...r, stdout: plain(r.stdout), stderr: plain(r.stderr) };
};

/**
 * Writes a probe file, runs `fn`, and removes the probe whatever happens
 * (SCAR-018: tooling that writes into the sources proves its undo). The
 * probe name carries the process id so it never collides with a real file.
 */
function withProbe<T>(path: string, content: string, fn: () => T): T {
	if (existsSync(path)) throw new Error(`probe exists already: ${path}`);
	writeFileSync(path, content);
	let result: T;
	try {
		result = fn();
	} catch (e) {
		removeProbe(path);
		throw e;
	}
	removeProbe(path);
	return result;
}

/** Removes a probe and proves it is gone (no throw inside `finally`, which would hide `fn`'s own error). */
function removeProbe(path: string): void {
	rmSync(path, { force: true });
	if (existsSync(path)) throw new Error(`probe not removed: ${path}`);
}

describe('US-001 AC-1: typecheck', () => {
	it('US-001 AC-1: the script runs tsc over tsconfig.json and tsconfig.strict.json', () => {
		const s = pkg().scripts.typecheck ?? '';
		expect(s).toContain('tsc --noEmit -p tsconfig.json');
		expect(s).toContain('tsc --noEmit -p tsconfig.strict.json');
	});

	it('US-001 AC-1: tsconfig.strict.json is strict and covers src/core, tests, tools', () => {
		const c = JSON.parse(readFileSync('tsconfig.strict.json', 'utf8')) as {
			compilerOptions: { strict?: boolean };
			include: string[];
		};
		expect(c.compilerOptions.strict).toBe(true);
		expect(c.include).toEqual(expect.arrayContaining(['src/core/**/*.ts', 'tests/**/*.ts', 'tools/**/*.ts']));
	});

	it(
		'US-001 AC-1: the current tree passes',
		() => {
			expect(npm('typecheck').status).toBe(0);
		},
		LIMIT,
	);

	it(
		'US-001 AC-1: `class A { b: string; }` fails in src/core with TS2564',
		() => {
			const r = withProbe(`src/core/__probe_${process.pid}.ts`, 'export class A { b: string; }\n', () =>
				npm('typecheck'),
			);
			expect(r.status).not.toBe(0);
			expect(r.stdout + r.stderr).toContain('TS2564');
		},
		LIMIT,
	);

	it(
		'US-001 AC-1: the same line passes in src/plugin (upstream settings)',
		() => {
			const r = withProbe(`src/plugin/__probe_${process.pid}.ts`, 'export class A { b: string; }\n', () =>
				npm('typecheck'),
			);
			expect(r.status).toBe(0);
		},
		LIMIT,
	);
});

describe('US-001 AC-2: lint', () => {
	it('US-001 AC-2: tools/lint-baseline.json holds the measured upstream count 465 (lowered at US-002 #6 and #9)', () => {
		expect(JSON.parse(readFileSync('tools/lint-baseline.json', 'utf8'))).toEqual({ upstream: 465 });
	});

	it(
		'US-001 AC-2: the current tree passes',
		() => {
			const r = npm('lint');
			expect(r.status, r.stdout + r.stderr).toBe(0);
		},
		LIMIT,
	);

	it(
		'US-001 AC-2: an `any` without a reason in tools/ is a finding',
		() => {
			const r = withProbe(`tools/__probe_${process.pid}.ts`, 'export const x: any = 1;\n', () => npm('lint'));
			expect(r.status).not.toBe(0);
			expect(r.stdout + r.stderr).toContain('no-explicit-any');
		},
		LIMIT,
	);

	it(
		'US-001 AC-2: an `any` with a disable comment and reason passes',
		() => {
			const src =
				'// eslint-disable-next-line @typescript-eslint/no-explicit-any -- probe of the rule\nexport const x: any = 1;\n';
			const r = withProbe(`tools/__probe_${process.pid}.ts`, src, () => npm('lint'));
			expect(r.status, r.stdout + r.stderr).toBe(0);
		},
		LIMIT,
	);

	it(
		'US-001 AC-2: a prettier deviation in tests/ fails, reported by prettier for that file',
		() => {
			// A bare non-zero exit also comes from a missing script (SCAR-023: this
			// test passed before `lint` existed); prettier's own line is required.
			const probe = `tests/__probe_${process.pid}.ts`;
			const r = withProbe(probe, 'export const   y =   1\n', () => npm('lint'));
			expect(r.status).not.toBe(0);
			expect(r.stdout + r.stderr).toContain(`[warn] ${probe}`);
		},
		LIMIT,
	);

	it(
		'US-001 AC-2: one more upstream finding (466) fails with the baseline message',
		() => {
			// `no-var` is reported by the current upstream config (eslint:recommended).
			const r = withProbe(`src/plugin/__probe_${process.pid}.ts`, 'var probe = 1; export { probe };\n', () =>
				npm('lint'),
			);
			expect(r.status).not.toBe(0);
			expect(r.stdout + r.stderr).toContain('upstream lint findings 466 > baseline 465');
		},
		LIMIT,
	);
});

describe('US-001 AC-3: unit test runner', () => {
	it('US-001 AC-3: `npm test` runs vitest over tests/unit and tests/tooling', () => {
		const s = pkg().scripts.test ?? '';
		expect(s).toMatch(/^vitest run tests\/unit tests\/tooling$/);
	});

	it('US-001 AC-3: the smoke test exists', () => {
		expect(readFileSync('tests/unit/smoke.test.ts', 'utf8')).toContain("'US-001 AC-3:");
	});
});

describe('US-001 AC-4: gate command and release workflows', () => {
	it('US-001 AC-4: `npm run gate` and `npm run gate:release` exist', () => {
		expect(pkg().scripts.gate).toBeDefined();
		expect(pkg().scripts['gate:release']).toBeDefined();
	});

	for (const wf of ['.github/workflows/release.yaml', '.github/workflows/beta-release.yaml']) {
		it(`US-001 AC-4: ${wf} runs the release gate before the release is created`, () => {
			const text = readFileSync(wf, 'utf8');
			const gate = text.indexOf('npm run gate:release');
			const release = text.indexOf('actions/create-release');
			expect(gate, 'gate step present').toBeGreaterThan(-1);
			expect(release, 'release step present').toBeGreaterThan(-1);
			expect(gate).toBeLessThan(release);
		});

		it(`US-001 AC-4: ${wf} publishes the Docker image only after the gated build job`, () => {
			// The docker-image job had no `needs:` (2026-10-30) and would publish
			// to GHCR with a red gate.
			const text = readFileSync(wf, 'utf8');
			const job = text.slice(text.indexOf('\n  docker-image:'));
			expect(job).toMatch(/\n {4}needs: build\n/);
		});

		it(`US-001 AC-4: ${wf} checks out the full history in the build job (the gate reads the upstream base commit)`, () => {
			// Amended 2026-10-31: the default shallow clone (one commit) makes
			// US-002 AC-9's `git diff 78c973d` fail (measured).
			const text = readFileSync(wf, 'utf8');
			const build = text.slice(text.indexOf('\n  build:'), text.indexOf('\n  docker-image:'));
			expect(build).toMatch(/- uses: actions\/checkout@v4\n {8}with:\n {10}fetch-depth: 0\n/);
		});

		it(`US-001 AC-4: ${wf} builds on Node 26.x, the version the gate is measured on`, () => {
			// Amended 2026-10-31: on Node 20.x the gate failed in CI — the
			// fixture generator runs as `node tests/fixtures/generate.ts`, which
			// needs Node's built-in type stripping (measured locally on 26.12).
			const text = readFileSync(wf, 'utf8');
			const build = text.slice(text.indexOf('\n  build:'), text.indexOf('\n  docker-image:'));
			expect(build).toMatch(/\n {10}node-version: "26\.x"\n/);
		});

		it(`US-001 AC-4: ${wf} gives only the build job write access, to contents only`, () => {
			// Amended 2026-10-31: the fork's default token is read-only; the
			// second release run passed its gate and failed at "Create Release"
			// ("Resource not accessible by integration").
			const text = readFileSync(wf, 'utf8');
			const build = text.slice(text.indexOf('\n  build:'), text.indexOf('\n  docker-image:'));
			expect(build).toMatch(/\n {4}runs-on: ubuntu-latest\n {4}permissions:\n {6}contents: write\n\n/);
			expect(text.slice(0, text.indexOf('\njobs:'))).not.toMatch(/permissions:/);
		});

		it(`US-001 AC-4: ${wf} does not run the docker-image job (no image is published)`, () => {
			const text = readFileSync(wf, 'utf8');
			const job = text.slice(text.indexOf('\n  docker-image:'));
			expect(job).toMatch(/^\n {2}docker-image:\n {4}if: \$\{\{ false \}\}\n/);
		});
	}
});
