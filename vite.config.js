import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const basePath = process.env.VITE_BASE_PATH ?? './';

  return {
    base: mode === 'production' ? basePath : '/',
    esbuild: {
      target: 'es2018',
      legalComments: 'none',
    },
    build: {
      target: 'es2018',
      minify: 'esbuild',
      sourcemap: mode !== 'production',
      outDir: 'docs',
    },
  };
});
