import { isLocale } from '../src/i18n';
import { parseCookie, pickLocale } from '../src/server/locale';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const onRequestGet: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    Vary: 'Cookie, Accept-Language',
  });
  const wanted = url.searchParams.get('lang');
  if (isLocale(wanted)) {
    headers.set('Location', `/${wanted}/`);
    headers.set('Set-Cookie', `lang=${wanted}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax; Secure`);
    return new Response(null, { status: 302, headers });
  }
  const locale = pickLocale({
    cookie: parseCookie(request.headers.get('Cookie'), 'lang'),
    country: request.headers.get('CF-IPCountry'),
    acceptLanguage: request.headers.get('Accept-Language'),
  });
  headers.set('Location', `/${locale}/`);
  return new Response(null, { status: 302, headers });
};
export const onRequestHead = onRequestGet;
