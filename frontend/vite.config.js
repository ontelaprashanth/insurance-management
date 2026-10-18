import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev server runs on 5173, which your Spring Boot CORS config already allows.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
})
