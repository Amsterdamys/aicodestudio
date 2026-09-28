# CLAUDE.md — AI Code Studio website

Working notes for anyone (human or Claude) touching this repo. Read this before changing anything.
Spec: `docs/superpowers/specs/2026-09-26-aicodestudio-site-design.md`. Plan: `docs/superpowers/plans/2026-09-26-aicodestudio-site.md`.

## What this is

Public site of **AI Code Studio**, a one-person software and AI studio (owner: Eugene).
Live at **https://aicodestudio.dev** (also `aicodestudio.pages.dev`). Five languages, one page,
a contact form, nothing else. Built 2026-09-26/27 from two Claude Design exports (v2, then v3; the
sources live in `docs/design/`).

## Architecture in one paragraph

Astro builds five static pages (`/en/ /ru/ /es/ /de/ /fr/`) from shared components and JSON
dictionaries. Two Cloudflare Pages Functions run at the edge: `functions/index.ts` redirects `/` to
a locale, `functions/api/contact.ts` handles the form. Pure logic sits in `src/server/` and is
unit-tested with Vitest. GitHub Actions deploys every push to `main` with wrangler. Email out goes
through Resend; email in is forwarded by Cloudflare Email Routing to the owner's Gmail.

```
Browser ── GET /            → Cloudflare Pages Function → 302 /{locale}/
        ── GET /{locale}/   → static HTML from dist/
        ── POST /api/contact→ Function: validate → Turnstile verify → Resend API → hello@aicodestudio.dev
                                                                                  → Cloudflare Email Routing → Gmail
```

## Where things live

| Path | Purpose |
|---|---|
| `src/site.config.ts` | Brand, `email`, `supportEmail`, link visibility flags, `showShipped`. **The place to unhide blocks.** |
| `src/i18n/{en,ru,es,de,fr}.json` | All copy. Identical key shape enforced by `tests/i18n-keys.test.ts`. |
| `src/components/*.astro` | One component per screen; `Screen.astro` is the shared shell; `ServiceIcon.astro` holds the six SVG illustrations. |
| `src/styles/global.css` | Ported from the v3 design. Extend at the bottom, do not restyle the top. |
| `src/layouts/Base.astro` | `<head>`: title, description, canonical, hreflang, OG, fonts, noscript reveal. |
| `src/server/locale.ts` | `pickLocale`: cookie → CF-IPCountry → Accept-Language → en. |
| `src/server/validate.ts` | Form validation, honeypot (`website` field), name CR/LF stripping. |
| `src/server/contact.ts` | `handleContact`: JSON or form body, Turnstile, Resend, 303 / JSON responses. |
| `functions/` | Thin Pages Function wrappers. Anything testable goes in `src/server/`. |
| `scripts/og.mjs` | Regenerates `public/og.png` (`npm run og`). |
| `.env` | Only the **public** Turnstile site key. Safe to commit. |
| `.github/workflows/deploy.yml` | test → build → `wrangler pages deploy`. |

## Commands

```bash
npm install
npm run dev          # http://localhost:4321/en/  (no functions, no redirect)
npm test             # 44 tests: i18n parity, locale detection, validation, handler
npm run build        # dist/
npm run pages:dev    # dist/ + functions/ under wrangler at http://127.0.0.1:8788/
npm run og           # regenerate the Open Graph image after a palette change
npx wrangler pages deploy dist --project-name=aicodestudio --branch=main   # manual deploy
```

## Rules

1. **Copy lives in the dictionaries, never in components.** Change `en.json`, then mirror the key in
   the other four files. The test fails otherwise. Keep formal address (вы / usted / Sie / vous).
2. **Facts on the site are the owner's, not the design's.** Later design exports still carry
   placeholders ("AI Studio", "Small team", Swift/Kotlin, `hello@aistudio.example`). Apply layout and
   styling from a design; keep brand, stack lines, voice, addresses and the form from the config.
