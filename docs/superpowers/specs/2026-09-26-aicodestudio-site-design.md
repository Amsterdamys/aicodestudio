# AI Code Studio — public website design

Date: 2026-09-26
Status: approved in conversation, ready for implementation plan

## 1. Goal

A credible, production-ready public website for a small software and AI
studio run by one senior engineer. The site must look and behave like a
real, working business site: true content, a working contact form that
lands in Gmail, five languages selected automatically per visitor, and
unfinished blocks hidden rather than faked. Code lives on GitHub, the site
runs on Cloudflare Pages under `aicodestudio.dev`.

Source design: `AI Studio v2 (standalone).html` (a bundled export). The
visual design is kept as is: nine full-viewport, scroll-snapped screens,
Bricolage Grotesque + IBM Plex Mono, the paper / teal / lilac / ink palette,
fade-up reveal on scroll, nav that turns white over dark screens.

## 2. Decisions taken

| Topic | Decision |
|---|---|
| Brand | **AI Code Studio** |
| Domain | `aicodestudio.dev` (verified free at registry RDAP and Porkbun on 2026-09-26, standard price, about $13/yr renewal). Bought by the owner at Cloudflare Registrar. |
| Voice | Studio voice ("we"), claims kept true: one senior engineer plus trusted specialists when needed, the person you talk to writes the code. |
| Languages | EN (default), RU, ES, DE, FR. |
| Hosting | Cloudflare Pages, Git-connected, auto-deploy on push to `main`. |
| Form delivery | Cloudflare Pages Function calling the Resend API, email to `aicodestudio@gmail.com`, Reply-To = visitor. Spam: honeypot + Cloudflare Turnstile. |
| Public email | `aicodestudio@gmail.com` (owner creates it). Optional later: `hello@aicodestudio.dev` forwarding via Cloudflare Email Routing. |
| GitHub | Public repo `Amsterdamys/aicodestudio` (the account the local `gh` CLI is logged into). |
| Hidden for now | "Recently shipped" screen, Telegram link, GitHub link, "Book a 30-min call" link (hidden until a Cal.com URL exists). All behind config flags. |
| Pricing in FAQ | No numbers: "fixed price per stage, quoted before we start". |
| Footer | "Remote · Worldwide". |
| Framework | Astro (static output) with `@astrojs/cloudflare` only for the two functions, or plain Pages Functions in `functions/`. Node installed via Homebrew (none on the machine today). |

## 3. Site structure

```
/                → edge function: pick locale, 302 to /{locale}/
/en/ /ru/ /es/ /de/ /fr/   → static pages, one per locale
/api/contact     → POST, Pages Function, sends email
/sitemap.xml /robots.txt /og.png /favicon.svg /404
```

Screens, in order, each `100vh` with scroll-snap:

1. Hero — giant "AI", tagline, teal background
2. Services — numbered list, seven rows (mobile added)
3. Stack — terminal-style list, lilac background
4. One rule — giant "ROI", ink background
5. Process — five steps, teal background
6. Why us — four points
7. Recently shipped — **hidden by flag** (kept in code)
8. FAQ — five `<details>` items, lilac background
9. Contact — email CTA + form, teal background

Nav: brand, anchor links (Services, Stack, Process, Why us, FAQ, Contact),
language switcher with all five codes; current one bold.

## 4. Localisation

* Translations: `src/i18n/{en,ru,es,de,fr}.json`, one flat key per string.
  A missing key in any locale fails the build (test).
* Each page sets `<html lang>`, `<title>`, meta description, canonical,
  `hreflang` alternates for all five locales plus `x-default` → `/en/`,
  Open Graph title/description/image.
* Locale detection (edge function on `/`, in this order):
  1. `lang` cookie if it names a supported locale
  2. `CF-IPCountry` header: RU, BY, KZ, KG → ru; ES, MX, AR, CO, CL, PE,
     VE, EC, GT, CU, BO, DO, HN, PY, SV, NI, CR, PA, UY → es; DE, AT, CH →
     de; FR, BE, LU, MC → fr
  3. `Accept-Language`: first supported language in q-order
  4. `en`
* The switcher links to the same anchor in the other locale and sets the
  `lang` cookie (1 year, `SameSite=Lax`, `Secure`) via a query param handled
  by the same edge function, so it works without JS.
* Fonts: Bricolage Grotesque (Latin, Latin-ext) for display and body;
  Manrope as the next family in the stack so Cyrillic glyphs render in a
  matching geometric face; IBM Plex Mono (with Cyrillic subset) for mono.
  Loaded from Google Fonts with `display=swap` and preconnect.
* `prefers-reduced-motion`: reveal animations and cursor blink disabled.

## 5. Content (English master)

**Hero.** Label: Software · AI · Automation. Headline: "Software for small
and medium businesses, with **intelligence built in**." Footer: AI Code
Studio / Scroll ↓.

**Services (7).** Websites and web applications · Mobile apps for iOS and
Android · AI inside your daily workflows · Desktop tools for teams ·
Integrations between your systems · Documents turned into data · Support
and technical advice. Footer: "Seven things, done properly".

**Stack.** `ai-code-studio --stack`
```
web      TypeScript · React · Next.js · Node.js
mobile   Flutter · React Native
backend  Python · Go · Node.js · TypeScript
ai       OpenAI · Anthropic · Llama · RAG pipelines
desktop  Tauri · Flutter · Electron
infra    Docker · Cloudflare · AWS
```
`ai-code-studio --integrations`
```
work     Google Workspace · Microsoft 365 · Notion · Slack · Telegram
crm      HubSpot · Bitrix24 · amoCRM · 1C
money    Stripe · YooKassa
docs     PDF · DOCX · XLSX · OCR
```
Footer: "Not on the list? Ask."

