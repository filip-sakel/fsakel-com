import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';

export default defineConfig({
  site: 'https://fsakel.com',
  output: 'static',
  trailingSlash: 'ignore',
  // Icons are inlined as SVG at build time; only the ones used ship.
  integrations: [icon(), sitemap()],
  devToolbar: { enabled: false },
  build: {
    // Keep all CSS in external, cacheable files (strict CSP: no inline styles needed).
    inlineStylesheets: 'never',
  },
  vite: {
    build: {
      // Lightning CSS minifies for these targets. Listing Safari/Firefox keeps
      // `animation-timeline` as a longhand; without targets it gets folded into
      // the `animation` shorthand, which Chromium rejects (breaking every
      // scroll-driven animation).
      cssTarget: ['chrome120', 'safari17', 'firefox128'],
    },
  },
});
