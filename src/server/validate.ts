import { isLocale, type Locale } from '../i18n';

export type Contact = { name: string; email: string; message: string; lang: Locale };
export type ValidationError = 'name' | 'email' | 'message' | 'spam';
export type ValidationResult = { ok: true; data: Contact } | { ok: false; error: ValidationError };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

export function validateContact(input: Record<string, unknown>): ValidationResult {
  if (str(input.website).trim() !== '') return { ok: false, error: 'spam' };
  const name = str(input.name).replace(/[\r\n]/g, '').trim();
  const email = str(input.email).trim();
  const message = str(input.message).trim();
  const lang = isLocale(input.lang) ? input.lang : 'en';
  if (name.length < 1 || name.length > 100) return { ok: false, error: 'name' };
  if (email.length > 254 || !EMAIL.test(email)) return { ok: false, error: 'email' };
  if (message.length < 10 || message.length > 5000) return { ok: false, error: 'message' };
  return { ok: true, data: { name, email, message, lang } };
}
