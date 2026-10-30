// US-001 AC-5, AC-6: generator of the public fixture vault
// `tests/fixtures/vault/`.
//
// Self-contained on purpose: Node built-ins only, so it runs as
// `node tests/fixtures/generate.ts [outDir]` (Node strips the types). The
// same seed always gives byte-identical files: no dates, no randomness
// outside the seeded generator, fixed iteration order, `\n` line ends.
// The notes reproduce the shapes that failed in the author's vault (M01 to
// M04): note embeds in both link forms, heading embeds, maps inside
// embedded notes, a `meta-bind-embed`, and `1.4.3 Magic Skills.md`'s
// line structure (F5). The text is drawn from a Latin word list.
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { crc32, deflateSync } from 'node:zlib';

/** US-001 AC-5: the seed of every random choice. */
const SEED = 20261030;

const WORDS = (
	'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod ' +
	'tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam ' +
	'quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo ' +
	'consequat duis aute irure in reprehenderit voluptate velit esse cillum ' +
	'fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt ' +
	'culpa qui officia deserunt mollit anim id est laborum curabitur pretium ' +
	'tincidunt lacus nunc pulvinar sapien ligula tristique senectus netus ' +
	'malesuada fames ac turpis egestas pellentesque habitant morbi vestibulum'
).split(' ');

const SECTION_NAMES = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'];

/** Counts of the constructs a note holds, written to the manifest. */
type Constructs = Record<string, number>;

/** One generated file: its vault-relative path, content and, for notes, its constructs. */
interface FixtureFile {
	path: string;
	content: string | Uint8Array;
	constructs?: Constructs;
}

/**
 * US-001 AC-5: deterministic pseudo-random numbers (mulberry32).
 *
 * Returns a function giving numbers in [0, 1); the sequence depends only on
 * `seed`.
 */
