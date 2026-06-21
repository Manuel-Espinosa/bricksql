import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
  },
  server: {
    host: true,
    proxy: {
      '/api': process.env.VITE_API_URL ?? 'http://localhost:3000',
    },
  },
})
