import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: './', // Use relative paths for assets
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Target browsers that support native ES modules in script tags
    target: 'esnext',
    // Use esbuild minifier (default, no extra deps needed)
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Use inlineDynamicImports to avoid additional module loading issues
        inlineDynamicImports: true,
        // Single bundle format that works better with file://
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  server: {
    port: 3000,
  },
});
