import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { installPlugins, type PluginLock } from '../../tools/fixtures/plugins';

// US-001 AC-7: third-party plugins fetched at pinned versions, verified by
// sha256, never committed. Measured checksums (2026-10-30, GitHub releases;
// the vault copies equal them up to Obsidian's appended
// `/* nosourcemap */`).

const sha = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex');

describe('US-001 AC-7: plugin lockfile', () => {
	const lock = JSON.parse(readFileSync('tests/fixtures/plugins.lock.json', 'utf8')) as PluginLock;

	it('US-001 AC-7: Text Mapper 1.1.0 from modality/obsidian-text-mapper, MIT, main.js checksum', () => {
		const p = lock.plugins.find((x) => x.id === 'text-mapper');
		expect(p).toMatchObject({ version: '1.1.0', repo: 'modality/obsidian-text-mapper', licence: 'MIT' });
		expect(p?.files['main.js']).toBe('64dfc8670a92f1b6694f0cb043a9e9a1b862df6528b4ee8bc9255285eb2c44c7');
		expect(p?.files['manifest.json']).toBe('35ddf54fa4aababf6d96902adf38d281171bcf8cba5028dbf04a713bf23a7e3b');
	});

	it('US-001 AC-7: Meta Bind 1.5.1 from mProjectsCode/obsidian-meta-bind-plugin, GPL-3.0, checksums', () => {
		const p = lock.plugins.find((x) => x.id === 'obsidian-meta-bind-plugin');
		expect(p).toMatchObject({
			version: '1.5.1',
			repo: 'mProjectsCode/obsidian-meta-bind-plugin',
			licence: 'GPL-3.0',
		});
		expect(p?.files['main.js']).toBe('d328bfaa4d1f48259074b28f249a9f911ea34327e7e1123d8a1f2afc3e9784b3');
		expect(p?.files['manifest.json']).toBe('3c1dff1e36a17811851f3c7446b875cf901288b73261caea61bc0d440d3c4325');
		expect(p?.files['styles.css']).toBe('97069e183224c55428fe0b983d42435aa2cd4ac14d0f50186138b4751ad55d61');
	});
});

describe('US-001 AC-7: installing plugins', () => {
	const good = { 'main.js': new TextEncoder().encode('main'), 'manifest.json': new TextEncoder().encode('{}') };
	const lockFor = (files: Record<string, Uint8Array>): PluginLock => ({
		plugins: [
			{
				id: 'fake-plugin',
				version: '1.0.0',
				repo: 'x/y',
				licence: 'MIT',
				files: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, sha(v)])),
			},
		],
	});

	it('US-001 AC-7: verified files land in .obsidian/plugins/<id>/ and the plugin is enabled', async () => {
		const vault = mkdtempSync(join(tmpdir(), 'us001-'));
		try {
			await installPlugins(
				lockFor(good),
				vault,
				async (_repo, _version, name) => good[name as keyof typeof good],
			);
			expect(readFileSync(join(vault, '.obsidian/plugins/fake-plugin/main.js'), 'utf8')).toBe('main');
			expect(JSON.parse(readFileSync(join(vault, '.obsidian/community-plugins.json'), 'utf8'))).toContain(
				'fake-plugin',
			);
		} finally {
			rmSync(vault, { recursive: true, force: true });
		}
	});

	it('US-001 AC-7: a checksum mismatch fails naming the file and leaves no partial plugin folder', async () => {
		const vault = mkdtempSync(join(tmpdir(), 'us001-'));
		try {
			const bad = async (_repo: string, _version: string, name: string) =>
				name === 'manifest.json' ? new TextEncoder().encode('tampered') : good['main.js'];
			await expect(installPlugins(lockFor(good), vault, bad)).rejects.toThrow(
				'checksum mismatch: fake-plugin/manifest.json',
			);
			expect(existsSync(join(vault, '.obsidian/plugins/fake-plugin'))).toBe(false);
		} finally {
			rmSync(vault, { recursive: true, force: true });
		}
	});
});
