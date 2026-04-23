import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Standard local configuration
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
})