import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'fs'

const keyPath = path.resolve(__dirname, './desktop-k0hmv5g.tailbd4179.ts.net.key')
const certPath = path.resolve(__dirname, './desktop-k0hmv5g.tailbd4179.ts.net.crt')
const hasCert = fs.existsSync(keyPath) && fs.existsSync(certPath)

if (!hasCert) {
  console.log('\x1b[33m%s\x1b[0m', '⚠️ Tailscale TLS certificates not found. Running Vite in HTTP mode.')
  console.log('\x1b[33m%s\x1b[0m', 'Run: tailscale cert desktop-k0hmv5g.tailbd4179.ts.net  to enable HTTPS.')
}

export default defineConfig(({ command }) => {
  const isDev = command === 'serve'

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-icon.png', 'icon.svg'],
        manifest: {
          name: 'CheetahFit',
          short_name: 'CheetahFit',
          description: 'Your AI Fitness Companion',
          theme_color: '#0f1419',
          background_color: '#0f1419',
          display: 'standalone',
          orientation: 'portrait',
          lang: 'en-US',
          start_url: '/',
          icons: [
            {
              src: '/icon-light-32x32.png',
              sizes: '32x32',
              type: 'image/png'
            },
            {
              src: '/icon-dark-32x32.png',
              sizes: '32x32',
              type: 'image/png'
            },
            {
              src: '/apple-icon.png',
              sizes: '180x180',
              type: 'image/png'
            },
            {
              src: '/favicon/web-app-manifest-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icon.svg',
              sizes: '180x180',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: '/favicon/web-app-manifest-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: isDev ? [] : ['**/*.{js,css,html,ico,png,svg}']
        },
        devOptions: {
          enabled: true
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
    css: {
      postcss: './postcss.config.js',
    },
    server: {
      host: true,
      allowedHosts: ["desktop-k0hmv5g.tailbd4179.ts.net"],
      https: hasCert ? {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      } : undefined,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  }
})
