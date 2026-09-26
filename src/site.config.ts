export const site = {
  name: 'AI Code Studio',
  domain: 'https://aicodestudio.dev',
  email: 'aicodestudio@gmail.com',
  /** A string shows the link; null hides it. */
  links: {
    telegram: null as string | null,
    github: null as string | null,
    booking: null as string | null,
  },
  showShipped: false,
  locales: ['en', 'ru', 'es', 'de', 'fr'] as const,
  defaultLocale: 'en' as const,
};
