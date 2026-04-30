import { defineConfig } from 'vite'

export default defineConfig({
  base: '/cup-heroes-pwa/', // GitHub Pages repo name
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 3000,
    open: true,
  },
})
