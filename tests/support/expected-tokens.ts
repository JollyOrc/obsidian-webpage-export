import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/** One note of a vault: its path relative to the vault and its text. */
interface Note {
	path: string;
	text: string;
}

/** Every `.md` file below `vault`, hidden folders (`.obsidian`) left out. */
function notesOf(vault: string): Note[] {
	const out: Note[] = [];
	const walk = (dir: string): void => {
		for (const name of readdirSync(dir)) {
			if (name.startsWith('.')) continue;
			const p = join(dir, name);
			if (statSync(p).isDirectory()) walk(p);
			else if (name.endsWith('.md')) out.push({ path: relative(vault, p), text: readFileSync(p, 'utf8') });
		}
	};
	walk(vault);
	return out;
}

/** US-002 AC-1: the tokens a note shows itself: `FX-*` sentinels and map labels (`0101 grass "Alpha"` → `Alpha`). */
function ownTokens(text: string): string[] {
	const sentinels = text.match(/FX-[A-Z0-9-]+/g) ?? [];
	const labels = [...text.matchAll(/^\d{4} \S+ "([^"]+)"$/gm)].map((m) => m[1]);
	return [...sentinels, ...labels];
}

/**
 * US-002 AC-1: the text of the section under `heading`, from its heading line
 * to the next heading of the same or a higher level; empty when absent.
 */
function sectionOf(text: string, heading: string): string {
	const lines = text.split('\n');
	const start = lines.findIndex((l) => /^#+ /.test(l) && l.replace(/^#+ /, '') === heading);
	if (start < 0) return '';
	const level = (/^(#+)/.exec(lines[start]) ?? ['', '#'])[1].length;
	let end = lines.length;
	for (let i = start + 1; i < lines.length; i++) {
		const m = /^(#+) /.exec(lines[i]);
		if (m && m[1].length <= level) {
			end = i;
			break;
		}
	}
	return lines.slice(start, end).join('\n');
}

const MAX_DEPTH = 5;

/**
 * US-002 AC-1: the tokens each page of `vault` must contain.
 *
 * Rules (each unit-tested): a note's own sentinels and map labels; plus,
 * recursively up to depth 5, those of every target it embeds as `![[Name]]`,
 * `![[Name#Heading]]`, `![alt](path/Name.md)`, `![alt](path/Name.md#Heading)`
 * (URL-decoded) or inside a `meta-bind-embed` block (`[[Name]]`); a heading
 * target contributes only its section. Targets resolve by file name (the
 * fixture keeps names unique, US-001 AC-6); unknown targets contribute
 * nothing. Tokens are de-duplicated per page.
 */
export function expectedTokens(vault: string): Record<string, string[]> {
	const notes = notesOf(vault);
	const byName = new Map(notes.map((n) => [(n.path.split('/').pop() ?? '').replace(/\.md$/, ''), n]));
	const tokens = (text: string, depth: number): string[] => {
		const out = ownTokens(text);
		if (depth >= MAX_DEPTH) return out;
		const targets = [
			...[...text.matchAll(/!\[\[([^\]]+)\]\]/g)].map((m) => m[1]),
			...[...text.matchAll(/!\[[^\]]*\]\(([^)]+\.md(?:#[^)]*)?)\)/g)].map((m) => m[1]),
			...[...text.matchAll(/```meta-bind-embed\n\[\[([^\]]+)\]\]\n```/g)].map((m) => m[1]),
		];
		for (const target of targets) {
			const [file, heading] = decodeURIComponent(target).split('#');
			const note = byName.get((file.split('/').pop() ?? '').replace(/\.md$/, ''));
			if (!note) continue;
			out.push(...tokens(heading ? sectionOf(note.text, heading) : note.text, depth + 1));
		}
		return out;
	};
	return Object.fromEntries(notes.map((n) => [n.path, [...new Set(tokens(n.text, 0))]]));
}
