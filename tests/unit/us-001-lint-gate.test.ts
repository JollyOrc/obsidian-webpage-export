import { describe, expect, it, vi } from 'vitest';
import { GATE_STEPS, RELEASE_GATE_STEPS, runGate } from '../../tools/gate/gate';
import { compareUpstreamLint } from '../../tools/lint/baseline';

// US-001 AC-2 (upstream lint frozen at a baseline) and AC-4 (one gate
// command, stops at the first failure).

describe('US-001 AC-2: upstream lint baseline', () => {
	it('US-001 AC-2: 478 against 478 passes without a message', () => {
		expect(compareUpstreamLint(478, 478)).toEqual({ ok: true, message: '' });
	});

	it('US-001 AC-2: 479 against 478 fails with the exact message', () => {
		expect(compareUpstreamLint(479, 478)).toEqual({
			ok: false,
			message: 'upstream lint findings 479 > baseline 478',
		});
	});

	it('US-001 AC-2: 460 against 478 passes and prints the hint (D3: no rewrite)', () => {
		expect(compareUpstreamLint(460, 478)).toEqual({
			ok: true,
			message: 'upstream lint findings 460 < baseline 478: lower the baseline',
		});
	});

	it('US-001 AC-2: 0 against 478 passes with the hint (lower end)', () => {
		expect(compareUpstreamLint(0, 478).ok).toBe(true);
	});
});

describe('US-001 AC-4: gate', () => {
	it('US-001 AC-4: the gate steps and their order', () => {
		expect(GATE_STEPS).toEqual(['typecheck', 'lint', 'test', 'build', 'test:integration']);
	});

	it('US-001 AC-4 / D2: the release gate is the gate without test:integration', () => {
		expect(RELEASE_GATE_STEPS).toEqual(['typecheck', 'lint', 'test', 'build']);
	});

	it('US-001 AC-4: all steps pass → ok, every step ran once in order', async () => {
		const run = vi.fn(async (_step: string) => 0);
		const r = await runGate(GATE_STEPS, run);
		expect(r.ok).toBe(true);
		expect(run.mock.calls.map((c) => c[0])).toEqual(GATE_STEPS);
	});

	it('US-001 AC-4: stops at the first failure and names it; later steps do not run', async () => {
		const run = vi.fn(async (step: string) => (step === 'lint' ? 1 : 0));
		const r = await runGate(GATE_STEPS, run);
		expect(r).toEqual({ ok: false, failedAt: 'lint', message: 'gate failed at lint' });
		expect(run.mock.calls.map((c) => c[0])).toEqual(['typecheck', 'lint']);
	});

	it('US-001 AC-4: a failure in the last step is reported too', async () => {
		const run = vi.fn(async (step: string) => (step === 'test:integration' ? 2 : 0));
		const r = await runGate(GATE_STEPS, run);
		expect(r.failedAt).toBe('test:integration');
	});
});
