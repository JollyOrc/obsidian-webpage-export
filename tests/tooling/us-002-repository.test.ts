import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// US-002 AC-8 (the manual check exists as its own file) and AC-9 (small
// upstream diff; pure core).

const UPSTREAM_BASE = '78c973d';
// Amendment 1 (D9): api-options.ts is no longer changed.
const ALLOWED = ['src/plugin/render-api/render-api.ts'];
const RENDER_API = 'src/plugin/render-api/render-api.ts';

/**
 * The text of the function `name` in render-api.ts, from its declaration to
 * the closing brace at the declaration's indentation (upstream's style: tabs).
 */
function functionBody(name: string): string {
	const src = readFileSync(RENDER_API, 'utf8');
	const start = src.search(new RegExp(`\\n(\\t*)(?:export )?async function ${name}\\(`));
	if (start < 0) return '';
	const indent = /\n(\t*)/.exec(src.slice(start))?.[1] ?? '';
	const end = src.indexOf(`\n${indent}}\n`, start + 1);
	return src.slice(start, end < 0 ? src.length : end);
}

describe('US-002 AC-9: upstream diff and pure core', () => {
	it('US-002 AC-9: the only changed upstream file is render-api.ts (api-options.ts back to upstream, D9)', () => {
		const r = spawnSync(
			'git',
			['diff', '--name-only', UPSTREAM_BASE, '--', 'src/plugin', 'src/frontend', 'src/shared', 'src/assets'],
			{
				encoding: 'utf8',
			},
		);
		expect(r.status).toBe(0);
		const changed = r.stdout.trim().split('\n').filter(Boolean);
		expect(changed.filter((f) => !ALLOWED.includes(f))).toEqual([]);
		expect(changed).toEqual(expect.arrayContaining(ALLOWED));
	});

	it('US-002 AC-9: each changed upstream file is listed in dependencies.md', () => {
		const deps = readFileSync('docs/technical/dependencies.md', 'utf8');
		for (const f of ALLOWED) expect(deps, f).toContain(`\`${f}\``);
	});

	it('US-002 AC-9: src/core imports no obsidian, electron or Node I/O module', () => {
		const files: string[] = [];
		const walk = (d: string): void => {
			for (const n of readdirSync(d)) {
				const p = join(d, n);
				if (statSync(p).isDirectory()) walk(p);
				else if (n.endsWith('.ts')) files.push(p);
			}
		};
		walk('src/core');
		expect(files.length, 'core files checked').toBeGreaterThanOrEqual(4);
		const bad = /(?:from\s+|require\()\s*['"](?:obsidian|electron|fs|path|os|child_process|node:[^'"]+)['"]/;
		for (const f of files) expect(bad.test(readFileSync(f, 'utf8')), f).toBe(false);
	});
});

describe('US-002 AC-10 withdrawn, D9: the growth and its option are gone', () => {
	it('US-002 D9: no file under src names maxPreviewHeight; core/preview/height.ts does not exist', () => {
		const r = spawnSync('git', ['grep', '-n', 'maxPreviewHeight', '--', 'src'], { encoding: 'utf8' });
		expect(r.stdout.trim()).toBe('');
		expect(existsSync('src/core/preview/height.ts')).toBe(false);
	});

	it('US-002 D7: render-api.ts has no preview growth (no restoreViewHeights, no nextPreviewHeight)', () => {
		const src = readFileSync(RENDER_API, 'utf8');
		expect(src).not.toMatch(/restoreViewHeights|nextPreviewHeight|effectiveMaxPreviewHeight/);
	});
});

describe('US-002 AC-3, AC-15: the main path renders detached', () => {
	it('US-002 AC-3: renderMarkdownView sends useFallbackRenderer to the fallback and everything else to renderDetached', () => {
		const body = functionBody('renderMarkdownView');
		expect(body.length, 'renderMarkdownView found').toBeGreaterThan(0);
		expect(body).toMatch(
			/if \(!preview\.rerender \|\| options\.useFallbackRenderer\)[\s\S]*?return renderMarkdownViewFallback\(preview, options\);/,
		);
		expect(body).toMatch(/return renderDetached\(preview, options\);/);
		expect(body).not.toMatch(/preview\.rerender\(/);
	});

	it('US-002 AC-3: renderDetached renders with MarkdownRenderer.render, waits 50 ms / 5 000 ms, warns empty plugin blocks', () => {
		const body = functionBody('renderDetached');
		expect(body.length, 'renderDetached found').toBeGreaterThan(0);
		expect(body).toMatch(/ObsidianRenderer\.render\(app, [^)]+, file\.path, /);
		expect(body).toMatch(/waitUntil\([\s\S]*?, 5000, 50\)/);
		expect(body).toContain('not rendered correctly!');
		expect(body).toMatch(/wrapSections\(/);
		expect(body).toMatch(/addPreviewMarks\(/);
		expect(body).toMatch(/documentClass\(/);
	});

	it('US-002 AC-15: renderDetached loads mermaid when absent, runs the Dataview rendering and converts canvas elements', () => {
		const body = functionBody('renderDetached');
		expect(body).toMatch(/if \(!window\.mermaid\)\s*\{?\s*await loadMermaid\(\);/);
		expect(body).toMatch(/DataviewRenderer\.isDataviewEnabled\(\)[\s\S]*?\.generate\(/);
		expect(body).toContain('canvas:not(.pdf-embed canvas)');
	});

	it('US-002 AC-14: postProcessHTML moves only pageFrontmatter(...) and removes embedded frontmatter', () => {
		const body = functionBody('postProcessHTML');
		expect(body).toMatch(/const frontmatter = pageFrontmatter\(html\);/);
		expect(body).toMatch(/removeEmbedFrontmatter\(html\)/);
		expect(body).not.toMatch(/html\.querySelector\("\.frontmatter"\)/);
	});
});

describe('US-002 AC-8: manual check in the working-copy vault', () => {
	const m05 = (): string => readFileSync('docs/technical/manual-checks/M05.md', 'utf8');
	const m10 = (): string => readFileSync('docs/technical/manual-checks/M10.md', 'utf8');

	it('US-002 AC-8 (amendment 1): M10 is its own file with build version and place, and names the new content and the open question', () => {
		const t = m10();
		expect(t.split('\n')[0]).toMatch(/^# M10 /);
		expect(t).toMatch(/\*\*Build:\*\* `[^`]+`/);
		expect(t).toMatch(/\*\*Runs in:\*\* the working-copy vault `Raiders of Arismyth Rules`/);
		for (const s of [
			'Body Magic',
			'Cantrips',
			'Curses',
			'Wizardry',
			'Fireball',
			'Invisible Magic Hand',
			'Edge Dice',
			'Dodge',
			'Giant Toad',
			'Battlefield Controller',
			'Ice Crystal',
			'Unable to find “Combat and Critical Failures” in 1.3.1 Combat',
			'fold',
		]) {
			expect(t, s).toContain(s);
		}
		expect(t).toMatch(/Is anything missing, odd or slow that this list did not ask about\?/);
		expect(t).toMatch(/August export/);
	});

	it('US-002 AC-8: M05 is its own file, starting with its id, the build version and the place it runs', () => {
		const t = m05();
		expect(t.split('\n')[0]).toMatch(/^# M05 /);
		expect(t).toMatch(/\*\*Build:\*\* `[^`]+`/);
		expect(t).toMatch(/\*\*Runs in:\*\* the working-copy vault `Raiders of Arismyth Rules`/);
	});

	it('US-002 AC-8: M05 names the content the pages must show and ends with the open question', () => {
		const t = m05();
		for (const s of [
			'Body Magic',
			'Cantrips',
			'Curses',
			'Wizardry',
			'Fireball',
			'Invisible Magic Hand',
			'Edge Dice',
		]) {
			expect(t, s).toContain(s);
		}
		expect(t).toMatch(/Is anything missing, odd or slow that this list did not ask about\?/);
	});

	it('US-002 AC-8: the manual-check index lists exactly the check files (SCAR-029)', () => {
		const files = readdirSync('docs/technical/manual-checks')
			.filter((f) => /^M\d{2}\.md$/.test(f))
			.sort();
		const index = readFileSync('docs/technical/manual-checks.md', 'utf8');
		const rows = [...index.matchAll(/\[(M\d{2})\]\(manual-checks\/(M\d{2})\.md\)/g)]
			.map((m) => `${m[2]}.md`)
			.sort();
		expect(rows).toEqual(files);
		expect(files).toContain('M05.md');
		expect(files).toContain('M10.md');
	});
});
