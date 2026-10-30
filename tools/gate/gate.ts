/** US-001 | AC-4: the gate steps, in order. */
export const GATE_STEPS = ['typecheck', 'lint', 'test', 'build', 'test:integration'];

/** US-001 | AC-4 / D2: the release gate runs without the Docker integration tests. */
export const RELEASE_GATE_STEPS = GATE_STEPS.filter((s) => s !== 'test:integration');

/** Result of a gate run. */
export interface GateResult {
	ok: boolean;
	failedAt?: string;
	message: string;
}

/**
 * US-001 | AC-4: runs the steps in order and stops at the first failure.
 *
 * `run` executes one step and resolves to its exit code; 0 is a pass. Steps
 * after a failure are not run. The message names the failed step.
 */
export async function runGate(steps: readonly string[], run: (step: string) => Promise<number>): Promise<GateResult> {
	for (const step of steps) {
		const code = await run(step);
		if (code !== 0) return { ok: false, failedAt: step, message: `gate failed at ${step}` };
	}
	return { ok: true, message: `gate passed: ${steps.join(', ')}` };
}
