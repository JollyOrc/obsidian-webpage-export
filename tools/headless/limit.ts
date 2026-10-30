/** US-001 AC-10: a started container run: its exit code, and how to stop it. */
export interface StartedRun {
	done: Promise<number>;
	kill: () => void;
}

/** US-001 AC-10: the outcome of a run under a time limit. */
export interface LimitedResult {
	status: 'ok' | 'failed' | 'timeout';
	message: string;
}

/** US-001 AC-10: measured 15 to 19 s per spike run; 120 s leaves margin for a busy machine. */
export const DEFAULT_LIMIT_MS = 120_000;

/**
 * US-001 AC-10: runs `start()` and waits at most `limitMs`.
 *
 * Exit code 0 is `ok`; another code is `failed` with the code and the log
 * path. At the limit `kill()` is called once and the result is `timeout`
 * with the log path, so a frozen Obsidian fails a test instead of hanging
 * the suite. The timer is cleared when the run ends first.
 */
export async function runWithLimit(opts: {
	start: () => StartedRun;
	logPath: string;
	limitMs?: number;
}): Promise<LimitedResult> {
	const limitMs = opts.limitMs ?? DEFAULT_LIMIT_MS;
	const run = opts.start();
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<'timeout'>((resolve) => {
		timer = setTimeout(() => resolve('timeout'), limitMs);
	});
	const outcome = await Promise.race([run.done, timeout]);
	if (timer !== undefined) clearTimeout(timer);
	if (outcome === 'timeout') {
		run.kill();
		return { status: 'timeout', message: `headless run timed out after ${limitMs} ms; log: ${opts.logPath}` };
	}
	if (outcome !== 0)
		return { status: 'failed', message: `headless run exited with ${outcome}; log: ${opts.logPath}` };
	return { status: 'ok', message: '' };
}
