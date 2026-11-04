import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const commit = loadEnv(mode, '.', 'CF_PAGES_').CF_PAGES_COMMIT_SHA;
  const version = commit && /^[a-f0-9]{40}$/i.test(commit) ? commit.slice(0, 7) : 'local';
  return {
    plugins: [react()],
    define: { __APP_VERSION__: JSON.stringify(version) },
    server: { port: 3001, strictPort: true },
  };
});
