import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  server: {
    port: 5173,
    host: true
  },
  build: {
    // This ensures that filenames include a hash (e.g., index-B2z8Lp9.js)
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`
      }
    },
    // Clear the dist folder before every build to prevent old file conflicts
    emptyOutDir: true
  }
})