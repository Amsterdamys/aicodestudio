import { describe, expect, it } from 'vitest';
import { validateContact } from '../src/server/validate';

const good = { name: '  Ada Lovelace ', email: 'ada@example.com', message: 'I need a web app for my bakery, please.', lang: 'ru', website: '' };

describe('validateContact', () => {
  it('accepts valid input and trims fields', () => {
    const r = validateContact(good);
    expect(r).toEqual({ ok: true, data: { name: 'Ada Lovelace', email: 'ada@example.com', message: 'I need a web app for my bakery, please.', lang: 'ru' } });
  });
  it('strips CR and LF from the name', () => {
    const r = validateContact({ ...good, name: 'A\r\nBcc: x' });
    expect(r.ok && r.data.name).toBe('ABcc: x');
  });
  it('rejects a whitespace-only message', () => {
    expect(validateContact({ ...good, message: '   ' })).toEqual({ ok: false, error: 'message' });
  });
  it('rejects a message shorter than 10 characters', () => {
    expect(validateContact({ ...good, message: 'hi there' })).toEqual({ ok: false, error: 'message' });
  });
  it('rejects a malformed email', () => {
    expect(validateContact({ ...good, email: 'nope' })).toEqual({ ok: false, error: 'email' });
  });
  it('rejects an empty name', () => {
    expect(validateContact({ ...good, name: '' })).toEqual({ ok: false, error: 'name' });
  });
  it('flags a filled honeypot as spam', () => {
    expect(validateContact({ ...good, website: 'http://spam' })).toEqual({ ok: false, error: 'spam' });
  });
  it('falls back to en for an unknown lang', () => {
    const r = validateContact({ ...good, lang: 'xx' });
    expect(r.ok && r.data.lang).toBe('en');
  });
});
