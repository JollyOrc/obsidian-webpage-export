import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// US-001 AC-5 (generated, deterministic, public), AC-6 (constructs),
// AC-7 (third-party plugins not committed).
// Time limit (SCAR-030): one generation measured 0.16 s alone (ticket #2,
// 2026-10-30); 60 s per generation leaves room for a full parallel run.
const LIMIT = 60_000;

const sha = (s: string | Buffer): string => createHash('sha256').update(s).digest('hex');

/** Every file below `dir` (relative path → sha256), `.obsidian/plugins` left out (AC-7). */
function tree(dir: string): Record<string, string> {
	const out: Record<string, string> = {};
	const walk = (d: string): void => {
		for (const name of readdirSync(d)) {
			const p = join(d, name);
			const rel = relative(dir, p);
			if (rel.startsWith(join('.obsidian', 'plugins'))) continue;
			if (statSync(p).isDirectory()) walk(p);
			else out[rel] = sha(readFileSync(p));
		}
	};
	walk(dir);
	return out;
}

/** Runs the generator in its own process (SCAR-023: two fresh starts). */
function generate(outDir: string): void {
	execFileSync('node', ['tests/fixtures/generate.ts', outDir], { stdio: 'pipe', timeout: LIMIT });
}

let dirA = '';
let dirB = '';
const note = (rel: string): string => readFileSync(join(dirA, rel), 'utf8');

beforeAll(() => {
	dirA = mkdtempSync(join(tmpdir(), 'us001-fx-a-'));
	dirB = mkdtempSync(join(tmpdir(), 'us001-fx-b-'));
	generate(dirA);
	generate(dirB);
}, 2 * LIMIT);

afterAll(() => {
	for (const d of [dirA, dirB]) if (d) rmSync(d, { recursive: true, force: true });
});

describe('US-001 AC-5: generated, deterministic, public', () => {
	it('US-001 AC-5: two generations in separate processes give byte-identical trees', () => {
		const a = tree(dirA);
		expect(Object.keys(a).length).toBeGreaterThan(20);
		expect(tree(dirB)).toEqual(a);
	});

	it('US-001 AC-5: the committed fixture equals a fresh generation', () => {
		expect(tree('tests/fixtures/vault')).toEqual(tree(dirA));
	});

	it('US-001 AC-5: no file of the fixture is ignored by git, so the commit holds all of it', () => {
		// Added 2026-10-30 (SCAR-023): upstream's `.gitignore` entry `vault/`
		// ignored the whole fixture; the test above compares the working tree
		// and could not see it.
		const files = Object.keys(tree('tests/fixtures/vault')).map((f) => join('tests/fixtures/vault', f));
		expect(files.length).toBeGreaterThan(20);
		const r = spawnSync('git', ['check-ignore', '--no-index', ...files], { encoding: 'utf8' });
		expect(r.stdout.trim()).toBe('');
	});

	it('US-001 AC-5: fixture-manifest.json lists every note with its constructs', () => {
		const m = JSON.parse(note('fixture-manifest.json')) as {
			notes: { path: string; constructs: Record<string, number> }[];
		};
		const mdFiles = Object.keys(tree(dirA))
			.filter((p) => p.endsWith('.md'))
			.sort();
		expect(m.notes.map((n) => n.path).sort()).toEqual(mdFiles);
	});

	it('US-001 AC-5: no word of the author vault list appears (20 terms, compared as hashes)', () => {
		// sha256 of 20 lower-case single words, each found in 2 to 33 notes of
		// the working-copy vault (measured 2026-10-30); the words themselves are
		// not written here.
		const PRIVATE = new Set([
			'6de704a75e53da0b830276e72f287b72fba1066daf1b1d00391d535a61113edd',
			'9d8409f69882878ec0f66086094d3f6d902d6121a2f184e694e7f3ed62c3dd5a',
			'038a6024ee44ade006f7ab25a0c82202d075f24211671d450fe9ea522d940598',
			'56e4dc012f717f91da2a93d51abbdfb04c8089a6b5808728dfb174a3392377e6',
			'7b1685a486961e442e8d106cd2439f67c6727ca1bd8b20c0955cba165c72c84f',
			'30c7bc2276a270a3a040456a227ca7bdf15b42dd7e0be9f119bf36eebbe8aba8',
			'c39b1c7a7d02f4ef65ee6fbaa87e27f42c6c8ec31d6b3423b1177aedd1aed299',
			'c4309c335432f48a90b2758f133b797b433f8893e45571dd5a037176f03d871b',
			'3b7efbf0af6bedba63e19862cfb2b3e544837a91d777f3020a03afd7ee8af6bc',
			'082e8f8a3cf7ed3b868bb962f165c5f2e01b4240835daaffe0c852c366c978b9',
			'dc31f8b0118fea721686072dd6cc2963ef4af11861a0fcd4393bfae6241a63f4',
			'29cc8d87db7ffc2e13fd5e1224a7e45c382e174531ca16a825d8a2e85e3701ce',
			'84572b3cd058b473a3b442b5b94f2573299ef17e7bc32a405a21c0bc3f688358',
			'223c590d47d5b94b01a8b43ebe4ef87da05ee63b812acf48326d958e8834717e',
			'965d72204c079fba20fa6458567709dd60fd526f1516f145f01dfe45b635d881',
			'bc00b62a2d882ef5a32b375c37836acd49e1b968f702a2bcdc6ba2e7986abe82',
			'922105302ce734fe313fb71d297cfd301b5363bc68268a026380bcf3cb39fb7c',
			'6cdcea092ea53a784f35f1cdf1c507fc2ddac36af4fb1e7490457a9500176dfc',
			'a7bf8771904daba49578732bd7676ff615d7b767ca6b053bec6847d5f2ee1410',
			'e88559cc13f4588e472da7890fd09085b0f2e4fb20d7ffdb058866f4d7ba1dc9',
		]);
		const hits: string[] = [];
		let words = 0;
		for (const rel of Object.keys(tree(dirA))) {
			for (const w of readFileSync(join(dirA, rel), 'utf8')
				.toLowerCase()
				.match(/[a-z]+/g) ?? []) {
				words++;
				if (PRIVATE.has(sha(w))) hits.push(`${rel}: ${w}`);
			}
		}
		expect(words, 'the scan read the fixture text').toBeGreaterThan(500);
		expect(hits).toEqual([]);
	});
});

