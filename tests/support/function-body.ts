import { readFileSync } from 'node:fs';

/** The upstream file that holds the fork's render path (US-002 AC-9). */
export const RENDER_API = 'src/plugin/render-api/render-api.ts';

/**
 * US-002 AC-3, US-004 AC-4: the text of the function `name` in `file`, from
 * its declaration to the closing brace at the declaration's indentation
 * (upstream's style: tabs). Empty when the function is absent.
 *
 * Moved from tests/tooling/us-002-repository.test.ts on 2026-11-11 so that
 * both stories read source through one reader (SCAR-017); checked on known
 * functions at US-002's G2 (SCAR-028).
 */
export function functionBody(name: string, file: string = RENDER_API): string {
	const src = readFileSync(file, 'utf8');
	const start = src.search(new RegExp(`\\n(\\t*)(?:export )?async function ${name}\\(`));
	if (start < 0) return '';
	const indent = /\n(\t*)/.exec(src.slice(start))?.[1] ?? '';
	const end = src.indexOf(`\n${indent}}\n`, start + 1);
	return src.slice(start, end < 0 ? src.length : end);
}
