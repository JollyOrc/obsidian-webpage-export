/** US-001 AC-12: what a test needs to know about an exported page. */
export interface PageFacts {
	/** Visible text, including text inside `<svg>` (map labels); no script or style content. */
	text: string;
	/** Elements with the class `block-language-text-mapper`. */
	mapBlocks: number;
	/** Map blocks with no `<svg>` inside them. */
	emptyMapBlocks: number;
	/** Elements with the class `markdown-embed`, nested ones included. */
	markdownEmbeds: number;
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
const RAW_TEXT = new Set(['script', 'style']);

/** One open element on the stack. */
interface Open {
	name: string;
	isMapBlock: boolean;
	hasSvg: boolean;
}

/**
 * US-001 AC-12: decodes the HTML character references the exporter writes.
 *
 * Named: `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`, `&#39;`, `&nbsp;`
 * (to a space); numeric decimal `&#NNN;` and hex `&#xHH;`. Unknown names stay
 * as they are.
 */
function decode(s: string): string {
	const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
	return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (m, ref: string) => {
		if (ref.startsWith('#x')) return String.fromCodePoint(parseInt(ref.slice(2), 16));
		if (ref.startsWith('#')) return String.fromCodePoint(parseInt(ref.slice(1), 10));
		return named[ref] ?? m;
	});
}

/** US-001 AC-12: the class names of a start tag (whole names, single or double quotes). */
function classesOf(attrs: string): string[] {
	const m = /(?:^|\s)class\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i.exec(attrs);
	const value = m ? (m[1] ?? m[2] ?? m[3] ?? '') : '';
	return value.split(/\s+/).filter(Boolean);
}

/**
 * US-001 AC-12: reads an exported page into the facts the tests check
 * (SCAR-028: one reader, each rule unit-tested).
 *
 * A small tokenizer, not a full HTML parser: it walks tags and text in order
 * and keeps a stack of open elements. Rules:
 * - text outside `<script>`/`<style>` is visible text, entities decoded,
 *   runs of whitespace joined to one space; text inside `<svg>` counts;
 * - an element is a map block or an embed when its class list contains the
 *   whole name (`block-language-text-mapper`, `markdown-embed`);
 * - a map block is empty unless an `<svg>` opens while it is on the stack, so
 *   an `<svg>` after it is never credited to it;
 * - void elements and self-closing tags (`<rect/>`) do not stay open; an end
 *   tag closes up to the nearest open element of that name; comments are
 *   skipped.
 */
export function readPage(html: string): PageFacts {
	const stack: Open[] = [];
	const text: string[] = [];
	let mapBlocks = 0;
	let emptyMapBlocks = 0;
	let markdownEmbeds = 0;
	let i = 0;

	const close = (el: Open): void => {
		if (el.isMapBlock && !el.hasSvg) emptyMapBlocks++;
	};

	while (i < html.length) {
		if (html.startsWith('<!--', i)) {
			const end = html.indexOf('-->', i + 4);
			i = end < 0 ? html.length : end + 3;
			continue;
		}
		if (html[i] !== '<') {
			const next = html.indexOf('<', i);
			const chunk = html.slice(i, next < 0 ? html.length : next);
			text.push(decode(chunk)); // script/style content is skipped where they open
			i = next < 0 ? html.length : next;
			continue;
		}
		const end = html.indexOf('>', i);
		if (end < 0) break;
		const tag = html.slice(i + 1, end);
		i = end + 1;
		if (tag.startsWith('!') || tag.startsWith('?')) continue;
		if (tag.startsWith('/')) {
			const name = tag.slice(1).trim().toLowerCase();
			const at = stack.map((e) => e.name).lastIndexOf(name);
			if (at >= 0) for (const el of stack.splice(at).reverse()) close(el);
			continue;
		}
		const m = /^([a-zA-Z][\w:-]*)([\s\S]*)$/.exec(tag);
		if (!m) continue;
		const name = m[1].toLowerCase();
		const attrs = m[2];
		const classes = classesOf(attrs);
		if (classes.includes('markdown-embed')) markdownEmbeds++;
		if (name === 'svg') for (const el of stack) el.hasSvg = true;
		const isMapBlock = classes.includes('block-language-text-mapper');
		if (isMapBlock) mapBlocks++;
		const open: Open = { name, isMapBlock, hasSvg: false };
		if (VOID.has(name) || attrs.trimEnd().endsWith('/')) {
			close(open);
			continue;
		}
		stack.push(open);
		if (RAW_TEXT.has(name)) {
			const closeAt = html.toLowerCase().indexOf(`</${name}`, i);
			i = closeAt < 0 ? html.length : closeAt;
		}
	}
	for (const el of stack.reverse()) close(el);

	return {
		text: text.join(' ').replace(/\s+/g, ' ').trim(),
		mapBlocks,
		emptyMapBlocks,
		markdownEmbeds,
	};
}
