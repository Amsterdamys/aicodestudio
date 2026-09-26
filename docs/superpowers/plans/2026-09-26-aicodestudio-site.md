# AI Code Studio Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the nine-screen AI Code Studio marketing site in five languages with a working contact form, on GitHub and Cloudflare Pages.

**Architecture:** Astro builds one static page per locale from shared components and JSON translations. Two Cloudflare Pages Functions in `functions/` (locale redirect on `/`, contact form on `/api/contact`) wrap pure, unit-tested modules in `src/server/`. Config flags in `src/site.config.ts` hide unfinished blocks. GitHub Actions deploys to Cloudflare Pages with wrangler on every push to `main`.

**Tech Stack:** Node (Homebrew), Astro (static output) + `@astrojs/sitemap`, TypeScript, Vitest, Cloudflare Pages Functions + wrangler, Resend API, Cloudflare Turnstile, `@resvg/resvg-js` (OG image), GitHub CLI.

**Spec:** `docs/superpowers/specs/2026-09-26-aicodestudio-site-design.md`

## Global Constraints

- Brand name everywhere: `AI Code Studio`; canonical origin `https://aicodestudio.dev`; contact email `aicodestudio@gmail.com`.
- Locales exactly `en ru es de fr`, default `en`; routes `/{locale}/`; `/` redirects.
- Visual design is the source HTML (`docs/design/AI Studio v2 (standalone).html`): same palette, fonts, screen order, scroll-snap, reveal animation, nav colour switch. Do not restyle.
- Fonts from Google Fonts: Bricolage Grotesque 300/400/500/700, Manrope 300/400/500/700 (Cyrillic fallback), IBM Plex Mono 400/500 with `cyrillic` subset, `display=swap`.
- Hidden by default: Shipped screen, Telegram, GitHub, Booking links. Hidden means not rendered in HTML.
- Secrets only in Cloudflare env / GitHub secrets / git-ignored `.dev.vars`. Never in the repo.
- Commit after every task with the attribution trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- `prefers-reduced-motion: reduce` disables reveal transforms and cursor blink.

## Review Focus

1. `Accept-Language: ru-RU,ru;q=0.9,en;q=0.8` with no country header must pick `ru` (region subtags stripped, q-order respected). Test in Task 5.
2. A `lang` cookie or `?lang=` value outside the five locales must be ignored, not crash or redirect to a 404. Test in Task 5.
3. A form post where `TURNSTILE_SECRET` is unset must still be delivered (honeypot only), and one with a filled honeypot must be rejected with the same success-looking redirect so bots learn nothing. Test in Task 6.
4. A Resend API failure (non-2xx) must produce a 502 JSON / `#error` redirect, never a false success. Test in Task 6.
5. Name or message containing CR/LF or only whitespace: name newlines stripped, whitespace-only message rejected. Test in Task 6.

---

### Task 1: Toolchain and Astro scaffold

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `.nvmrc`, `vitest.config.ts`, `src/pages/[locale]/index.astro` (placeholder), `src/env.d.ts`
- Modify: none

**Interfaces:**
- Produces: `npm run dev|build|preview|test`; Astro config with `site: 'https://aicodestudio.dev'`, `output: 'static'`, `i18n: { defaultLocale: 'en', locales: ['en','ru','es','de','fr'], routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false } }`, `integrations: [sitemap({ i18n: { defaultLocale: 'en', locales: { en:'en', ru:'ru', es:'es', de:'de', fr:'fr' } } })]`.