describe('US-001 AC-6: constructs', () => {
	it('US-001 AC-6: note names are unique in the whole vault (SCAR-011)', () => {
		const names = Object.keys(tree(dirA))
			.filter((p) => p.endsWith('.md'))
			.map((p) => basename(p));
		expect(new Set(names).size).toBe(names.length);
	});

	it('US-001 AC-6 F1: Map Alpha has one text-mapper block with Alpha, Beta, Gamma between the sentinels', () => {
		const t = note('Maps/Map Alpha.md');
		expect(t.match(/^```text-mapper$/gm)).toHaveLength(1);
		expect(t).toMatch(/^0101 \S+ "Alpha"$/m);
		expect(t).toMatch(/^0102 \S+ "Beta"$/m);
		expect(t).toMatch(/^0201 \S+ "Gamma"$/m);
		expect(t.indexOf('FX-F1-BEFORE')).toBeLessThan(t.indexOf('```text-mapper'));
		expect(t.indexOf('FX-F1-AFTER')).toBeGreaterThan(t.lastIndexOf('```'));
	});

	it('US-001 AC-6 F2: wikilink embed between sentinels', () => {
		expect(note('Embeds/Wikilink Embed.md')).toMatch(/FX-F2-BEFORE[\s\S]*!\[\[Map Alpha\]\][\s\S]*FX-F2-AFTER/);
	});

	it('US-001 AC-6 F3: markdown-link embed in the vault form', () => {
		expect(note('Embeds/Markdown Link Embed.md')).toMatch(
			/FX-F3-BEFORE[\s\S]*!\[Map Alpha\]\(\.\.\/Maps\/Map%20Alpha\.md\)[\s\S]*FX-F3-AFTER/,
		);
	});

	it('US-001 AC-6 F4: heading embeds in both forms; Long Note has sections One to Six with sentinels', () => {
		const t = note('Embeds/Heading Embed.md');
		expect(t).toContain('![[Long Note#Section Three]]');
		expect(t).toContain('![S](../Long%20Note.md#Section%20Four)');
		const l = note('Long Note.md');
		for (const [i, n] of ['One', 'Two', 'Three', 'Four', 'Five', 'Six'].entries()) {
			expect(l).toMatch(new RegExp(`^## Section ${n}$`, 'm'));
			expect(l).toContain(`FX-LONG-${i + 1}`);
		}
	});

	it('US-001 AC-6 F5: Big Page has the 1.4.3 shape: 8 heading embeds + 8 map-note embeds; 8 map notes of 12 hexes', () => {
		const t = note('Composed/Big Page.md');
		expect(t.match(/!\[[^\]]*\]\(\.\.\/Long%20Note\.md#Section%20[^)]+\)/g)).toHaveLength(8);
		expect(t.match(/!\[[^\]]*\]\(\.\.\/Maps\/Map%20[1-8]\.md\)/g)).toHaveLength(8);
		expect(t.match(/!\[[^\]]*\]\([^)]+\.png\)/g)).toHaveLength(1);
		for (let i = 1; i <= 8; i++) {
			const m = note(`Maps/Map ${i}.md`);
			expect(m.match(/^```text-mapper$/gm)).toHaveLength(1);
			expect(m.match(/^\d{4} \S+ "[^"]+"$/gm)).toHaveLength(12);
		}
		const manifest = JSON.parse(note('fixture-manifest.json')) as {
			notes: { path: string; constructs: Record<string, number> }[];
		};
		expect(manifest.notes.find((n) => n.path === 'Composed/Big Page.md')?.constructs.sections).toBe(15);
	});

	it('US-001 AC-6 F5: the image the page embeds exists in the fixture', () => {
		const t = note('Composed/Big Page.md');
		const img = /!\[[^\]]*\]\(([^)]+\.png)\)/.exec(t)?.[1] ?? '';
		expect(() => statSync(join(dirA, 'Composed', decodeURIComponent(img)))).not.toThrow();
	});

	it('US-001 AC-6 F6: embed inside a callout and inside a list item', () => {
		// The embed is a line of the callout: every line from the callout head to
		// the embed starts with `>`.
		expect(note('Embeds/Embed In Callout.md')).toMatch(/^> \[!note\][^\n]*\n(?:>[^\n]*\n)*?> !\[\[Map Alpha\]\]$/m);
		expect(note('Embeds/Embed In List.md')).toMatch(/^- [^\n]*!\[\[Map Alpha\]\]/m);
	});

	it('US-001 AC-6 F7: nested embed reaches F1 at depth 2', () => {
		expect(note('Embeds/Nested Embed.md')).toContain('![[Wikilink Embed]]');
	});

	it('US-001 AC-6 F8: a meta-bind-embed block embedding the whole note Snippet (vault shape)', () => {
		expect(note('Embeds/Meta Bind Embed.md')).toMatch(/^```meta-bind-embed\n\[\[Snippet\]\]\n```$/m);
		expect(note('Plain/Snippet.md')).toContain('FX-F8-SNIPPET');
	});

	it('US-001 AC-6 F9: control note with FX-F9 and no embeds', () => {
		const t = note('Plain/Control.md');
		expect(t).toContain('FX-F9');
		expect(t).not.toMatch(/!\[/);
	});
});

describe('US-001 AC-7: third-party plugins are never committed', () => {
	it('US-001 AC-7: git ls-files lists nothing under the fixture plugin folder', () => {
		const r = spawnSync('git', ['ls-files', 'tests/fixtures/vault/.obsidian/plugins'], { encoding: 'utf8' });
		expect(r.status).toBe(0);
		expect(r.stdout.trim()).toBe('');
	});

	it('US-001 AC-7: the plugin folder is git-ignored', () => {
		const r = spawnSync('git', ['check-ignore', 'tests/fixtures/vault/.obsidian/plugins/text-mapper/main.js'], {
			encoding: 'utf8',
		});
		expect(r.status).toBe(0);
	});

	it('US-001 AC-7: both plugins are enabled in community-plugins.json', () => {
		expect(JSON.parse(note('.obsidian/community-plugins.json'))).toEqual(
			expect.arrayContaining(['text-mapper', 'obsidian-meta-bind-plugin']),
		);
	});
});
