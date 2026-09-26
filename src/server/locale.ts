import { isLocale, type Locale } from '../i18n';

const ES = ['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY'];
const RU = ['RU', 'BY', 'KZ', 'KG'];
const DE = ['DE', 'AT', 'CH'];
const FR = ['FR', 'BE', 'LU', 'MC'];

export const COUNTRY_LOCALE: Record<string, Locale> = Object.fromEntries([
  ...RU.map((c) => [c, 'ru']),
  ...ES.map((c) => [c, 'es']),
  ...DE.map((c) => [c, 'de']),
  ...FR.map((c) => [c, 'fr']),
]);

export function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) {
      try {
        return decodeURIComponent(v.join('='));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function fromAcceptLanguage(header: string): Locale | null {
  const ranked = header
    .split(',')
    .map((item, index) => {
      const [tag, ...params] = item.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      return { lang: tag.toLowerCase().split('-')[0], q: q ? Number(q.slice(2)) : 1, index };
    })
    .filter((r) => r.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  for (const r of ranked) if (isLocale(r.lang)) return r.lang;
  return null;
}

export function pickLocale(input: {
  cookie?: string | null;
  country?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  if (isLocale(input.cookie)) return input.cookie;
  const byCountry = input.country ? COUNTRY_LOCALE[input.country.toUpperCase()] : undefined;
  if (byCountry) return byCountry;
  if (input.acceptLanguage) {
    const byHeader = fromAcceptLanguage(input.acceptLanguage);
    if (byHeader) return byHeader;
  }
  return 'en';
}
