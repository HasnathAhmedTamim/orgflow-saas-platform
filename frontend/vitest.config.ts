import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Pure unit tests (utils) — avoid jsdom/undici Node compatibility issues in CI
    environment: 'node',
    globals: true,
    css: false,
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
  css: {
    postcss: { plugins: [] },
  },
});
