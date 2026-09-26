import { validateContact, type Contact } from './validate';

export type Env = {
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  CONTACT_TO?: string;
  TURNSTILE_SECRET?: string;
};

const RESEND_URL = 'https://api.resend.com/emails';
const TURNSTILE_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const DEFAULT_FROM = 'AI Code Studio <onboarding@resend.dev>';
const DEFAULT_TO = 'aicodestudio@gmail.com';

type Outcome = { ok: true } | { ok: false; status: number; error: string };

async function readBody(request: Request): Promise<{ data: Record<string, unknown>; isForm: boolean }> {
  const type = request.headers.get('Content-Type') ?? '';
  if (type.includes('application/json')) {
    const json = (await request.json().catch(() => ({}))) as unknown;
    return { data: json && typeof json === 'object' ? (json as Record<string, unknown>) : {}, isForm: false };
  }
  const form = await request.formData().catch(() => new FormData());
  const data: Record<string, unknown> = {};
  form.forEach((v, k) => (data[k] = typeof v === 'string' ? v : ''));
  return { data, isForm: true };
}

async function verifyTurnstile(token: string, secret: string, ip: string | null, fetchImpl: typeof fetch): Promise<boolean> {
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);
  const res = await fetchImpl(TURNSTILE_URL, { method: 'POST', body });
  if (!res.ok) return false;
  const json = (await res.json().catch(() => ({}))) as { success?: boolean };
  return json.success === true;
}

async function send(contact: Contact, env: Env, fetchImpl: typeof fetch): Promise<boolean> {
  const apiKey = (env.RESEND_API_KEY ?? '').trim();
  if (!apiKey) return false;
  const text = `Name: ${contact.name}\nEmail: ${contact.email}\nLanguage: ${contact.lang}\n\n${contact.message}\n`;
  const res = await fetchImpl(RESEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.RESEND_FROM || DEFAULT_FROM,
      to: [env.CONTACT_TO || DEFAULT_TO],
      reply_to: contact.email,
      subject: `New enquiry from ${contact.name}`,
      text,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error(`resend ${res.status}: ${detail.slice(0, 300)}`);
  }
  return res.ok;
}

async function process(request: Request, data: Record<string, unknown>, env: Env, fetchImpl: typeof fetch): Promise<Outcome & { lang: string }> {
  const result = validateContact(data);
  const lang = typeof data.lang === 'string' && /^[a-z]{2}$/.test(data.lang) ? data.lang : 'en';
  if (!result.ok) {
    if (result.error === 'spam') return { ok: true, lang };
    return { ok: false, status: 400, error: result.error, lang };
  }
  const contact = result.data;
  if (env.TURNSTILE_SECRET) {
    const token = typeof data['cf-turnstile-response'] === 'string' ? data['cf-turnstile-response'] : '';
    const passed = await verifyTurnstile(token, env.TURNSTILE_SECRET, request.headers.get('CF-Connecting-IP'), fetchImpl).catch(() => false);
    if (!passed) return { ok: false, status: 400, error: 'turnstile', lang: contact.lang };
  }
  const delivered = await send(contact, env, fetchImpl).catch(() => false);
  if (!delivered) return { ok: false, status: 500, error: 'delivery', lang: contact.lang };
  return { ok: true, lang: contact.lang };
}

export async function handleContact(request: Request, env: Env, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const { data, isForm } = await readBody(request);
  const outcome = await process(request, data, env, fetchImpl);
  const lang = /^(en|ru|es|de|fr)$/.test(outcome.lang) ? outcome.lang : 'en';
  if (isForm) {
    return new Response(null, { status: 303, headers: { Location: `/${lang}/#${outcome.ok ? 'sent' : 'error'}` } });
  }
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  if (outcome.ok) return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  return new Response(JSON.stringify({ ok: false, error: outcome.error }), { status: outcome.status, headers });
}
