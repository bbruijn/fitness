import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base so the build works from any sub-path (GitHub Pages, a sub-folder, a custom domain).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true },
})
