import en from './en.json';
import ru from './ru.json';
import es from './es.json';
import de from './de.json';
import fr from './fr.json';
import { site } from '../site.config';

export const locales = site.locales;
export type Locale = (typeof locales)[number];
export type Dict = typeof en;

const dicts: Record<Locale, Dict> = { en, ru, es, de, fr };

export function t(locale: Locale): Dict {
  return dicts[locale];
}

export function isLocale(x: unknown): x is Locale {
  return typeof x === 'string' && (locales as readonly string[]).includes(x);
}
