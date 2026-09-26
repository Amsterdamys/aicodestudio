import { describe, expect, it } from 'vitest';
import { handleContact, type Env } from '../src/server/contact';

type Call = { url: string; init: RequestInit };

function stubFetch(responses: Record<string, () => Response>) {
  const calls: Call[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init: init ?? {} });
    const key = Object.keys(responses).find((k) => url.startsWith(k));
    if (!key) throw new Error(`unexpected fetch ${url}`);
    return responses[key]();
  }) as typeof fetch;
  return { fetchImpl, calls };
}

const RESEND = 'https://api.resend.com/emails';
const TURNSTILE = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const ok = () => new Response(JSON.stringify({ id: 'x' }), { status: 200 });
const env: Env = { RESEND_API_KEY: 'k', CONTACT_TO: 'aicodestudio@gmail.com' };
const body = { name: 'Ada', email: 'ada@example.com', message: 'I need a web app for my bakery.', lang: 'ru' };

function jsonReq(data: unknown) {
  return new Request('https://aicodestudio.dev/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });
}
function formReq(data: Record<string, string>) {
  return new Request('https://aicodestudio.dev/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(data).toString(),
  });
}

describe('handleContact', () => {
  it('sends through Resend with Reply-To set to the visitor and answers JSON', async () => {
    const { fetchImpl, calls } = stubFetch({ [RESEND]: ok });
    const res = await handleContact(jsonReq(body), env, fetchImpl);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    const sent = JSON.parse(String(calls[0].init.body));
    expect(sent.reply_to).toBe('ada@example.com');
    expect(sent.to).toEqual(['aicodestudio@gmail.com']);
    expect(sent.subject).toBe('New enquiry from Ada');
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer k');
  });
  it('reports a delivery failure as 502, never success', async () => {
    const { fetchImpl } = stubFetch({ [RESEND]: () => new Response('boom', { status: 500 }) });
    const res = await handleContact(jsonReq(body), env, fetchImpl);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: 'delivery' });
  });
  it('redirects a form post to the locale page with #sent', async () => {
    const { fetchImpl } = stubFetch({ [RESEND]: ok });
    const res = await handleContact(formReq(body), env, fetchImpl);
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('/ru/#sent');
  });
  it('redirects a form post to #error when delivery fails', async () => {
    const { fetchImpl } = stubFetch({ [RESEND]: () => new Response('boom', { status: 500 }) });
    const res = await handleContact(formReq(body), env, fetchImpl);
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('/ru/#error');
  });
  it('silently drops spam without calling Resend', async () => {
    const { fetchImpl, calls } = stubFetch({ [RESEND]: ok });
    const res = await handleContact(formReq({ ...body, lang: 'en', website: 'http://spam' }), env, fetchImpl);
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('/en/#sent');
    expect(calls).toHaveLength(0);
  });
  it('returns 400 with the field name for invalid JSON input', async () => {
    const { fetchImpl, calls } = stubFetch({ [RESEND]: ok });
    const res = await handleContact(jsonReq({ ...body, email: 'nope' }), env, fetchImpl);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: 'email' });
    expect(calls).toHaveLength(0);
  });
  it('skips Turnstile when no secret is configured', async () => {
    const { fetchImpl, calls } = stubFetch({ [RESEND]: ok });
    await handleContact(jsonReq({ ...body, 'cf-turnstile-response': 'tok' }), env, fetchImpl);
    expect(calls.map((c) => c.url)).toEqual([RESEND]);
  });
  it('rejects when Turnstile verification fails', async () => {
    const { fetchImpl, calls } = stubFetch({
      [RESEND]: ok,
      [TURNSTILE]: () => new Response(JSON.stringify({ success: false }), { status: 200 }),
    });
    const res = await handleContact(jsonReq({ ...body, 'cf-turnstile-response': 'tok' }), { ...env, TURNSTILE_SECRET: 's' }, fetchImpl);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: 'turnstile' });
    expect(calls.map((c) => c.url)).toEqual([TURNSTILE]);
  });
  it('uses the default sender when RESEND_FROM is unset', async () => {
    const { fetchImpl, calls } = stubFetch({ [RESEND]: ok });
    await handleContact(jsonReq(body), env, fetchImpl);
    expect(JSON.parse(String(calls[0].init.body)).from).toBe('AI Code Studio <onboarding@resend.dev>');
  });
  it('returns 500 delivery error when no API key is configured', async () => {
    const { fetchImpl, calls } = stubFetch({ [RESEND]: ok });
    const res = await handleContact(jsonReq(body), {}, fetchImpl);
    expect(res.status).toBe(502);
    expect(calls).toHaveLength(0);
  });
});

describe('handleContact network failures', () => {
  it('treats a Turnstile network error as a failed check, not a crash', async () => {
    const fetchImpl = (async (input: RequestInfo | URL) => {
      if (String(input).startsWith(TURNSTILE)) throw new Error('network down');
      return ok();
    }) as typeof fetch;
    const res = await handleContact(formReq(body), { ...env, TURNSTILE_SECRET: 's' }, fetchImpl);
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('/ru/#error');
  });
});
