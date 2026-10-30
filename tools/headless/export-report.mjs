// US-001 AC-8b: the script injected into the headless Obsidian (mounted over
// the image's /export-vault.mjs; upstream's script stays unchanged).
//
// It runs where upstream's script runs (electron-injector, `this` is the
// Obsidian window). Under Obsidian 1.14.5 the injector loses the console
// output (spike addendum), so the script writes its own report:
// /output/.run-report.json with obsidianVersion, startedAt, endedAt,
// exported and every warning and error line. Measured 2026-10-30:
// `ipcRenderer.sendSync('version')` gives the app version; a console.warn
// wrapper receives ExportLog's `[WARNING] ...` lines.
/* global require, process -- provided by Obsidian's Electron renderer */
/* eslint-disable @typescript-eslint/no-var-requires -- evaluated as a plain script by electron-injector: no module syntax; require is the loader */
(async () => {
	const fs = require('node:fs');
	const report = {
		obsidianVersion: 'unknown',
		startedAt: new Date().toISOString(),
		endedAt: '',
		exported: false,
		warnings: [],
		errors: [],
	};
	const warn = console.warn;
	const error = console.error;
	console.warn = (...args) => {
		report.warnings.push(args.map(String).join(' '));
		warn(...args);
	};
	console.error = (...args) => {
		report.errors.push(args.map(String).join(' '));
		error(...args);
	};
	try {
		report.obsidianVersion = String(require('electron').ipcRenderer.sendSync('version'));
		await this.app.plugins.setEnable(true);
		await this.app.plugins.enablePlugin('webpage-html-export');
		const plugin = this.app.plugins.getPlugin('webpage-html-export');
		await plugin.exportVault('/output');
		report.exported = true;
	} catch (e) {
		report.errors.push('export script: ' + String((e && e.stack) || e));
	} finally {
		report.endedAt = new Date().toISOString();
		// Written before the process ends: a missing report means the run did
		// not get here (frozen or crashed), which the runner counts as failed.
		fs.writeFileSync('/output/.run-report.json', JSON.stringify(report, null, 2));
		require('node:process').kill(process.pid, 'SIGKILL');
	}
})();
