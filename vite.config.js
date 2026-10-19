import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `npm run build` produces the library bundle in dist/:
//   car-progress.js (ESM), car-progress.cjs (CommonJS), car-progress.css
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: fileURLToPath(new URL('src/index.js', import.meta.url)),
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'car-progress.js' : 'car-progress.cjs'),
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: { exports: 'named', assetFileNames: 'car-progress.[ext]' },
    },
    copyPublicDir: false,
  },
});