- [ ] **Step 1: Install Node** — `brew install node`; verify `node -v` prints v22 or newer. Write the major version to `.nvmrc`.
- [ ] **Step 2: Init package** — `npm init -y`, then `npm i astro @astrojs/sitemap` and `npm i -D typescript vitest wrangler @cloudflare/workers-types`. Set `"type": "module"`, scripts `dev: astro dev`, `build: astro build`, `preview: astro preview`, `test: vitest run`, `pages:dev: wrangler pages dev dist --compatibility-date=2026-09-01`.
- [ ] **Step 3: Write `astro.config.mjs`** with the values in Interfaces. `tsconfig.json` extends `astro/tsconfigs/strict`, adds `"types": ["@cloudflare/workers-types"]`. `vitest.config.ts`: `test: { include: ['tests/**/*.test.ts'] }`. `.gitignore`: `node_modules dist .astro .dev.vars .wrangler`.
- [ ] **Step 4: Placeholder page** `src/pages/[locale]/index.astro` with `getStaticPaths` returning the five locales and body `<h1>{Astro.params.locale}</h1>`.
- [ ] **Step 5: Verify** — `npm run build` succeeds and `ls dist` shows `en ru es de fr sitemap-index.xml`.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "chore: scaffold Astro project"`.

### Task 2: Site config and i18n dictionaries (English master)

**Files:**
- Create: `src/site.config.ts`, `src/i18n/en.json`, `src/i18n/index.ts`
- Test: `tests/i18n-keys.test.ts`

**Interfaces:**
- Produces: `site` object exactly as spec §6 (`links` all `null`, `showShipped: false`). `export const locales = ['en','ru','es','de','fr'] as const; export type Locale = (typeof locales)[number]; export type Dict = typeof en; export function t(locale: Locale): Dict; export function isLocale(x: unknown): x is Locale`.
- `en.json` keys (flat, dotted): `meta.title`, `meta.description`, `nav.services|stack|process|why|faq|contact`, `hero.label|headline|headlineBold|footerLeft|footerRight`, `services.label|items` (array of `{ bold, rest }`, 7 items) `services.footer`, `stack.label|cmdStack|cmdIntegrations|rows` (array of `{ key, value }`, 10 rows in spec order) `stack.footer`, `rule.label|headline|headlineBold|headlineTail|footer`, `process.label|headline|headlineBold|steps` (5 × `{ meta, title, text }`) `process.footer`, `why.label|headlineBold|headline|items` (4 × `{ title, text }`) `why.footer`, `shipped.label|headline|headlineBold|cards` (3 × `{ meta, title }`) `shipped.footer`, `faq.label|items` (5 × `{ q, a }`) `faq.footer`, `contact.label|name|email|message|send|sending|sent|error|telegram|github|booking|footerLeft|footerRight`, `lang.switch`. Values: the English copy from spec §5 verbatim.

- [ ] **Step 1: Write failing test** `tests/i18n-keys.test.ts`: for every locale in `locales`, `t(locale)` deep-key set equals the `en` deep-key set; arrays must have equal length. Also `isLocale('ru') === true`, `isLocale('pt') === false`.
- [ ] **Step 2: Run** `npm test` — FAIL (module missing).
- [ ] **Step 3: Implement** `src/site.config.ts`, `src/i18n/en.json`, `src/i18n/index.ts` (static `import` of all five JSON files; for now `ru es de fr` may re-export `en.json` content copied verbatim so the test passes; Task 8 replaces them).
- [ ] **Step 4: Run** `npm test` — PASS.
- [ ] **Step 5: Commit** `feat: site config and English dictionary`.

### Task 3: Base layout, global styles, nav

**Files:**
- Create: `src/styles/global.css`, `src/layouts/Base.astro`, `src/components/Nav.astro`, `src/components/Screen.astro`, `src/components/Reveal.astro` (client script only), `public/favicon.svg`
- Modify: `src/pages/[locale]/index.astro`

**Interfaces:**
- `Base.astro` props: `{ locale: Locale; dict: Dict }`. Emits `<html lang>`, meta title/description, canonical `${site.domain}/${locale}/`, `<link rel="alternate" hreflang>` for all five + `x-default` → `/en/`, OG tags (`og:image` = `${site.domain}/og.png`), Google Fonts preconnect + stylesheet, `global.css`, `<Nav>`, `<slot/>`, reveal script.
- `Screen.astro` props: `{ id?: string; tone?: 'paper'|'violet'|'lilac'|'ink'; label: string; number: string }` with slots `default` and `footer` (footer slot receives two spans).
- `Nav.astro` props `{ locale, dict }`: brand link `#top`, anchor links from `dict.nav.*`, language switcher: five links `/?lang={l}#top` (current locale `<b>`, others `<a>`), separated by `/`.

