import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  appType: 'spa', // This enables history API fallback for client-side routing
  server: {
    proxy: {
      '/api': {
        target: '',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
