# AI Code Studio — website

Public site for [aicodestudio.dev](https://aicodestudio.dev): nine full-screen
sections, five languages, a contact form that lands in Gmail. Static Astro
build on Cloudflare Pages with two tiny edge functions.

## Local development

```bash
npm install
npm run dev          # http://localhost:4321/en/  (no edge functions)
npm test             # vitest: i18n parity, locale detection, form validation, handler
npm run build        # static output in dist/
npm run pages:dev    # dist/ + functions/ under wrangler at http://localhost:8788/
npm run og           # regenerate public/og.png
```

For `pages:dev`, copy `.dev.vars.example` to `.dev.vars` and fill in the
values you have. Without `RESEND_API_KEY` the form reports an error, which is
the expected local behaviour.

## Where things live

| Path | Purpose |
|---|---|
| `src/site.config.ts` | Brand, email, link visibility flags, `showShipped` |
| `src/i18n/*.json` | One dictionary per locale, identical key shape (enforced by a test) |
| `src/components/*.astro` | One component per screen |
| `src/pages/[locale]/index.astro` | Builds `/en/ /ru/ /es/ /de/ /fr/` |
| `functions/index.ts` | `/` → picks a locale (cookie → country → Accept-Language → en) and redirects |
| `functions/api/contact.ts` | `POST /api/contact` → validates, Turnstile, sends via Resend |
| `src/server/*.ts` | Pure logic behind the functions, unit-tested |

### Showing hidden blocks

Edit `src/site.config.ts`:

```ts
links: { telegram: 'https://t.me/yourhandle', github: 'https://github.com/you', booking: 'https://cal.com/you/30min' },
showShipped: true,
```

Any link set to `null` is not rendered. `showShipped: true` renders the
"Recently shipped" screen; fill its cards in the dictionaries first.

### Editing copy

Change the text in `src/i18n/en.json`, then mirror the change in the other
four files. `npm test` fails if a key is missing anywhere.

## Environment variables

| Name | Where | Purpose |
|---|---|---|
| `RESEND_API_KEY` | Cloudflare Pages secret | Sends the email |
| `RESEND_FROM` | Cloudflare Pages variable | Sender, e.g. `AI Code Studio <hello@aicodestudio.dev>` once the domain is verified in Resend. Default `onboarding@resend.dev` (delivers only to the Resend account owner's address). |
| `CONTACT_TO` | Cloudflare Pages variable | Recipient, default `aicodestudio@gmail.com` |
| `TURNSTILE_SECRET` | Cloudflare Pages secret | Enables Turnstile verification; unset = honeypot only |
| `PUBLIC_TURNSTILE_SITE_KEY` | Build-time (GitHub Actions variable) | Renders the Turnstile widget; unset = no widget |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | GitHub Actions secrets | Used by the deploy workflow |

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`: tests, build, then
`wrangler pages deploy` to the `aicodestudio` Pages project.

One-time setup:

1. `npx wrangler login`, then `npx wrangler pages project create aicodestudio --production-branch=main`.
2. Create a Cloudflare API token from the "Cloudflare Pages: Edit" template. Store it and the account id with
   `gh secret set CLOUDFLARE_API_TOKEN` and `gh secret set CLOUDFLARE_ACCOUNT_ID`.
3. Resend: create an account with the Gmail above, make an API key, and
   `npx wrangler pages secret put RESEND_API_KEY --project-name=aicodestudio`.
4. Optional Turnstile: create a widget for the domain, set `TURNSTILE_SECRET`
   as a Pages secret and `gh variable set PUBLIC_TURNSTILE_SITE_KEY`.
5. Buy `aicodestudio.dev` at Cloudflare Registrar and add it as a custom domain
   of the Pages project. Verify the domain in Resend and set `RESEND_FROM`.
