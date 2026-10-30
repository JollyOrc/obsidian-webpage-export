import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// US-001 AC-15: the technical docs describe the gate, the layers, the
// fixture and its dependencies as they are.

const tests = (): string => readFileSync('docs/technical/tests.md', 'utf8');
const deps = (): string => readFileSync('docs/technical/dependencies.md', 'utf8');

describe('US-001 AC-15: docs', () => {
	it('US-001 AC-15: tests.md lists every gate script, none still planned', () => {
		const t = tests();
		for (const s of [
			'npm run typecheck',
			'npm run lint',
			'npm test',
			'npm run build',
			'npm run test:integration',
			'npm run gate',
		]) {
			expect(t, s).toContain(s);
		}
		expect(t).not.toMatch(/--\s*planned/);
	});

	it('US-001 AC-15: tests.md has the integration layer with Docker', () => {
		expect(tests()).toMatch(/\|\s*integration\s*\|[^\n]*Docker/);
	});

	it('US-001 AC-15: tests.md maps every AC of US-001 (AC-1 to AC-15, AC-8b) to a test', () => {
		const t = tests();
		const acs = [...Array.from({ length: 15 }, (_, i) => `AC-${i + 1}`), 'AC-8b'];
		for (const ac of acs) expect(t, ac).toMatch(new RegExp(`\\|[^\\n]*US-001[^\\n]*\\|\\s*${ac}\\s*\\|`));
	});

	it('US-001 AC-15: tests.md records the AC-14 measurement (date, Obsidian version, fallback count)', () => {
		expect(tests()).toMatch(/AC-14[^\n]*\d{4}-\d{2}-\d{2}[^\n]*1\.14\.5[^\n]*fallback: [1-3]\/3/);
	});

	it('US-001 AC-15: dependencies.md lists the test tools with their pinned versions', () => {
		const d = deps();
		expect(d).toContain('vitest 3.2.7');
		expect(d).toContain('prettier 3.9.10');
		expect(d).toContain('@types/node 20.19.9');
	});

	it('US-001 AC-15: dependencies.md lists Docker, the image Obsidian version and both plugins with licence and checksum', () => {
		const d = deps();
		expect(d).toMatch(/Docker/);
		expect(d).toContain('Obsidian 1.14.5');
		expect(d).toMatch(/Text Mapper[^\n]*1\.1\.0[^\n]*MIT[^\n]*64dfc867/);
		expect(d).toMatch(/Meta Bind[^\n]*1\.5\.1[^\n]*GPL-3\.0[^\n]*d328bfaa/);
	});
});
