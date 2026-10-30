import { describe, expect, it, vi } from 'vitest';
import { runWithLimit } from '../../tools/headless/limit';
import { summarizeRuns } from '../../tools/headless/summary';

// US-001 AC-10 (time limit, hung run) and AC-11 (repeated runs), tested with
// fakes for the container process and the clock.

describe('US-001 AC-10: time limit of a headless run', () => {
	it('US-001 AC-10: the default limit is 120 000 ms', async () => {
		vi.useFakeTimers();
		try {
			const kill = vi.fn();
			const pending = runWithLimit({
				start: () => ({ done: new Promise<number>(() => {}), kill }),
				logPath: '/tmp/run.log',
			});
			await vi.advanceTimersByTimeAsync(119_999);
			expect(kill).not.toHaveBeenCalled();
			await vi.advanceTimersByTimeAsync(1);
			const result = await pending;
			expect(result.status).toBe('timeout');
		} finally {
			vi.useRealTimers();
		}
	});

	it('US-001 AC-10: at the limit the container is killed and the run is `timeout` with its log path', async () => {
		vi.useFakeTimers();
		try {
			const kill = vi.fn();
			const pending = runWithLimit({
				start: () => ({ done: new Promise<number>(() => {}), kill }),
				logPath: '/tmp/run-7.log',
				limitMs: 1000,
			});
			await vi.advanceTimersByTimeAsync(1000);
			const result = await pending;
			expect(kill).toHaveBeenCalledTimes(1);
			expect(result).toEqual({
				status: 'timeout',
				message: 'headless run timed out after 1000 ms; log: /tmp/run-7.log',
			});
		} finally {
			vi.useRealTimers();
		}
	});

	it('US-001 AC-10: a run that ends in time is `ok` and nothing is killed', async () => {
		const kill = vi.fn();
		const result = await runWithLimit({
			start: () => ({ done: Promise.resolve(0), kill }),
			logPath: '/tmp/r.log',
			limitMs: 1000,
		});
		expect(result.status).toBe('ok');
		expect(kill).not.toHaveBeenCalled();
	});

	it('US-001 AC-10: a non-zero exit is `failed` with the code and log path', async () => {
		const result = await runWithLimit({
			start: () => ({ done: Promise.resolve(3), kill: vi.fn() }),
			logPath: '/tmp/r.log',
			limitMs: 1000,
		});
		expect(result).toEqual({ status: 'failed', message: 'headless run exited with 3; log: /tmp/r.log' });
	});
});

describe('US-001 AC-11: repeated runs', () => {
	const run = (fallback: string[], written: string[]) => ({ fallbackNotes: fallback, writtenPages: written });

	it('US-001 AC-11: fallback counted per note across runs (`fallback: 3/3`)', () => {
		const s = summarizeRuns(
			['Composed/Big Page.md', 'Plain/Control.md'],
			[
				run(['Big Page.md'], ['Composed/Big Page.md', 'Plain/Control.md']),
				run(['Big Page.md'], ['Composed/Big Page.md', 'Plain/Control.md']),
				run(['Big Page.md'], ['Composed/Big Page.md', 'Plain/Control.md']),
			],
		);
		expect(s['Composed/Big Page.md'].fallback).toBe('fallback: 3/3');
		expect(s['Plain/Control.md'].fallback).toBe('fallback: 0/3');
	});

	it('US-001 AC-11: varying outcomes are kept apart (`fallback: 1/2`)', () => {
		const s = summarizeRuns(
			['Embeds/Markdown Link Embed.md'],
			[
				run(['Markdown Link Embed.md'], ['Embeds/Markdown Link Embed.md']),
				run([], ['Embeds/Markdown Link Embed.md']),
			],
		);
		expect(s['Embeds/Markdown Link Embed.md'].fallback).toBe('fallback: 1/2');
	});

	it('US-001 AC-11: a page missing in a run is reported per run (`written: 1/2`)', () => {
		const s = summarizeRuns(['Plain/Control.md'], [run([], ['Plain/Control.md']), run([], [])]);
		expect(s['Plain/Control.md'].written).toBe('written: 1/2');
	});

	it('US-001 AC-11: the warning names a file; it is credited to the note with that name only', () => {
		const s = summarizeRuns(['A/Note.md', 'B/Other.md'], [run(['Note.md'], ['A/Note.md', 'B/Other.md'])]);
		expect(s['A/Note.md'].fallback).toBe('fallback: 1/1');
		expect(s['B/Other.md'].fallback).toBe('fallback: 0/1');
	});

	it('US-001 AC-11: two notes with the same file name are refused (SCAR-011, AC-6 unique names)', () => {
		// The fallback warning carries only the file name, so a summary over
		// `A/Note.md` and `B/Note.md` could not tell them apart.
		expect(() => summarizeRuns(['A/Note.md', 'B/Note.md'], [])).toThrow('duplicate note name: Note.md');
	});
});
