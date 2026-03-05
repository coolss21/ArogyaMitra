import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://127.0.0.1:8000',
      '/profile': 'http://127.0.0.1:8000',
      '/plans': 'http://127.0.0.1:8000',
      '/aromi': 'http://127.0.0.1:8000',
      '/progress': 'http://127.0.0.1:8000',
      '/gamification': 'http://127.0.0.1:8000',
      '/grocery': 'http://127.0.0.1:8000',
      '/challenges': 'http://127.0.0.1:8000',
      '/reports': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
    },
  },
})
