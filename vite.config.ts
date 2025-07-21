// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  define: {
    global: 'globalThis'
  },
  server: {
    port: 5173,
    proxy: {
      '/data-api': {
        target: 'http://localhost:4280',
        changeOrigin: true,
        secure: false
      },
      '/.auth': {
        target: 'http://localhost:4280',
        changeOrigin: true,
        secure: false
      }
    }
  },
})