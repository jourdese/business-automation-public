import { sites } from '@openai/sites-vite-plugin';
import { existsSync } from 'node:fs';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
export default defineConfig({
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [
    vinext(),
    ...(!process.env.VERCEL && existsSync('.openai/hosting.json') ? [sites()] : []),
  ],
});
