import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  base: '/novel-writing-tool-starter/',
  plugins: [vue()],
});
