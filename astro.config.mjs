import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const locales = ['en', 'ru', 'es', 'de', 'fr'];

export default defineConfig({
  site: 'https://aicodestudio.dev',
  output: 'static',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'en',
    locales,
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: Object.fromEntries(locales.map((l) => [l, l])),
      },
    }),
  ],
});
