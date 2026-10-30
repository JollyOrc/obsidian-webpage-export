import { defineConfig } from 'vitest/config';

// US-001 AC-3: Vitest runs the tests of the fork; titles start with
// `US-NNN AC-n:` (docs/technical/tests.md).
export default defineConfig({
	test: {
		include: ['tests/**/*.test.ts'],
	},
});