function rng(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const random = rng(SEED);

/** US-001 AC-5: one word of the list, chosen by the seeded generator. */
function word(): string {
	return WORDS[Math.floor(random() * WORDS.length)];
}

/** US-001 AC-5: a sentence of `n` words, capitalised, ending with a full stop. */
function sentence(n: number): string {
	const w = Array.from({ length: n }, word).join(' ');
	return w.charAt(0).toUpperCase() + w.slice(1) + '.';
}

/** US-001 AC-5: a paragraph of `n` sentences of 8 to 15 words. */
function paragraph(n: number): string {
	return Array.from({ length: n }, () => sentence(8 + Math.floor(random() * 8))).join(' ');
}

/**
 * US-001 AC-6 F1/F5: a `text-mapper` block with one line per hex.
 *
 * Each hex is `<xxyy> <terrain> "<label>"`; terrains are `grass` and
 * `forest`, which Text Mapper 1.1.0 draws (spike, `>Alpha<` in the SVG).
 */
function mapBlock(hexes: { at: string; terrain: string; label: string }[]): string {
	return ['```text-mapper', ...hexes.map((h) => `${h.at} ${h.terrain} "${h.label}"`), '```'].join('\n');
}

/**
 * US-001 AC-6 F5: a 64×48 PNG of one colour per row band.
 *
 * Built by hand (signature, IHDR, IDAT with zlib, IEND, CRC-32 per chunk)
 * so the generator needs no image library; the bytes depend only on the
 * constants here.
 */
function png(): Uint8Array {
	const width = 64;
	const height = 48;
	const chunk = (type: string, data: Buffer): Buffer => {
		const len = Buffer.alloc(4);
		len.writeUInt32BE(data.length);
		const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
		const crc = Buffer.alloc(4);
		crc.writeUInt32BE(crc32(body) >>> 0);
		return Buffer.concat([len, body, crc]);
	};
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr.writeUInt8(8, 8); // bit depth
	ihdr.writeUInt8(2, 9); // colour type: RGB
	const rows: Buffer[] = [];
	for (let y = 0; y < height; y++) {
		const row = Buffer.alloc(1 + width * 3);
		const shade = 60 + Math.floor((y / height) * 150);
		for (let x = 0; x < width; x++) row.set([shade, 120, 200 - shade / 2], 1 + x * 3);
		rows.push(row);
	}
	const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	return Buffer.concat([
		signature,
		chunk('IHDR', ihdr),
		chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
		chunk('IEND', Buffer.alloc(0)),
	]);
}

/** US-001 AC-6: all notes and files of the fixture vault, in a fixed order. */
function buildFiles(): FixtureFile[] {
	const files: FixtureFile[] = [];

	// F1: a map note with sentinels before and after the block.
	files.push({
		path: 'Maps/Map Alpha.md',
		content:
			`FX-F1-BEFORE ${paragraph(2)}\n\n` +
			mapBlock([
				{ at: '0101', terrain: 'grass', label: 'Alpha' },
				{ at: '0102', terrain: 'grass', label: 'Beta' },
				{ at: '0201', terrain: 'forest', label: 'Gamma' },
			]) +
			`\n\n${paragraph(1)} FX-F1-AFTER\n`,
		constructs: { textMapperBlocks: 1, hexes: 3 },
	});

	// F5 map notes: Map 1 to Map 8, 12 hexes each (a 4 × 3 grid).
	for (let i = 1; i <= 8; i++) {
		const hexes = [];
		for (let x = 1; x <= 4; x++) {
			for (let y = 1; y <= 3; y++) {
				hexes.push({
					at: `0${x}0${y}`,
					terrain: (x + y) % 2 === 0 ? 'grass' : 'forest',
					label: `${word()} ${word()}`,
				});
			}
		}
		files.push({
			path: `Maps/Map ${i}.md`,
			content: `${paragraph(1)}\n\n${mapBlock(hexes)}\n\n${paragraph(1)}\n`,
			constructs: { textMapperBlocks: 1, hexes: 12 },
		});
	}

	// F2, F3: one note embedded in both link forms.
	files.push({
		path: 'Embeds/Wikilink Embed.md',
		content: `FX-F2-BEFORE ${paragraph(1)}\n\n![[Map Alpha]]\n\n${paragraph(1)} FX-F2-AFTER\n`,
		constructs: { wikilinkEmbeds: 1 },
	});
	files.push({
		path: 'Embeds/Markdown Link Embed.md',
		content: `FX-F3-BEFORE ${paragraph(1)}\n\n![Map Alpha](../Maps/Map%20Alpha.md)\n\n${paragraph(1)} FX-F3-AFTER\n`,
		constructs: { markdownLinkEmbeds: 1 },
	});

	// F4: the long note and the heading embeds.
	files.push({
		path: 'Long Note.md',
		content:
			`# Long Note\n\n${paragraph(2)}\n` +
			SECTION_NAMES.map(
				(n, i) => `\n## Section ${n}\n\nFX-LONG-${i + 1} ${paragraph(3)}\n\n${paragraph(2)}\n`,
			).join(''),
		constructs: { headings: 7 },
	});
	files.push({
		path: 'Embeds/Heading Embed.md',
		content:
			`${paragraph(1)}\n\n![[Long Note#Section Three]]\n\n` +
			`![S](../Long%20Note.md#Section%20Four)\n\n${paragraph(1)}\n`,
		constructs: { headingEmbeds: 2 },
	});

	// F5: the line structure of `1.4.3 Magic Skills.md` (31 lines): H2,
	// paragraph, image, H3, paragraph, then 8 pairs of embeds (a heading of
	// Long Note and a map note) separated by blank lines.
	const pairs = Array.from({ length: 8 }, (_, k) => {
		const section = SECTION_NAMES[k % SECTION_NAMES.length];
		return (
			`![Section ${section}](../Long%20Note.md#Section%20${section})\n` +
			`![Map ${k + 1}](../Maps/Map%20${k + 1}.md)`
		);
	});
	files.push({
		path: 'Composed/Big Page.md',
		content:
			`## Big Page\n\n${paragraph(1)}\n\n![](../Images/Picture.png)\n### Pairs of embeds\n${paragraph(1)}\n\n` +
			pairs.join('\n\n') +
			'\n',
		// `sections`: Obsidian split the same line structure of
		// `1.4.3 Magic Skills.md` into 15 sections (M02, 2026-10-30).
		constructs: { headingEmbeds: 8, markdownLinkEmbeds: 8, images: 1, sections: 15 },
	});
	files.push({ path: 'Images/Picture.png', content: png() });

	// F6: embeds inside a callout and inside a list item.
	files.push({
		path: 'Embeds/Embed In Callout.md',
		content: `${paragraph(1)}\n\n> [!note] ${sentence(3)}\n> ${sentence(6)}\n> ![[Map Alpha]]\n\n${paragraph(1)}\n`,
		constructs: { callouts: 1, wikilinkEmbeds: 1 },
	});
	files.push({
		path: 'Embeds/Embed In List.md',
		content: `${paragraph(1)}\n\n- ${sentence(4)}\n- ${sentence(2)} ![[Map Alpha]]\n- ${sentence(5)}\n`,
		constructs: { listItems: 3, wikilinkEmbeds: 1 },
	});

	// F7: depth 2 — this note embeds F2, which embeds F1.
	files.push({
		path: 'Embeds/Nested Embed.md',
		content: `FX-F7 ${paragraph(1)}\n\n![[Wikilink Embed]]\n`,
		constructs: { wikilinkEmbeds: 1 },
	});

	// F8: the vault's shape of a `meta-bind-embed` (a whole note).
	files.push({
		path: 'Embeds/Meta Bind Embed.md',
		content: `${paragraph(1)}\n\n\`\`\`meta-bind-embed\n[[Snippet]]\n\`\`\`\n\n${paragraph(1)}\n`,
		constructs: { metaBindEmbeds: 1 },
	});
	files.push({
		path: 'Plain/Snippet.md',
		content: `FX-F8-SNIPPET ${paragraph(2)}\n`,
		constructs: {},
	});

	// F9: control note without any embed.
	files.push({
		path: 'Plain/Control.md',
		content: `# Control\n\nFX-F9 ${paragraph(4)}\n\n${paragraph(3)}\n`,
		constructs: {},
	});

	// US-001 AC-7: both third-party plugins enabled; their files are fetched
	// by `npm run fixtures:plugins` and never committed.
	files.push({
		path: '.obsidian/community-plugins.json',
		content: JSON.stringify(['text-mapper', 'obsidian-meta-bind-plugin'], null, '\t') + '\n',
	});

	const notes = files
		.filter((f) => f.path.endsWith('.md'))
		.map((f) => ({ path: f.path, constructs: f.constructs ?? {} }))
		.sort((x, y) => (x.path < y.path ? -1 : x.path > y.path ? 1 : 0));
	files.push({
		path: 'fixture-manifest.json',
		content: JSON.stringify({ seed: SEED, notes }, null, '\t') + '\n',
	});
	return files;
}

/**
 * US-001 AC-5: empties the output folder before writing, keeping the
 * fetched plugins (`.obsidian/plugins`).
 *
 * Refuses a folder that is neither empty nor a previous fixture (no
 * `fixture-manifest.json`), so a wrong argument cannot wipe other files
 * (SCAR-018).
 */
function clearOutput(outDir: string): void {
	if (!existsSync(outDir)) return;
	const entries = readdirSync(outDir);
	if (entries.length === 0) return;
	if (!entries.includes('fixture-manifest.json')) {
		throw new Error(`refusing to clear ${outDir}: not empty and no fixture-manifest.json`);
	}
	for (const name of entries) {
		if (name === '.obsidian') {
			for (const inner of readdirSync(join(outDir, name))) {
				if (inner !== 'plugins') rmSync(join(outDir, name, inner), { recursive: true, force: true });
			}
		} else {
			rmSync(join(outDir, name), { recursive: true, force: true });
		}
	}
}

/** US-001 AC-5: writes the fixture vault to `outDir` (default `tests/fixtures/vault`). */
function main(): void {
	const outDir = resolve(process.argv[2] ?? 'tests/fixtures/vault');
	clearOutput(outDir);
	for (const f of buildFiles()) {
		const p = join(outDir, f.path);
		mkdirSync(dirname(p), { recursive: true });
		writeFileSync(p, f.content);
	}
}

main();