**One rule.** "AI where it pays off. **Not** where it is fashionable."

**Process.** "Five steps. **No surprises** in the invoice."
01 · 1 hour · Talk — Goals, constraints, a rough scope. Free.
02 · 3–5 days · Plan — Fixed stages, timeline and budget.
03 · weeks · Build — A demo every one to two weeks.
04 · 1–2 weeks · Launch — Deploy, document, train your team.
05 · ongoing · Grow — Support and new features, as needed.
Footer: "You talk to the engineer directly".

**Why us.** "**Small studio.** Senior only."
Senior only — No juniors, no hand-offs. The person you meet writes the code.
Fixed stages — Price and dates agreed per stage. Pay on delivery.
Modern stack — Tools that will still be maintained in five years.
Full cycle — Design, build, launch, support. One contract.
Footer: "NDA on request".

**FAQ.**
How much does a website cost? — Every stage has a fixed price, quoted before
we start. A landing page is one stage; a company site or web app is scoped
into several.
How soon can you start? — Usually within one to two weeks of agreeing the plan.
Can you add AI to the systems we already use? — In most cases, yes. We audit
what you have and propose options that fit your stack and budget.
What happens after launch? — The first month of support is included. After
that, a monthly plan or hourly.
Do you work under contract? — Yes. Fixed stages, payment on delivery, NDA on
request.

**Contact.** Label: Talk to us. CTA: `aicodestudio@gmail.com` as a large
underlined mailto. Form: Name, Email, Message, Send. Links row (flag-
controlled): Telegram, GitHub, Book a 30-min call. Footer: © 2026 AI Code
Studio / Remote · Worldwide.

The other four locales are full translations of the above, written during
implementation; EN and RU are reviewed by the owner.

## 6. Configuration

`src/site.config.ts`:

```ts
export const site = {
  name: 'AI Code Studio',
  domain: 'https://aicodestudio.dev',
  email: 'aicodestudio@gmail.com',
  links: { telegram: null, github: null, booking: null }, // null = hidden
  showShipped: false,
  locales: ['en','ru','es','de','fr'] as const,
  defaultLocale: 'en',
}
```

## 7. Contact form

* Client: progressive enhancement. Without JS the form is a plain `POST` to
  `/api/contact` and the function redirects back to `/{locale}/#contact?sent=1`.
  With JS, `fetch` + inline status in the page's language.
* Fields: `name` (1–100 chars), `email` (valid), `message` (10–5000 chars),
  `lang`, `website` (honeypot, must be empty), `cf-turnstile-response`.
* Function `functions/api/contact.ts`: parse form or JSON, validate, verify
  Turnstile with `TURNSTILE_SECRET`, call Resend
  (`RESEND_API_KEY`) with `from: AI Code Studio <hello@aicodestudio.dev>`
  (fallback `onboarding@resend.dev` until the domain is verified in Resend),
  `to: aicodestudio@gmail.com`, `reply_to: visitor`, subject
  `New enquiry from {name}`. Returns 200 JSON or 4xx/5xx JSON; never leaks
  secrets. Rate limit: rely on Turnstile plus Cloudflare's default.
* Secrets set in the Cloudflare Pages project, never committed. `.dev.vars`
  for local runs, git-ignored.

## 8. Repository layout

```
aicodestudio/
  astro.config.mjs  package.json  tsconfig.json  wrangler.toml
  public/            favicon.svg  og.png  robots.txt
  functions/         _middleware.ts (locale redirect on "/")  api/contact.ts
  src/
    site.config.ts
    i18n/            en.json ru.json es.json de.json fr.json  index.ts
    layouts/Base.astro
    components/      Nav.astro Screen.astro Hero.astro Services.astro Stack.astro
                     Rule.astro Process.astro Why.astro Shipped.astro Faq.astro
                     Contact.astro ContactForm.astro
    pages/[locale]/index.astro   404.astro
    styles/global.css
  tests/             locale.test.ts  validate.test.ts  i18n-keys.test.ts
  docs/superpowers/specs/…
```

## 9. Quality bar

* Build passes; all tests pass.
* Every locale checked in Chrome at 1440px and 390px width.
* Lighthouse: performance ≥ 95, accessibility ≥ 95, SEO 100 on `/en/`.
* No console errors, no mixed content, all links resolve.
* Form verified end-to-end once deployed: a test message arrives in Gmail.

## 10. Deployment steps (owner involvement marked ★)

1. Install Node via Homebrew, scaffold, build, test locally.
2. `git init`, first commit, `gh repo create Amsterdamys/aicodestudio --public`, push.
3. ★ Cloudflare account: connect Pages to the repo (build `npm run build`,
   output `dist`). Set `RESEND_API_KEY`, `TURNSTILE_SECRET`, and the public
   `PUBLIC_TURNSTILE_SITE_KEY`.
4. ★ Buy `aicodestudio.dev` at Cloudflare Registrar, attach as custom domain.
5. ★ Resend: create account with the Gmail, add the domain, add the DNS records
   Cloudflare shows, switch `from` to `hello@aicodestudio.dev`.
6. Send a real test enquiry, confirm receipt, done.

## 11. Out of scope

Blog, case studies content, analytics, cookie banner (no tracking cookies
are set; the `lang` cookie is functional), Telegram bot, CMS.
