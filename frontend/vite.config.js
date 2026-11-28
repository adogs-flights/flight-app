import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ["babel-plugin-react-compiler", { target: "19" }],
        ],
      },
    }),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectRegister: 'auto',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html}', 'pwa-*.png'],
        globIgnores: ['**/privacy.html', '**/terms.html', '**/google*.html'],
      },
      manifest: {
        id: '/', name: '해봉티켓', short_name: '해봉티켓',
        lang: 'ko', start_url: '/', scope: '/', display: 'standalone',
        theme_color: '#2f3291', background_color: '#ffffff',
        icons: [192, 512].map(size => ({
          src: `/pwa-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any',
        })),
      },
      // Serve src/sw.js in vite dev too, so Push can be tested without a build.
      // The plugin replaces __WB_MANIFEST with [] here, so dev modules are never precached.
      devOptions: {
        enabled: true,
        type: 'module',
      },
    })
  ],
  preview: {
    proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
