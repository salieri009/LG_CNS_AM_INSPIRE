import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
// VITE_API_MODE=http 로 띄우면 /api 요청을 백엔드(기본 localhost:8080)로 넘긴다
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: { '/api': env.BACKEND_URL || 'http://localhost:8080' },
    },
  }
})
