import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' para que funcione igual en local y en GitHub Pages (subcarpeta del repo).
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