- [ ] **Step 1: Port CSS** from the source `<style>` block into `global.css` unchanged except: `--sans:'Bricolage Grotesque','Manrope',system-ui,sans-serif`; add `@media (prefers-reduced-motion: reduce){ .r{opacity:1;transform:none;transition:none} .cur{animation:none} }`; nav `.lang` rules extended for five items.
- [ ] **Step 2: Write** `Base.astro`, `Nav.astro`, `Screen.astro`, `Reveal.astro` (the two IntersectionObservers from the source, verbatim). `favicon.svg`: teal `#3a9a94` square, white bold "AI" as in the bundle's thumbnail.
- [ ] **Step 3: Wire** `index.astro`: `const locale = Astro.params.locale as Locale; const dict = t(locale);` render `<Base>` with one `<Screen>` hero placeholder.
- [ ] **Step 4: Verify** `npm run build`; `grep -c 'hreflang' dist/ru/index.html` prints `6`; `grep '<html lang="ru"' dist/ru/index.html` matches.
- [ ] **Step 5: Commit** `feat: base layout, nav, global styles`.

### Task 4: The nine screens

**Files:**
- Create: `src/components/{Hero,Services,Stack,Rule,Process,Why,Shipped,Faq,Contact}.astro`
- Modify: `src/pages/[locale]/index.astro`

**Interfaces:**
- Every screen component takes `{ dict: Dict }` (Contact also `{ locale: Locale }`) and renders the markup of the corresponding `<section>` in the source HTML with text from `dict`. Screen numbers `01`–`09` are fixed; when `site.showShipped` is false, Shipped is not rendered and FAQ/Contact keep numbers `08`/`09` (numbering follows the design, not the count).
- `Contact.astro` renders: CTA `<a class="cta" href="mailto:{site.email}">` showing the email split at `@` like the design (`aicodestudio@<br>gmail.com`), the `<ContactForm>` (Task 6 supplies it; until then render nothing), links row with only entries whose `site.links.*` is a string.

- [ ] **Step 1: Write the nine components** following the source markup one-to-one. Services rows: `<i>{n}</i><span><b>{bold}</b> {rest}</span>`. Stack: `.cmd` lines use `dict.stack.cmdStack` / `cmdIntegrations`; rows split into two groups: first 6 rows after the first cmd, last 4 after the second.
- [ ] **Step 2: Assemble** `index.astro`: Hero, Services, Stack, Rule, Process, Why, `{site.showShipped && <Shipped/>}`, Faq, Contact.
- [ ] **Step 3: Verify** `npm run build`; `grep -c '<section' dist/en/index.html` prints `8`; `grep -c 'Coming soon' dist/en/index.html` prints `0`; `grep -c 'Mobile apps' dist/en/index.html` prints `1`.
- [ ] **Step 4: Browser check** — `npm run dev`, open `http://localhost:4321/en/` in Chrome, screenshot each screen at 1440px and 390px; compare against the source file opened side by side. Fix layout diffs.
- [ ] **Step 5: Commit** `feat: nine screens with English content`.

### Task 5: Locale detection and root redirect function

**Files:**
- Create: `src/server/locale.ts`, `functions/index.ts`
- Test: `tests/locale.test.ts`

**Interfaces:**
- `export function parseCookie(header: string | null, name: string): string | null`
- `export function pickLocale(input: { cookie?: string | null; country?: string | null; acceptLanguage?: string | null }): Locale` — order: cookie → country map (spec §4, exact lists) → Accept-Language (strip region, respect q, first supported) → `'en'`.
- `functions/index.ts`: `export const onRequestGet: PagesFunction = async ({ request }) => Response`. If `?lang=` is a valid locale: 302 to `/${lang}/` with `Set-Cookie: lang=${lang}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`. Else 302 to `/${pickLocale({cookie: parseCookie(cookieHeader,'lang'), country: request.headers.get('CF-IPCountry'), acceptLanguage: request.headers.get('Accept-Language')})}/`. Also add `Vary: Cookie, Accept-Language` and `Cache-Control: private, no-store`.

