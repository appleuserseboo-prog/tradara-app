import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Standard local configuration for Tradara
export default defineConfig({
  plugins: [react()],
  publicDir: 'public', // Ensures manifest and service worker are picked up
  server: {
    port: 5173,
    host: true
  }
})