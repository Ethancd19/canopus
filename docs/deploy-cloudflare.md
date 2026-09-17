# Deploying Canopus to Cloudflare Workers

The site runs as one Cloudflare Worker built by `@opennextjs/cloudflare`.
Static files ship as assets; every page and API route is rendered by the Worker
(no page cache yet). Images are served from Cloudflare R2.

You need: the Cloudflare account that holds the `bycanopus.com` zone (Workers
Paid plan), Node 24+, and the values currently in Vercel's environment
variables.

## 1. One-time setup

```bash
npm install
npx wrangler login          # opens a browser; authorizes this machine
npx wrangler whoami         # confirm the right account
```

Other values in `.env.local` are fine for local development: the build strips
everything except `NEXT_PUBLIC_*` from the Worker bundle, and the deployed
Worker reads its secrets only from `wrangler secret`.

## 2. Secrets

Each command prompts for the value. Paste it and press Enter. Rotated values
from Vercel are fine here; the Worker is a separate deployment.

```bash
npx wrangler secret put DATABASE_URL         # Neon's pooled connection string (the host contains `-pooler`)
npx wrangler secret put AUTH_SECRET          # openssl rand -base64 32
npx wrangler secret put ADMIN_PASSWORD_HASH  # generate the value first with `printf '%s' 'pw' | npm run -s hash-password`, then paste it at the prompt
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put RESEND_API_KEY
```

`AUTH_URL` is not needed: the app sets `trustHost: true`, so NextAuth uses the
request's own host on both the workers.dev URL and the custom domain.
`NEXTJS_ENV` is a plain var in `wrangler.jsonc` and needs no action. Optional:
`npx wrangler secret put ANTHROPIC_MODEL` to change the tagging model (default
`claude-opus-5`).

## 3. First deploy (workers.dev only)

```bash
npm run deploy
```

The output ends with a URL like `https://canopus.<account>.workers.dev`.
Check these before touching DNS:

- [ ] `curl -i https://canopus.<account>.workers.dev/work` returns 200 and the body contains photo markup (proves the database path).
- [ ] `/` loads, intro plays, featured photos render from R2.
- [ ] `/work` lists photos with filters working.
- [ ] `/behind` and `/contact` render; send a test message and confirm the email arrives.
- [ ] `/admin` redirects to `/admin/login`; wrong password is rejected; right password lands on the library.
- [ ] In the library, edit a caption and save; refresh; the change persists.
- [ ] Run the AI tag button on one photo and see suggestions.
- [ ] `curl -i https://canopus.<account>.workers.dev/api/admin/photos` returns `401 {"ok":false,"error":"unauthorized"}`.
- [ ] Reload `/work` five times quickly. No 500s (this exercises the shared database client across requests).

Logs: `npx wrangler tail` streams request logs while you click around.

## 4. Login rate limit

Cloudflare dashboard → the `bycanopus.com` zone → Security → WAF → Rate
limiting rules → Create rule:

- Name: `admin login`
- If incoming requests match: URI Path equals `/api/auth/callback/credentials`
- Rate: 5 requests per 10 seconds, counted by IP
- Action: Block for 10 seconds

Save. This applies once the domain is on the Worker (step 5).

## 5. Move the domain

Do this when step 3 is fully green. Expect a short interruption while
Cloudflare issues the certificate (usually under a minute).

0. Record the current DNS records for `bycanopus.com` and `www` (screenshot or
   `dig +short bycanopus.com` and `dig +short www.bycanopus.com`) so rollback
   does not depend on Vercel.
1. Dashboard → `bycanopus.com` → DNS → Records. Delete the records that point
   at Vercel: the `A` (or `CNAME`) record for `bycanopus.com` and the `CNAME`
   for `www`. Leave MX, TXT, and anything used for email alone.
2. In `wrangler.jsonc`, uncomment the `routes` block:
   ```jsonc
   "routes": [
     { "pattern": "bycanopus.com", "custom_domain": true },
     { "pattern": "www.bycanopus.com", "custom_domain": true }
   ],
   ```
3. Deploy again:
   ```bash
   npm run deploy
   ```
   Cloudflare creates the DNS records and certificates for both hostnames.
4. Open `https://bycanopus.com` and `https://www.bycanopus.com`. Repeat the
   step 3 checklist on the real domain, especially login (cookies are now on
   the real host).
5. Commit the `wrangler.jsonc` change.

## 6. Turn off Vercel

In the Vercel project: Settings → Domains → remove `bycanopus.com` and `www`.
Wait a few days before deleting the Vercel project so rollback stays possible;
then Settings → General → Delete project. Leaving the project alive costs
nothing but keeps a second copy of your secrets around.

## 7. Storage (R2 + Images)

Do these once, in order.

1. Create the bucket (private by default):
   ```bash
   npx wrangler r2 bucket create canopus-photos
   ```
2. The Images binding needs no zone-level toggle according to Cloudflare's binding docs. If the first `/img/` request returns a 502 with an Images error in `wrangler tail`, enable Images → Transformations for `bycanopus.com` in the dashboard and retry. The Worker requests at most 6 widths × 3 formats = 18 unique transformations per photo (plus one tiny blur), so the Free plan's 5,000 covers roughly 270 photos; beyond that, Images bills $0.50 per 1,000 extra.
3. Apply the database migration (adds nullable storage columns; existing rows are untouched and stay visible):
   ```bash
   npx prisma migrate deploy
   ```
   This reads `DATABASE_URL` from `.env.local`.
4. Deploy: `npm run deploy`. The dry-run size guard runs as part of the build.
5. Verify `/` and `/work`: image URLs start with `/img/photos/`. Open one in a new tab; the response has `content-type: image/avif` or `image/webp` and `cache-control: public, max-age=31536000, immutable`. The edge cache is inactive on `workers.dev`; only the custom domain exercises it.
6. New uploads go through `/admin` and land as unpublished drafts; publish them from the library once metadata is filled in.
7. **Deploy first, then migrate.** The Cloudinary column drop is destructive: the running Worker must already be the build that no longer selects `cloudinaryId`, or every database page returns 500 until the new code is live. Run `npm run deploy`, confirm `/` and `/work` return 200 on the live domain, and only then apply the migration with `npx prisma migrate deploy`. Delete the Cloudinary account afterwards. Rule of thumb: additive migrations before the deploy, destructive ones after it.
8. Status on 2026-09-17: migration `20260917100000_drafts_and_drop_cloudinary` is already applied, and `cloudinaryId` was re-added by hand as a nullable column to keep the phase-3 Worker alive. After the phase-4a deploy is verified, drop it again once: `printf 'ALTER TABLE "Photo" DROP COLUMN "cloudinaryId";' | npx prisma db execute --stdin`. Then remove this step.

Local development: `next dev` and `npm run preview` use a local, empty R2 simulation, so new test uploads only exist on your machine.

## Rollback

If something is wrong after step 5: comment the `routes` block back out and
run `npm run deploy` (removes the custom domains), then re-create the Vercel
DNS records you deleted (Vercel's Domains page shows the exact values).
The Worker keeps serving on workers.dev throughout.

## Day-to-day

- Deploy a change: `npm run deploy`.
- Rotate a secret: `npx wrangler secret put NAME`, then `npm run deploy` is
  not needed; secrets apply immediately.
- Local Worker preview with real bindings: copy `.dev.vars.example` to
  `.dev.vars`, fill it in, then `npm run preview` (serves on `localhost:8787`).
- Regular development stays `npm run dev`.
- Secrets never live in `.env.local` for the deployed site; `npm run deploy`
  strips non-public values from the bundle.