- [ ] **Step 1: Failing tests** in `tests/locale.test.ts`:
  - `pickLocale({cookie:'de', country:'RU'})` → `'de'`
  - `pickLocale({country:'KZ'})` → `'ru'`; `{country:'MX'}` → `'es'`; `{country:'CH'}` → `'de'`; `{country:'BE'}` → `'fr'`; `{country:'US'}` → `'en'`
  - `pickLocale({acceptLanguage:'ru-RU,ru;q=0.9,en;q=0.8'})` → `'ru'`
  - `pickLocale({acceptLanguage:'pt-BR,pt;q=0.9,es;q=0.5'})` → `'es'`
  - `pickLocale({cookie:'xx', country:'ZZ', acceptLanguage:'tlh'})` → `'en'`
  - `parseCookie('a=1; lang=fr; b=2','lang')` → `'fr'`; `parseCookie(null,'lang')` → `null`
  - `functions/index.ts`: `onRequestGet` with `?lang=ru` → status 302, `Location: /ru/`, `Set-Cookie` contains `lang=ru`; with `?lang=xx` and `CF-IPCountry: FR` → `Location: /fr/`, no `Set-Cookie`.
- [ ] **Step 2: Run** `npm test` — FAIL.
- [ ] **Step 3: Implement** both files. Country → locale map is a `Record<string, Locale>` constant `COUNTRY_LOCALE` exported for the test.
- [ ] **Step 4: Run** `npm test` — PASS. Then `npm run build && npm run pages:dev`, `curl -sI -H 'CF-IPCountry: DE' localhost:8788/` shows `location: /de/`.
- [ ] **Step 5: Commit** `feat: locale detection and root redirect`.

### Task 6: Contact form, validation, and email function

**Files:**
- Create: `src/server/validate.ts`, `src/server/contact.ts`, `functions/api/contact.ts`, `src/components/ContactForm.astro`, `.dev.vars.example`
- Modify: `src/components/Contact.astro`, `src/styles/global.css` (form styles)
- Test: `tests/validate.test.ts`, `tests/contact.test.ts`

**Interfaces:**
- `export type Contact = { name: string; email: string; message: string; lang: Locale }`
- `export type ValidationResult = { ok: true; data: Contact } | { ok: false; error: 'name' | 'email' | 'message' | 'spam' }`
- `export function validateContact(input: Record<string, unknown>): ValidationResult` — trims; strips `\r\n` from name; name 1–100, email matches `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` and ≤ 254, message 10–5000 after trim, `website` must be empty else `'spam'`, `lang` falls back to `'en'` if invalid.
- `export type Env = { RESEND_API_KEY?: string; RESEND_FROM?: string; CONTACT_TO?: string; TURNSTILE_SECRET?: string }`
- `export async function handleContact(request: Request, env: Env, fetchImpl: typeof fetch = fetch): Promise<Response>` — accepts `application/x-www-form-urlencoded` or JSON. Turnstile verified only if `env.TURNSTILE_SECRET` set (POST `https://challenges.cloudflare.com/turnstile/v0/siteverify`). Sends via `POST https://api.resend.com/emails` with `{ from: env.RESEND_FROM ?? 'AI Code Studio <onboarding@resend.dev>', to: [env.CONTACT_TO ?? 'aicodestudio@gmail.com'], reply_to: email, subject: \`New enquiry from ${name}\`, text }`. Responses: form-encoded → 303 to `/${lang}/#sent` on success, `/${lang}/#error` on any failure, and `/${lang}/#sent` on `'spam'` (silent drop); JSON → `{ ok: true }` 200, `{ ok: false, error }` 400, `{ ok:false, error:'delivery' }` 502.
- `functions/api/contact.ts`: `export const onRequestPost: PagesFunction<Env> = ({ request, env }) => handleContact(request, env)`.
- `ContactForm.astro` props `{ locale, dict }`: `<form method="post" action="/api/contact">` with `name`, `email`, `message`, hidden `lang`, honeypot `website` (visually hidden, `tabindex=-1`, `autocomplete=off`), Turnstile `<div class="cf-turnstile" data-sitekey>` only when `import.meta.env.PUBLIC_TURNSTILE_SITE_KEY` is set (plus its script tag), submit button. Status elements `<p id="sent">` and `<p id="error">` hidden unless `:target` or `[data-show]`. Inline `<script>` progressively enhances: `fetch` with `Accept: application/json`, toggles `data-show`, disables button with `dict.contact.sending`.

