import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';

export default defineConfig({
  site: 'https://broers.vercel.app',
  integrations: [svelte()],
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  image: { domains: ['i.ytimg.com'] },
});
