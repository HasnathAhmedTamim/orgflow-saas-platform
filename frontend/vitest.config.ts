import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Pure unit tests (utils) — avoid jsdom/undici Node compatibility issues in CI
    environment: 'node',
    globals: true,
    css: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    postcss: { plugins: [] },
  },
});
