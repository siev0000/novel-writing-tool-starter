import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = repositoryName ? `/${repositoryName}/` : '/';

export default defineConfig({
  base,
  plugins: [vue()],
});
