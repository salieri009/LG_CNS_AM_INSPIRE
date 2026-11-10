import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // three.js 3D 뷰어는 첫 화면과 따로(지연) 불러오는 묶음이라 1 MB 안팎이 정상이다. 첫 화면 묶음은 400 kB 아래로 유지한다
  build: { chunkSizeWarningLimit: 1100 },
})
