import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/guardrails/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'tests/e2e/**', 'tests/guardrails/fixtures/**'],
    // Lets token tests import stylesheets as `?raw` text instead of Vitest's empty CSS stub.
    css: { include: [/\/src\/.*\.css(\?|$)/] },
  },
})
