import { spawn } from 'node:child_process';
import { GATE_STEPS, RELEASE_GATE_STEPS, runGate } from './gate';

/**
 * US-001 | AC-4: `npm run gate` (all steps) and `npm run gate:release`
 * (`--release`, without `test:integration`). Each step runs as
 * `npm run <step>` with inherited output; exit 1 names the failed step.
 */
async function main(): Promise<void> {
	const steps = process.argv.includes('--release') ? RELEASE_GATE_STEPS : GATE_STEPS;
	const result = await runGate(
		steps,
		(step) =>
			new Promise<number>((resolve) => {
				console.log(`\n== gate: ${step}`);
				spawn('npm', ['run', step], { stdio: 'inherit' }).on('close', (code) => resolve(code ?? 1));
			}),
	);
	console.log(`\n${result.message}`);
	process.exit(result.ok ? 0 : 1);
}

void main();