- [ ] **Step 1: Failing tests** `tests/validate.test.ts`: valid input → `ok:true` with trimmed fields; `name: 'A\r\nBcc: x'` → data.name `'ABcc: x'`; message `'   '` → `error:'message'`; `email:'nope'` → `'email'`; `website:'http://spam'` → `'spam'`; `lang:'xx'` → `'en'`. `tests/contact.test.ts` with a stub `fetchImpl` recording calls: JSON success → 200 and Resend called with `reply_to` = visitor; Resend returns 500 → 502 `{error:'delivery'}`; form-encoded success → 303 `Location: /ru/#sent`; form-encoded spam → 303 `/en/#sent` and Resend **not** called; `TURNSTILE_SECRET` unset → Turnstile endpoint not called; set + verify returns `{success:false}` → 400 `{error:'turnstile'}`.
- [ ] **Step 2: Run** `npm test` — FAIL.
- [ ] **Step 3: Implement** `validate.ts`, `contact.ts`, `functions/api/contact.ts`.
- [ ] **Step 4: Run** `npm test` — PASS.
- [ ] **Step 5: Build the form UI** `ContactForm.astro`, mount in `Contact.astro` to the right of the CTA (two-column grid ≥ 900px, stacked below). Styles: inputs transparent with `1px solid rgba(255,255,255,.5)` bottom border, mono font, white text on the teal screen; button = white pill. Add `.dev.vars.example` with the four env names and empty values.
- [ ] **Step 6: Verify end to end locally** — `npm run build && npm run pages:dev` with a `.dev.vars` containing a real `RESEND_API_KEY` if available, otherwise stub: `curl -X POST localhost:8788/api/contact -d 'name=Test&email=t@example.com&message=Hello there from curl&lang=en'` returns 303 with `location: /en/#sent` (or `#error` without a key, which is the expected failure path). In Chrome, submit the form on `/en/` and see the localized status line.
- [ ] **Step 7: Commit** `feat: contact form with Resend delivery and Turnstile`.

### Task 7: SEO assets, 404, OG image

**Files:**
- Create: `public/robots.txt`, `scripts/og.mjs`, `public/og.png` (generated), `src/pages/404.astro`
- Modify: `package.json` (script `og: node scripts/og.mjs`, dev dep `@resvg/resvg-js`)

**Interfaces:**
- `robots.txt`: `User-agent: *\nAllow: /\nSitemap: https://aicodestudio.dev/sitemap-index.xml`.
- `scripts/og.mjs` renders a 1200×630 SVG (teal background, giant "AI", line "AI Code Studio — Software with intelligence built in", mono footer `aicodestudio.dev`) to `public/og.png`.
- `404.astro`: English, uses `Base` with `locale='en'`, headline "Nothing here." and a link to `/en/`.

- [ ] **Step 1: Write** the three files; run `npm run og`, confirm `public/og.png` exists and is 1200×630 (`file public/og.png`).
- [ ] **Step 2: Verify** `npm run build`; `dist/404.html`, `dist/robots.txt`, `dist/og.png`, `dist/sitemap-0.xml` exist; sitemap lists five URLs with `xhtml:link` alternates.
- [ ] **Step 3: Commit** `feat: robots, sitemap, OG image, 404`.

### Task 8: Translations RU, ES, DE, FR

**Files:**
- Create/replace: `src/i18n/ru.json`, `src/i18n/es.json`, `src/i18n/de.json`, `src/i18n/fr.json`