3. **Hidden ≠ deleted.** "Recently shipped", Telegram, GitHub, Booking are flags in `site.config.ts`.
   A `null` link or `showShipped: false` means the markup is not rendered at all.
4. **No secrets in git.** Secrets are Cloudflare Pages secrets (`wrangler pages secret put`) or
   GitHub Actions secrets. `.dev.vars` is git-ignored. The only committed key is the public
   Turnstile site key in `.env`.
5. **Test-first for `src/server/`.** Every behaviour of the two functions has a Vitest case with a
   stubbed `fetch`. Add the failing test before the fix.
6. **Design changes are CSS-first.** Both design ports were done by replacing `global.css` and
   adjusting markup to match; component logic stayed. Verify in Chrome at desktop and 390 px.
7. **Deploy through `main`.** Push and let Actions deploy. Manual `wrangler pages deploy` is fine for
   a quick check but the next push overwrites it.
8. **Redeploy after changing a Pages secret.** New secret values apply to the next deployment only.

## Environment variables (Cloudflare Pages, production)

| Name | Value / purpose |
|---|---|
| `RESEND_API_KEY` | Resend key (`re_…`, 36 chars). Secret. |
| `RESEND_FROM` | `AI Code Studio <hello@aicodestudio.dev>` (domain verified in Resend, EU region). |
| `CONTACT_TO` | `hello@aicodestudio.dev` (forwarded to Gmail by Email Routing). |
| `TURNSTILE_SECRET` | Turnstile widget secret. Unset = honeypot only. |
| `PUBLIC_TURNSTILE_SITE_KEY` | Build-time, from `.env`. Must exist whenever `TURNSTILE_SECRET` does, or every submission is rejected. |

GitHub Actions secrets: `CLOUDFLARE_API_TOKEN` (custom token, Account → Cloudflare Pages → Edit),
`CLOUDFLARE_ACCOUNT_ID`.

## Accounts and services

| Service | What it does here | Notes |
|---|---|---|
| Cloudflare (account of eugenesuvorov90@gmail.com) | Registrar, DNS, Pages hosting, Functions, Turnstile, Email Routing | Free plan. `wrangler login` on the owner's Mac; that OAuth token can deploy Pages and create Turnstile widgets but **cannot** edit DNS or Email Routing (dashboard only). |
| GitHub `Amsterdamys/aicodestudio` | Source of truth, CI deploy | Account is **Amsterdamys** (not "Amsterdamos"). `gh` needs the `workflow` scope to push workflow files. |
| Resend | Outbound email (form + Gmail "Send mail as") | Account registered with eugenesuvorov90@gmail.com. Domain `aicodestudio.dev` verified via Auto configure. "Enable Receiving" must stay **off** (it would replace the Email Routing MX records). |
| Gmail (personal) | Inbox for `hello@` and `support@` | "Send mail as" via `smtp.resend.com:465`, user `resend`, password = Resend API key. |

## Things learned the hard way (do not relearn)

- **Pasting secrets through the `!` prefix in Claude Code sends an empty value.** `gh secret set`
  and `wrangler pages secret put` need a real terminal, or a file piped in
  (`printf '%s' "$(cat ~/key.txt)" | npx wrangler pages secret put NAME --project-name=aicodestudio`).
- **Check the clipboard before pasting keys.** Cloudflare tokens (`cfut_…`, 53 chars) were pasted
  into the Resend slot three times. Resend keys are `re_…`, 36 chars. Never paste a secret as the
  *name* argument of `gh secret set`; that echoes it into the terminal.
- **Cloudflare's proxy replaces origin 502/503/504 responses with its own error page.** The
  contact function returns **500** for delivery failures so the JSON reaches the client.
- **The v3 design used the class `in` for both the layout container and the "revealed" state.**
  The reveal state is `on` in this repo. Do not reintroduce `.r.in`.
