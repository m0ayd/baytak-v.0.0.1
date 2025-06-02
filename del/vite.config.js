// public/vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      // Proxy /api requests to your backend server
      '/api': {
        target: 'http://localhost:3000', // Your backend address
        changeOrigin: true,
        secure: false, // Set to true if backend uses HTTPS
        // Optional: rewrite path if needed
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})