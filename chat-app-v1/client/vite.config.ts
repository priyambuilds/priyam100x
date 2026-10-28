import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The browser talks only to the Vite origin; these paths are proxied to the
// backend (including the WebSocket upgrade), so no CORS setup is needed in dev.
// Point it at the nginx load balancer with VITE_BACKEND_URL=http://localhost:8080.
const backend = process.env.VITE_BACKEND_URL ?? 'http://localhost:3000'
const proxied = ['/auth', '/me', '/users', '/rooms', '/ws']

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: Object.fromEntries(proxied.map((p) => [p, { target: backend, ws: true, changeOrigin: true }])),
  },
})
