import { defineConfig } from 'vitest/config'
import path from 'path'
import { TDDGuardReporter } from 'tdd-guard/vitest-reporter'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './TESTS/setup/test-setup.ts',
    reporters: ['default', new TDDGuardReporter()],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
