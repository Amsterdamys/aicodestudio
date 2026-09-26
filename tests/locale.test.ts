import { describe, expect, it } from 'vitest';
import { parseCookie, pickLocale } from '../src/server/locale';
import { onRequestGet } from '../functions/index';

describe('parseCookie', () => {
  it('finds a named cookie among others', () => {
    expect(parseCookie('a=1; lang=fr; b=2', 'lang')).toBe('fr');
  });
  it('returns null without a header', () => {
    expect(parseCookie(null, 'lang')).toBeNull();
  });
});

describe('pickLocale', () => {
  it('prefers the cookie over the country', () => {
    expect(pickLocale({ cookie: 'de', country: 'RU' })).toBe('de');
  });
  it('maps countries', () => {
    expect(pickLocale({ country: 'KZ' })).toBe('ru');
    expect(pickLocale({ country: 'MX' })).toBe('es');
    expect(pickLocale({ country: 'CH' })).toBe('de');
    expect(pickLocale({ country: 'BE' })).toBe('fr');
    expect(pickLocale({ country: 'US' })).toBe('en');
  });
  it('reads Accept-Language with region subtags and q-values', () => {
    expect(pickLocale({ acceptLanguage: 'ru-RU,ru;q=0.9,en;q=0.8' })).toBe('ru');
  });
  it('skips unsupported languages to the first supported one', () => {
    expect(pickLocale({ acceptLanguage: 'pt-BR,pt;q=0.9,es;q=0.5' })).toBe('es');
  });
  it('falls back to en when nothing matches', () => {
    expect(pickLocale({ cookie: 'xx', country: 'ZZ', acceptLanguage: 'tlh' })).toBe('en');
  });
});

function ctx(url: string, headers: Record<string, string> = {}) {
  return { request: new Request(url, { headers }) } as unknown as Parameters<typeof onRequestGet>[0];
}

describe('root redirect function', () => {
  it('sets the cookie and redirects for ?lang=', async () => {
    const res = await onRequestGet(ctx('https://aicodestudio.dev/?lang=ru'));
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/ru/');
    expect(res.headers.get('Set-Cookie')).toContain('lang=ru');
  });
  it('ignores an invalid ?lang= and detects from the country', async () => {
    const res = await onRequestGet(ctx('https://aicodestudio.dev/?lang=xx', { 'CF-IPCountry': 'FR' }));
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/fr/');
    expect(res.headers.get('Set-Cookie')).toBeNull();
  });
  it('is never cached', async () => {
    const res = await onRequestGet(ctx('https://aicodestudio.dev/'));
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(res.headers.get('Vary')).toBe('Cookie, Accept-Language');
  });
});

describe('root redirect on HEAD', () => {
  it('answers HEAD like GET so link checkers see the redirect', async () => {
    const { onRequestHead } = await import('../functions/index');
    const res = await onRequestHead(ctx('https://aicodestudio.dev/', { 'CF-IPCountry': 'ES' }));
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/es/');
  });
});

describe('malformed cookies', () => {
  it('parseCookie returns null instead of throwing on a bad percent-encoding', () => {
    expect(parseCookie('lang=%E0', 'lang')).toBeNull();
  });
  it('root redirect still answers 302 with a malformed lang cookie', async () => {
    const res = await onRequestGet(ctx('https://aicodestudio.dev/', { Cookie: 'lang=%E0', 'CF-IPCountry': 'DE' }));
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/de/');
  });
});
