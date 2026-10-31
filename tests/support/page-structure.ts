import { JSDOM } from 'jsdom';

/** US-002 AC-2: one embed of an exported page. */
export interface EmbedFacts {
	/** `alt` attribute (the link text Obsidian writes, e.g. `Section Three`, `Map 1`). */
	alt: string;
	/** `data-type` (`heading` for heading embeds), or `''`. */
	type: string;
	/** Text content of the embed, map labels inside `<svg>` included. */
	text: string;
	/** `alt` of the embeds nested inside this one. */
	nested: string[];
}

/**
 * US-002 AC-2: the embeds (`.markdown-embed`) of an exported page, in
 * document order, with their text and nested embeds.
 *
 * Parses with jsdom (spec-conformant; the exported page has no `<div>` inside
 * a `<p>` when AC-4 holds, so parsing does not move content). Script and
 * style text is not part of any embed's text.
 */
export function embedsOf(html: string): EmbedFacts[] {
	const doc = new JSDOM(html).window.document;
	for (const el of Array.from(doc.querySelectorAll('script, style'))) el.remove();
	return Array.from(doc.querySelectorAll('.markdown-embed')).map((el) => ({
		alt: el.getAttribute('alt') ?? '',
		type: el.getAttribute('data-type') ?? '',
		text: (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
		nested: Array.from(el.querySelectorAll('.markdown-embed')).map((n) => n.getAttribute('alt') ?? ''),
	}));
}

const VOID = new Set([
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'source',
	'track',
	'wbr',
]);

/**
 * US-002 AC-4: the number of `<div>` start tags written while a `<p>` is open,
 * read from the raw markup (a parser would move them out and hide them).
 *
 * Rules (each unit-tested): only the element names `p` and `div` count
 * (`<path>` and `<param>` are not `<p>`); void and self-closing tags do not
 * stay open; an end tag closes up to the nearest open element of its name;
 * `<script>`/`<style>` content and comments are skipped.
 */
export function divsInsideParagraphs(html: string): number {
	const stack: string[] = [];
	let count = 0;
	const tag = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:-]*)([^>]*)>/g;
	let m: RegExpExecArray | null;
	while ((m = tag.exec(html)) !== null) {
		if (m[0].startsWith('<!--')) continue;
		const closing = m[1] === '/';
		const name = m[2].toLowerCase();
		if (closing) {
			const at = stack.lastIndexOf(name);
			if (at >= 0) stack.length = at;
			continue;
		}
		if (name === 'div' && stack.includes('p')) count++;
		if (VOID.has(name) || m[3].trimEnd().endsWith('/')) continue;
		if (name === 'script' || name === 'style') {
			const end = html.toLowerCase().indexOf(`</${name}`, tag.lastIndex);
			tag.lastIndex = end < 0 ? html.length : end;
			continue;
		}
		stack.push(name);
	}
	return count;
}
