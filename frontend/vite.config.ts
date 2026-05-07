import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Professional configuration for Tradara
export default defineConfig({
  plugins: [react()],
  //  CRITICAL: This ensures absolute paths for all assets
  base: '/', 
  publicDir: 'public',
  build: {
    outDir: 'dist', // Ensure Vite builds to 'dist'
    rollupOptions: {
      output: {
        // These hashes help with "Cache Busting" for your updates
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