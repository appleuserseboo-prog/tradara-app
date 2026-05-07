import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Standard local configuration for Tradara with Cache Busting
export default defineConfig({
  plugins: [react()],
  publicDir: 'public', // Ensures manifest and service worker are picked up
  build: {
    // 🛠 Forces generation of hashed filenames for Cache Busting
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
})