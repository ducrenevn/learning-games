import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Pure engine/validator tests run in node; component tests opt in per file with `// @vitest-environment jsdom`.
  test: { environment: 'node', include: ['tests/**/*.test.{ts,tsx}'] },
});
