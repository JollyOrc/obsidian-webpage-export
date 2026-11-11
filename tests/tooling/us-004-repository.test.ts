import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { functionBody } from '../support/function-body';

// US-004 AC-1, AC-2, AC-4: the render path uses the core rules of
// src/core/render/blocks.ts instead of US-002's "no block is empty"; AC-6:
// the fixture's own plugin is generated, enabled and free of third-party code.

describe('US-004 wiring in renderDetached', () => {
	it('US-004 AC-1, AC-2: renderDetached decides with decideCopy and hasOutput from src/core/render/blocks', () => {
		const src = readFileSync('src/plugin/render-api/render-api.ts', 'utf8');
		expect(src).toMatch(/import \{[^}]*\bdecideCopy\b[^}]*\} from "src\/core\/render\/blocks";/);
		const body = functionBody('renderDetached');
		expect(body.length, 'renderDetached found').toBeGreaterThan(0);
		expect(body).toMatch(/\bdecideCopy\(/);
		expect(body).toMatch(/\bhasOutput\(/);
	});

	it('US-004 AC-1: US-002\'s rule "a block is pending while it is :empty" is gone from renderDetached', () => {
		expect(functionBody('renderDetached')).not.toContain(`[class^='block-language-']:empty").length`);
	});

	it('US-004 AC-2: block changes are observed (MutationObserver over child list, attributes and text)', () => {
		const body = functionBody('renderDetached');
		expect(body).toMatch(/new MutationObserver\(/);
		expect(body).toMatch(/childList: true/);
		expect(body).toMatch(/attributes: true/);
		expect(body).toMatch(/characterData: true/);
		expect(body).toMatch(/subtree: true/);
	});

	it('US-004 AC-4: an unfinished block is reported with unfinishedWarning; upstream\'s "not rendered correctly" is not written', () => {
		const body = functionBody('renderDetached');
		expect(body).toMatch(/ExportLog\.warning\(unfinishedWarning\(/);
		expect(body).not.toContain('not rendered correctly!');
	});
});

describe('US-004 AC-6: the fixture plugin fx-steps', () => {
	const generate = (): string => {
		const out = mkdtempSync(join(tmpdir(), 'owe-us004-'));
		const r = spawnSync('node', ['tests/fixtures/generate.ts', out], { encoding: 'utf8' });
		expect(r.status, r.stderr).toBe(0);
		return out;
	};

	it('US-004 AC-6: the generator writes the plugin and enables it next to the two pinned plugins', () => {
		const out = generate();
		try {
			const manifest = JSON.parse(readFileSync(join(out, '.obsidian/plugins/fx-steps/manifest.json'), 'utf8'));
			expect(manifest.id).toBe('fx-steps');
			const enabled = JSON.parse(readFileSync(join(out, '.obsidian/community-plugins.json'), 'utf8'));
			expect(enabled).toEqual(['text-mapper', 'obsidian-meta-bind-plugin', 'fx-steps']);
		} finally {
			rmSync(out, { recursive: true, force: true });
		}
	});

	it("US-004 AC-6: the plugin requires nothing but obsidian (no third-party code) and draws AC-2's example", () => {
		const out = generate();
		try {
			const main = readFileSync(join(out, '.obsidian/plugins/fx-steps/main.js'), 'utf8');
			expect([...main.matchAll(/require\('([^']+)'\)/g)].map((m) => m[1])).toEqual(['obsidian']);
			expect(main).toContain("registerMarkdownCodeBlockProcessor('fx-steps'");
			// As Dataview's dataviewjs: the processor returns at once and the drawing
			// runs later (a processor that awaits was finished before the export
			// waited, G2 run 2026-11-11).
			expect(main).toContain("registerMarkdownCodeBlockProcessor('fx-steps', (source, el, ctx) => {");
			expect(main).not.toMatch(/registerMarkdownCodeBlockProcessor\('fx-steps', async/);
			expect(main).toContain('child.onload = () => {\n\t\t\t\tvoid draw(el, opt, child);');
			expect(main).toContain("el.createEl('style', { text: '.card { color: red }' })");
			expect(main).toContain("el.createDiv({ cls: 'card' })");
			expect(main).toContain("card.setText('Ready')");
			expect(main).toContain("card.setAttribute('data-step', '2')");
		} finally {
			rmSync(out, { recursive: true, force: true });
		}
	});

	it('US-004 AC-2 to AC-4: the fixture has the eight step notes with the delays of the story', () => {
		const out = generate();
		try {
			const note = (p: string): string => readFileSync(join(out, 'Steps', p), 'utf8');
			expect(note('Step Block.md')).toContain('```fx-steps\nfirst: 300\nsecond: 20\n```');
			expect(note('Embed Step Card.md')).toContain('![[Step Card]]');
			expect(note('Two Step Blocks.md')).toContain('first: 700');
			expect(note('Step Block In Callout.md')).toContain('> ```fx-steps\n> first: 300');
			expect(note('Step Card Twice.md').match(/!\[\[Step Card\]\]/g)).toHaveLength(2);
			expect(note('Step Nothing.md')).toContain('mode: nothing');
			expect(note('Step Forever.md')).toContain('mode: forever');
		} finally {
			rmSync(out, { recursive: true, force: true });
		}
	});
});
