import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Pure engine/validator tests run in node; component tests opt in per file with `// @vitest-environment jsdom`.
  test: {
    environment: 'node', include: ['tests/**/*.test.{ts,tsx}'],
    // DOM flows contend heavily when CPU-based defaults start many jsdom workers.
    // Bound concurrency, keeping the default 5s timeout and existing per-test budgets.
    maxWorkers: 2,
  },
});
