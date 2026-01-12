import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Electron production은 file:// 로 로드되므로 절대경로(/assets) 대신 상대경로가 안전합니다.
  base: './',
  plugins: [react(), tailwindcss()],
})
