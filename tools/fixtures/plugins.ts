import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** US-001 AC-7: one pinned third-party plugin with the sha256 of each release file. */
export interface PluginLockEntry {
	id: string;
	version: string;
	repo: string;
	licence: string;
	files: Record<string, string>;
}

/** US-001 AC-7: the content of `tests/fixtures/plugins.lock.json`. */
export interface PluginLock {
	plugins: PluginLockEntry[];
}

/** US-001 AC-7: gets one release file of `repo` at `version`. */
export type FetchAsset = (repo: string, version: string, name: string) => Promise<Uint8Array>;

const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

/**
 * US-001 AC-7: installs every locked plugin into `<vault>/.obsidian/plugins/<id>/`
 * and enables it in `community-plugins.json`.
 *
 * Per plugin: every file is fetched into a temporary folder next to the
 * target and checked against its sha256; only when all match is the folder
 * renamed into place (replacing an older copy). A mismatch removes the
 * temporary folder and throws `checksum mismatch: <id>/<file>`, so no partial
 * plugin folder is left. `community-plugins.json` keeps its order; missing ids
 * are appended.
 */
export async function installPlugins(lock: PluginLock, vault: string, fetchAsset: FetchAsset): Promise<void> {
	const pluginsDir = join(vault, '.obsidian', 'plugins');
	mkdirSync(pluginsDir, { recursive: true });
	for (const plugin of lock.plugins) {
		const target = join(pluginsDir, plugin.id);
		const temp = join(pluginsDir, `.tmp-${plugin.id}-${process.pid}`);
		rmSync(temp, { recursive: true, force: true });
		mkdirSync(temp);
		try {
			for (const [name, expected] of Object.entries(plugin.files)) {
				const bytes = await fetchAsset(plugin.repo, plugin.version, name);
				if (sha256(bytes) !== expected) throw new Error(`checksum mismatch: ${plugin.id}/${name}`);
				writeFileSync(join(temp, name), bytes);
			}
		} catch (e) {
			rmSync(temp, { recursive: true, force: true });
			throw e;
		}
		rmSync(target, { recursive: true, force: true });
		renameSync(temp, target);
	}
	enable(
		vault,
		lock.plugins.map((p) => p.id),
	);
}

/** US-001 AC-7: appends `ids` missing from `community-plugins.json` (created when absent). */
function enable(vault: string, ids: string[]): void {
	const file = join(vault, '.obsidian', 'community-plugins.json');
	const enabled = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as string[]) : [];
	for (const id of ids) if (!enabled.includes(id)) enabled.push(id);
	writeFileSync(file, JSON.stringify(enabled, null, '\t') + '\n');
}
