import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Electron production은 file:// 로 로드되므로 상대경로가 안전하고,
  // Docker 웹 배포에서는 절대경로가 라우팅 fallback에 더 안정적입니다.
  base: process.env.VITE_APP_BASE || './',
  plugins: [react(), tailwindcss()],
})