- **Elements already in the viewport are revealed immediately on load** (`Reveal.astro`);
  IntersectionObserver alone does not fire in hidden/background tabs, which also makes browser
  automation screenshots look empty. In automated checks, scroll one tick first.
- **A repository variable that is unset overrides `.env` with an empty string in CI.** The workflow
  no longer sets `PUBLIC_TURNSTILE_SITE_KEY`; `.env` is the single source.
- **Cloudflare Pages needs `functions/index.ts` for `/`** (static `index.html` must not exist).
  HEAD requests need `onRequestHead`; uptime monitors use HEAD.
- **`?lang=xx` on `/` sets the cookie and redirects**; the switcher is a `<select>` that works
  without JS through a `<form>` with a `<noscript>` submit button.
- **Bricolage Grotesque has no Cyrillic.** Manrope is the fallback in the font stack; IBM Plex Mono
  loads the Cyrillic subset. Do not remove Manrope.
- **Resend's test sender (`onboarding@resend.dev`) only delivers to the Resend account's own
  address.** That is why the domain had to be verified before any other recipient worked.
- **Turnstile errors on `localhost` (code 110200)** because the widget is scoped to
  `aicodestudio.dev` and `aicodestudio.pages.dev`. Not a bug.
- **Contrast:** the design's orange on cream is 3.5:1 for small text. Lighthouse accessibility
  sits at ~93. Changing `--v` to a darker orange fixes it if ever wanted.
- Live Lighthouse (local build, 2026-09-27): performance 91, accessibility 93, best practices 96,
  SEO 100. The dips are font swap timing, the contrast above, and the localhost Turnstile error.

## Verifying a deploy

```bash
curl -sI -H 'Accept-Language: ru' https://aicodestudio.dev/ | grep -i location   # → /ru/
curl -s https://aicodestudio.dev/en/ | grep -c cf-turnstile                         # → 1
curl -s -X POST https://aicodestudio.dev/api/contact -H 'Content-Type: application/json' \
  -d '{"name":"T","email":"t@example.com","message":"Hello there test","lang":"en","cf-turnstile-response":"x"}'
# → {"ok":false,"error":"turnstile"}  (proves the function and secret are live)
```
For a real end-to-end test, submit the form in a browser and watch
`npx wrangler pages deployment tail <deployment-id> --project-name=aicodestudio --environment=production`.

## Roadmap

**Next: search engine indexing (SEO ops).** The on-page part is done: per-locale titles and
descriptions, canonical + hreflang, `sitemap-index.xml`, `robots.txt`, OG image, 404 noindex.
What remains is registration and monitoring:
1. **Google Search Console**: add property `aicodestudio.dev` (Domain type), verify by DNS TXT
   record in Cloudflare, submit `https://aicodestudio.dev/sitemap-index.xml`, check International
   Targeting shows the five hreflang variants, request indexing of `/en/` and `/ru/`.
2. **Yandex Webmaster** (matters for the Russian audience): add site, verify by DNS TXT or meta
   tag (the meta tag would go in `Base.astro`), submit the sitemap, set the region if asked.
3. **Bing Webmaster Tools**: import from Google Search Console in one click.
4. **Structured data**: add `Organization` + `ProfessionalService` JSON-LD in `Base.astro`
   (name, url, email, sameAs once GitHub/LinkedIn links exist, areaServed worldwide).
5. **Analytics without cookies**: Cloudflare Web Analytics (free, no banner needed) or Plausible.
6. Re-run Lighthouse after any of the above and keep SEO at 100.

**Content, when the owner has it:** Cal.com booking link, Telegram handle, GitHub link, and the
"Recently shipped" cards (three real projects with a one-line outcome each). Each is a config flag
plus dictionary entries.

**Deferred minor review findings:** `og:locale` should be `en_US`-style; `lang` cookie could add
`HttpOnly`; uppercase `?lang=RU` is ignored; no body-size guard on `/api/contact`; `package.json`
still has npm-init leftovers.
