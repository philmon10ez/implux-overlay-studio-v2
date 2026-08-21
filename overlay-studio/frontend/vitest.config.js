import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
    env: {
      VITE_APP_ENV: 'development',
      VITE_API_URL: 'http://localhost:3001',
    },
  },
});
