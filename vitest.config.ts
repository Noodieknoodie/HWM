// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'
import { VitestReporter } from 'tdd-guard'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './TESTS/setup/test-setup.ts',
    reporters: ['default', new VitestReporter()],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
