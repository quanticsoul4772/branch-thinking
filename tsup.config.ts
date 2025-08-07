import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  target: 'es2020',
  outDir: 'dist',
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  bundle: true,
  external: ['@modelcontextprotocol/sdk', '@xenova/transformers', 'chalk'],
  esbuildOptions: (options) => {
    options.banner = {
      js: '#!/usr/bin/env node',
    };
  },
});