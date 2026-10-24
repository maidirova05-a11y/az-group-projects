import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

/** В разработке: /admin/* отдаёт admin.html, остальные маршруты без расширения — index.html (как rewrites на Vercel). */
function spaFallback(): Plugin {
  return {
    name: 'az-spa-fallback',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? '/';
        const [pathname] = url.split('?');
        const isPage = req.method === 'GET' && !pathname.startsWith('/api') && !pathname.startsWith('/@') && !pathname.includes('.') && !pathname.startsWith('/node_modules');
        if (isPage) req.url = (pathname === '/admin' || pathname.startsWith('/admin/') ? '/admin.html' : '/index.html') + url.slice(pathname.length);
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), spaFallback()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src'), '@shared': path.resolve(__dirname, 'shared') } },
  appType: 'mpa',
  build: {
    rollupOptions: {
      // Две точки входа: публичный сайт и админка (/admin), у каждой свой бандл.
      input: { main: path.resolve(__dirname, 'index.html'), admin: path.resolve(__dirname, 'admin.html') },
      output: {
        // Общие библиотеки — в чанки с понятными именами (иначе Rollup называет общий чанк по случайному модулю, например «safe-url»).
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules[\/](react|react-dom|scheduler)[\/]/.test(id)) return 'react';
          return 'vendor';
        },
      },
    },
  },
  server: {
    // Уважаем PORT из окружения (например, когда 5173 занят другим
    // процессом и раннер назначает свободный порт через autoPort).
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
    proxy: { '/api': `http://localhost:${process.env.API_PORT || 8787}` },
  },
});
