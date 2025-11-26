import { defineConfig } from 'vite';

const repoName = 'quarterview';

export default defineConfig(({ mode }) => {
  const basePath = process.env.VITE_BASE_PATH ?? `/${repoName}/`;

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
    },
  };
});