**Interfaces:** same key set as `en.json` (enforced by `tests/i18n-keys.test.ts`).

- [ ] **Step 1: Write RU** — natural, professional Russian, "мы" voice, formal "вы"; product names stay Latin; terminal `cmd` lines unchanged; `meta.title` ≤ 60 chars, `meta.description` ≤ 155 chars.
- [ ] **Step 2: Write ES, DE, FR** with the same rules (formal address: `usted`, `Sie`, `vous`).
- [ ] **Step 3: Run** `npm test` — PASS (key parity). `npm run build`; open `/ru/ /es/ /de/ /fr/` in Chrome; check no headline overflows at 390px (German compounds are the risk; shorten wording, never the CSS).
- [ ] **Step 4: Commit** `feat: Russian, Spanish, German, French translations`.

### Task 9: README, CI deploy workflow, GitHub push

**Files:**
- Create: `README.md`, `.github/workflows/deploy.yml`, `wrangler.toml`

**Interfaces:**
- `wrangler.toml`: `name = "aicodestudio"`, `pages_build_output_dir = "dist"`, `compatibility_date = "2026-09-01"`.
- `deploy.yml`: on `push` to `main` and `workflow_dispatch`; steps: checkout, setup-node from `.nvmrc`, `npm ci`, `npm test`, `npm run build`, `cloudflare/wrangler-action@v3` with `command: pages deploy dist --project-name=aicodestudio`, secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; env `PUBLIC_TURNSTILE_SITE_KEY` from a GitHub variable (may be empty).
- `README.md`: what the site is, local dev commands, how to flip flags in `site.config.ts`, how to edit translations, env variables table, deploy steps (spec §10).

- [ ] **Step 1: Write** the three files.
- [ ] **Step 2: Create repo and push** — `gh repo create Amsterdamys/aicodestudio --public --source=. --remote=origin --push`. Verify `gh repo view --web` URL prints and `git status` clean.
- [ ] **Step 3: Commit** any leftovers, push.

### Task 10: Cloudflare deployment (owner-assisted)

**Files:** none new.

- [ ] **Step 1: Owner logs in** — `! npx wrangler login` in this session (opens browser). Then `npx wrangler whoami` shows the account id.
- [ ] **Step 2: Create the Pages project** — `npx wrangler pages project create aicodestudio --production-branch=main`; first deploy `npx wrangler pages deploy dist --project-name=aicodestudio`; confirm `https://aicodestudio.pages.dev/` redirects to `/en/`.
- [ ] **Step 3: Secrets** — owner creates a Resend API key (account registered with `aicodestudio@gmail.com`) and, optionally, a Turnstile widget for `aicodestudio.dev` + `aicodestudio.pages.dev`. Set with `npx wrangler pages secret put RESEND_API_KEY --project-name=aicodestudio` (same for `TURNSTILE_SECRET`). Owner creates a Cloudflare API token (template "Cloudflare Pages: Edit") and runs `gh secret set CLOUDFLARE_API_TOKEN` and `gh secret set CLOUDFLARE_ACCOUNT_ID`; set `gh variable set PUBLIC_TURNSTILE_SITE_KEY` if Turnstile is used.
- [ ] **Step 4: Domain** — owner buys `aicodestudio.dev` at Cloudflare Registrar; `npx wrangler pages domain add aicodestudio.dev --project-name=aicodestudio` (or dashboard). Wait for HTTPS. Owner verifies the domain in Resend and sets `RESEND_FROM="AI Code Studio <hello@aicodestudio.dev>"` as a Pages env var.
- [ ] **Step 5: Final verification** — trigger the GitHub Action (`gh workflow run deploy.yml`), confirm green; `curl -sI -H 'Accept-Language: ru' https://aicodestudio.dev/` → `location: /ru/`; submit a real form message from Chrome and confirm it lands in Gmail; run `npx lighthouse https://aicodestudio.dev/en/ --only-categories=performance,accessibility,seo --chrome-flags=--headless --quiet --output=json` and check scores ≥ 95/95/100.
