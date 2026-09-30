import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // `npm run dev:lan`: self-signed HTTPS so phones on the Wi-Fi get camera access.
    plugins: [react(), mode === 'lan' && basicSsl()],
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    server: {
      // Lets a phone reach the dev server through `cloudflared tunnel --url`.
      allowedHosts: ['.trycloudflare.com'],
      // With no VITE_API_URL set, the app calls same-origin /api/* paths and the
      // dev server forwards them to the local backend — so development never
      // hits the production API by accident.
      proxy: {
        '/api': {
          target: env.VITE_DEV_API_TARGET || 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    build: {
      sourcemap: false,
      // No manualChunks here: Vite 8 builds on rolldown, which rejects the
      // object form ("manualChunks is not a function") and already splits
      // vendor code — recharts, router and icons each land in their own chunk.
    },
  };
});
