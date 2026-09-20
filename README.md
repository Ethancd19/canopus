# Canopus

Photography portfolio. Next.js 16, Prisma 7 on Neon Postgres, NextAuth v5.

## Setup

Requires Node 24 or newer (the hash script relies on Node's built-in TypeScript support).

```bash
npm install                  # also runs `prisma generate`
cp .env.example .env.local   # fill in the values
npm run dev
```

### Admin password

The admin login compares against a bcrypt hash in `ADMIN_PASSWORD_HASH`:

```bash
printf '%s' 'your password' | npm run -s hash-password
```

Paste the output into `.env.local` (and into your host's environment settings). Set `ADMIN_PASSWORD_HASH` on your host before deploying; without it, admin login is disabled and the server logs a warning.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Prisma generate + Next dev server (Turbopack is the default in Next 16, so no `--turbopack` flag) |
| `npm run build` | Production build |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest in watch mode |
| `npm run lint` | ESLint |
| `npm run hash-password` | Hash an admin password from stdin |
| `npm run build:cf` | Build the Cloudflare Worker bundle and strip non-public env values from it |
| `npm run preview` | Build and run the Worker locally with `.dev.vars` |
| `npm run deploy` | Build and deploy the Worker |
| `npm run cf-typegen` | Regenerate `cloudflare-env.d.ts` from `wrangler.jsonc` |

The test scripts pass `--no-deprecation` to hide Node's DEP0205 warning emitted by Vite's loader on recent Node versions; remove the flag once Vite no longer calls `module.register()`.

## Admin

- `/admin/login` is public. Everything else under `/admin` requires a session. Sign out is in the sidebar.
- Every `/api/admin/*` route returns `401 { ok: false, error: "unauthorized" }` without a session.
- Four pages:
  - **Library** (`/admin`): Search, filter, and browse the photo grid. Edit captions, tags, and the slug in a drawer, copy a photo's image URL, press Cmd/Ctrl+S to save, or Cmd/Ctrl+Enter to publish. Select photos (shift-click for a range, or "Select all") to publish, unpublish, tag, add to a collection, or delete them in bulk.
  - **Upload** (`/admin/upload`): Drop a batch of photos, view EXIF data, add AI-suggested tags with inline edits. Tag suggestions include every tag already used in the library. Photos land as unpublished drafts by default; publish per photo or all at once.
  - **Featured order** (`/admin/featured`): Drag featured photos into the order they appear on the home page, then save.
  - **Collections** (`/admin/collections`): Named sets of photos, each with its own slug for a public page at `/work/<slug>`. Create a collection, edit its title and description, pick a cover, drag members into order, add photos from the library, and publish it when ready. A photo can belong to many collections.
- Drafts are visible only in the library, not on public pages. Publish photos before they appear on `/work` or `/`.
- The footer on every public page links to `/admin`.
- Uploads go to Cloudflare R2 and are served from `/img/<key>?w=<width>`; see the walkthrough's Storage section.

## Public site

- **Home** (`/`) shows the featured photos in the order set on `/admin/featured`. The hero image is served from `public/hero/` in AVIF, WebP, and JPEG at three widths; regenerate them after replacing the source file `assets/intro.jpg` with `npm run hero` (the source is not served; only the variants are).
- **Work** (`/work`) lists every published photo in a tiled masonry that keeps each photo's aspect ratio (four columns on wide screens, then three, two, one). Published collections appear in a strip above the grid.
- **Collections** (`/work/<slug>`) show one collection's photos in the order set in the admin, with its description. Unpublished collections return 404.
- **Lightbox**: click or press Enter on a tile; arrow keys, on-screen arrows, or a swipe move between photos; Escape closes.
- Photos are only ever resized and encoded on the way out (`/img/<key>?w=`); nothing crops, filters, or overlays them.
- The gallery code lives in `src/components/gallery/`; public data access in `src/lib/public-queries.ts`.
- Public pages are static and refresh within 60 seconds of a change in the admin. `next build` renders them, so it needs `DATABASE_URL` in `.env.local`.

## Deploy

The site runs on Cloudflare Workers. See `docs/deploy-cloudflare.md` for
secrets, first deploy, DNS cutover, and rollback. Day-to-day: `npm run deploy`.
Public pages are cached in the `canopus-cache` R2 bucket and refresh in the
background; see "8. Page cache bucket" in the deploy doc.

## Design docs

- `docs/superpowers/specs/` holds design specs.
- `docs/superpowers/plans/` holds implementation plans.
