/**
 * Vite build config for the standalone widget bundle (widget.js).
 *
 * Produces a single self-executing IIFE file at dist/widget.js that can be
 * dropped onto any page with a plain <script> tag – no bundler required.
 *
 * Run separately:  npm run build:widget
 * Or via the combined build:  npm run build   (calls both)
 */

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load .env / .env.production so VITE_API_URL is available when building locally.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],

    define: {
      // Bake the API URL into the bundle at build time.
      // Falls back to the production Railway URL if the env var isn't set.
      'import.meta.env.VITE_API_URL': JSON.stringify(
        env.VITE_API_URL || 'https://backend-production-849c.up.railway.app'
      ),
      // Vite normally replaces these automatically in app builds; we must
      // define them explicitly for library mode so React picks the right branch.
      'import.meta.env.MODE': JSON.stringify(mode),
      'import.meta.env.DEV':  JSON.stringify(false),
      'import.meta.env.PROD': JSON.stringify(true),
      'import.meta.env.SSR':  JSON.stringify(false),
      // Some dependencies (e.g. html2pdf deps) look for process.env.NODE_ENV
      'process.env.NODE_ENV': JSON.stringify('production'),
    },

    build: {
      // Output next to the main app build so Vercel serves both from /dist
      outDir: 'dist',
      // IMPORTANT: do not wipe dist/ – the main app build is already there
      emptyOutDir: false,

      lib: {
        entry: './src/widget.jsx',
        name: 'GetFoundWidget',   // global var name on window (unused for IIFE)
        formats: ['iife'],
        // Always output as widget.js (not widget.iife.js)
        fileName: () => 'widget',
      },

      rollupOptions: {
        output: {
          // Inline all dynamic imports so the result is a single file.
          // This includes html2pdf.js which is ~1 MB; it caches after first load.
          inlineDynamicImports: true,
          entryFileNames: 'widget.js',
        },
      },
    },
  }
})
