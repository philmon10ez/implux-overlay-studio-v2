import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { vitePlugin as remix } from '@remix-run/dev';
import { defineConfig } from 'vite';

const appRoot = dirname(fileURLToPath(import.meta.url));
const stagingLocal = process.env.POPTEK_STAGING_LOCAL === '1';
const host = new URL(process.env.SHOPIFY_APP_URL || process.env.APP_URL || 'http://localhost').hostname;

export default defineConfig({
  // Staging dev must not load the production .env in this directory.
  envDir: stagingLocal ? join(appRoot, 'env', 'staging') : appRoot,
  // Nodemailer is CommonJS-heavy; load from node_modules at runtime, not bundled into SSR.
  ssr: {
    external: ['nodemailer'],
  },
  server: {
    allowedHosts: [host],
    port: Number(process.env.PORT || 3000),
  },
  plugins: [
    remix({
      ignoredRouteFiles: ['**/.*'],
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_lazyRouteDiscovery: true,
      },
    }),
  ],
  build: { assetsInlineLimit: 0 },
  optimizeDeps: {
    include: ['@shopify/app-bridge-react', '@shopify/polaris'],
  },
});
