import { readFileSync } from 'node:fs';
import { installPlugins, type PluginLock } from './plugins';

/**
 * US-001 AC-7: gets a release file from GitHub.
 *
 * URL `https://github.com/<repo>/releases/download/<version>/<name>`; the tag
 * equals the version for both pinned plugins (checked with `gh release
 * download` on 2026-10-30). A non-200 answer throws with the URL.
 */
async function fromGitHub(repo: string, version: string, name: string): Promise<Uint8Array> {
	const url = `https://github.com/${repo}/releases/download/${version}/${name}`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`download failed: ${String(res.status)} ${url}`);
	return new Uint8Array(await res.arrayBuffer());
}

/** US-001 AC-7: `npm run fixtures:plugins` installs the locked plugins into the fixture vault. */
async function main(): Promise<void> {
	const lock = JSON.parse(readFileSync('tests/fixtures/plugins.lock.json', 'utf8')) as PluginLock;
	await installPlugins(lock, 'tests/fixtures/vault', fromGitHub);
	console.log(`installed: ${lock.plugins.map((p) => `${p.id} ${p.version}`).join(', ')}`);
}

main().catch((e: unknown) => {
	console.error(e instanceof Error ? e.message : String(e));
	process.exit(1);
});
