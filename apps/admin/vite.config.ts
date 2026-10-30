import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  envDir: fileURLToPath(new URL('../../', import.meta.url)),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3011', changeOrigin: true },
      '/docs-json': { target: 'http://127.0.0.1:3011', changeOrigin: true },
      '/docs': { target: 'http://127.0.0.1:3011', changeOrigin: true },
    },
  },
})
