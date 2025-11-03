import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-public-files',
      writeBundle() {
        // Copy public HTML files to dist directory
        try {
          copyFileSync('public-landing.html', 'dist/public-landing.html')
          copyFileSync('public-research.html', 'dist/public-research.html')
          console.log('✅ Copied public HTML files to dist/')
        } catch (error) {
          console.warn('⚠️ Could not copy public HTML files:', error.message)
        }
      }
    }
  ],
  server: {
    port: 6734
  }
})
