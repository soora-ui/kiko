import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Для GitHub Pages сайт живёт по пути /имя-репозитория/ —
// workflow передаёт BASE_PATH=/kiko/ (см. .github/workflows/deploy.yml)
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      manifest: {
        name: 'Кико — трекер вопросов',
        short_name: 'Кико',
        description: 'Личный трекер вопросов первой линии',
        lang: 'ru',
        display: 'standalone',
        start_url: './',
        scope: './',
        theme_color: '#FBFAF7',
        background_color: '#FBFAF7',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        // Шрифты PDF и react-pdf-чанк не прекэшируем: они тяжёлые (~2 МБ)
        // и нужны только на экране отчёта — иначе установка SW на iPhone
        // качает 3 МБ и «Включить уведомления» висит, пока не докачает.
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        globIgnores: ['**/react-pdf*.js', '**/ReportPDF*.js'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
})
