import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { defineConfig } from 'vite'
import ckeditor5 from '@ckeditor/vite-plugin-ckeditor5'

const rootDir = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ckeditor5({ theme: require.resolve('@ckeditor/ckeditor5-theme-lark') }),
  ],
  resolve: {
    alias: {
      '@': resolve(rootDir, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Permite usar VITE_API_URL=/api/v1 en desarrollo y proxear al NestJS.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
