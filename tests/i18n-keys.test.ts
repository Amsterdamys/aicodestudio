import { describe, expect, it } from 'vitest';
import { locales, t, isLocale } from '../src/i18n';

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function shape(value: Json, path = ''): string[] {
  if (Array.isArray(value)) {
    return [`${path}[${value.length}]`, ...value.flatMap((v, i) => shape(v, `${path}[${i}]`))];
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k));
  }
  return [path];
}

describe('i18n dictionaries', () => {
  const en = shape(t('en') as unknown as Json);

  it('lists the five locales in order', () => {
    expect([...locales]).toEqual(['en', 'ru', 'es', 'de', 'fr']);
  });

  for (const locale of locales) {
    it(`${locale} has exactly the English key shape`, () => {
      expect(shape(t(locale) as unknown as Json)).toEqual(en);
    });
    it(`${locale} has no empty strings`, () => {
      const empties = shape(t(locale) as unknown as Json).filter((p) => {
        const v = p.split(/[.[\]]+/).filter(Boolean).reduce<any>((o, k) => o?.[k], t(locale));
        return v === '';
      });
      expect(empties).toEqual([]);
    });
  }

  it('isLocale accepts supported and rejects others', () => {
    expect(isLocale('ru')).toBe(true);
    expect(isLocale('pt')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});
