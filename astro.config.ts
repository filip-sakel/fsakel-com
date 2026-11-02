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
      // One site-wide stylesheet (~6 KB compressed): fetched once, then every
      // navigation needs only the HTML, never a new per-page CSS round-trip.
      cssCodeSplit: false,
      // Never inline fonts as data: URIs. The CSP has no font-src, so
      // default-src 'self' blocks them; and a unicode-range subset is only
      // fetched when needed, so inlining just bloats the stylesheet.
      assetsInlineLimit: (file) => (/\.(woff2?|ttf|otf)$/.test(file) ? false : undefined),
    },
  },
});
