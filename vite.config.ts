import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves a project site from /<repo>/, so production builds are
// mounted there. Dev keeps the root so local URLs stay short.
//
// There is no CSS framework here on purpose: le.ad's presentation is copied
// source in src/ui/theme.css and src/ui/parts/, in the same trade tuiparts.sh
// makes between packaged behaviour and owned presentation. A utility framework
// would make the tokens invisible again.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/le.ad/' : '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    assetsInlineLimit: 2048,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark') || id.includes('node_modules/micromark') || id.includes('node_modules/unified'))
            return 'vendor-markdown'
          if (id.includes('node_modules/react')) return 'vendor-react'
        },
      },
    },
  },
}))
