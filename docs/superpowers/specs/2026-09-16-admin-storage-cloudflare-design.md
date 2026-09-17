# Canopus: admin, image storage, and Cloudflare migration

Date: 2026-09-16
Status: draft for review

## Goals

1. Make the admin area safe: every admin page and API route requires a session, enforced in the admin layout and in each API handler (not in a proxy/middleware file, which the Cloudflare adapter only supports experimentally for Next 16).
2. Make uploading photos fast and pleasant: one drag-and-drop queue with EXIF, AI tagging, and inline editing.
3. Move image storage from Cloudinary to Cloudflare R2 with on-the-fly resizing, at zero cost at portfolio scale and with no path to a surprise bill.
4. Move hosting from Vercel to Cloudflare Workers, with a written walkthrough.
5. Restructure the code so admin and public pages share primitives, and add tests where behaviour matters.
6. Keep the current visual identity. Public-site evolutions are proposed and approved separately in the final phase.

Non-goals for this round: the home NAS, multi-user accounts, RAW file handling, video.

## Current state (for context)

- Next.js 16 App Router, React 19, Prisma 7 with the Neon adapter, NextAuth v5 credentials provider with one shared password read from `ADMIN_PASSWORD`.
- No middleware. No admin API route checks the session. The upload pages call `/api/admin/tags` but the handler lives at `/api/admin/tag`, so AI tagging currently fails.
- Browser compresses to max 4000 px / 8 MB, uploads straight to Cloudinary with an unsigned preset, then POSTs metadata to `/api/admin/photo`.
- Public pages set `revalidate = 0`, so every visit queries Neon.
- Tailwind 4 is installed but unused. Every component uses inline style objects. Gallery is ~800 lines; each admin page is 700 to 900 lines.

## Architecture

```
Browser ──> Cloudflare Worker (Next.js via @opennextjs/cloudflare, Node runtime)
              ├── Neon Postgres (Prisma + @prisma/adapter-neon over HTTP)
              ├── R2 bucket  PHOTOS        (originals, private, via binding)
              ├── R2 bucket  NEXT_CACHE    (ISR incremental cache, via binding)
              ├── Images binding IMAGES    (resize + format at the edge)
              ├── Anthropic API            (tagging, Haiku 4.5 by default)
              └── Resend                   (contact form, unchanged)
```

The R2 photo bucket is never public. Images are served through an app route that reads the object with the R2 binding, resizes it with the Images binding, and caches the result at the edge. Because the route owns the width list, nobody can request arbitrary sizes and drain the free transform quota.

### Why not the simpler `/cdn-cgi/image/` URL loader

Cloudflare documents a Next.js loader that builds `/cdn-cgi/image/width=...,format=auto/<public-url>` URLs. It needs a public origin for the bucket and accepts any width. The route-based approach keeps the bucket private and enforces a width allowlist at the cost of ~80 lines of code. If the Images binding proves unavailable in local development, the route falls back to serving the original so development still works.

## Data model

Prisma `Photo` changes:

| Field | Change |
|---|---|
| `cloudinaryId` | Renamed to `storageKey` (R2 object key, e.g. `photos/<cuid>.jpg`). Rename via hand-written SQL migration, not drop and add. |
| `published Boolean @default(false)` | New. Public queries filter on it. Uploads start unpublished. |
| `blurDataUrl String?` | New. Tiny base64 WebP for `next/image` placeholders. |
| `mimeType String`, `sizeBytes Int`, `originalFilename String?` | New. |

Migration order keeps the site working at every step:

1. Add the new columns with `storageKey` nullable and `published` defaulting to `true` for existing rows via the migration SQL.
2. Run the Cloudinary-to-R2 script to fill `storageKey`, `blurDataUrl`, `mimeType`, `sizeBytes`.
3. Switch the public pages to the new image route.
4. Make `storageKey` required and drop `cloudinaryId`.

## Image delivery

Route: `GET /img/[key]?w=<width>&q=<quality>`

- Width must be in `IMAGE_WIDTHS = [320, 640, 960, 1280, 1920, 2560]`. Anything else returns 400.
- Quality clamps to 60 to 90, default 80.
- Format follows the `Accept` header (AVIF, WebP, fall back to JPEG) via the Images binding's `format: "auto"` equivalent.
- Response headers: `Cache-Control: public, max-age=31536000, immutable`, `Vary: Accept`. The route checks `caches.default` first and stores the transformed response after producing it.
- Object keys are unique per upload, so cache invalidation is never needed. Replacing a photo means a new key.

`next.config.ts` sets `images.loader = "custom"` with `loaderFile` pointing at `src/lib/image-loader.ts`, which builds `/img/<key>?w=<width>&q=<quality>`. `deviceSizes` and `imageSizes` mirror `IMAGE_WIDTHS` so `next/image` never asks for a width the route rejects.

Blur placeholders are generated once at upload by transforming to 16 px wide and base64-encoding the result.

## Upload flow

Client (`/admin/upload`):

1. Drop or pick files. Each becomes a queue item with a local preview.
2. `exifr` reads EXIF in the browser (camera, lens, focal length, aperture, shutter, ISO, taken-at). Existing mapping code is kept and moved to `src/lib/exif.ts`.
3. `browser-image-compression` keeps the current 4000 px / 8 MB cap. This is the stored original. Full-resolution archiving is out of scope this round.
4. Each file is `PUT` to `/api/admin/uploads` as multipart with the EXIF fields. Queue runs three uploads at a time.
5. On success the item shows the created draft with editable title, tags, format, film fields, location, caption, featured, and a Publish toggle. Edits `PATCH` the photo.
6. AI tagging runs automatically after upload and fills tags, caption, and location as suggestions the user can accept or overwrite.

Server (`/api/admin/uploads`):

1. `requireAdmin()` session check.
2. Validate MIME (`image/jpeg`, `image/png`, `image/webp`) and size (max 25 MB).
3. Generate key `photos/<cuid>.<ext>`, stream the body into R2 with `env.PHOTOS.put`.
4. Read dimensions with `env.IMAGES.info()`. Generate the blur placeholder.
5. Create the `Photo` row: title from filename, unique slug, `published: false`, EXIF fields from the request.
6. Return the row.

Deleting a photo deletes the R2 object in the same handler. Any create, update, delete, or publish change calls `revalidatePath("/")` and `revalidatePath("/work")`.

AI tagging: `POST /api/admin/photos/[id]/tag` reads a 1024 px transform from the route above, sends it base64 to Claude (`ANTHROPIC_MODEL` env, default `claude-opus-5`; `claude-haiku-4-5` is the cheaper option), parses JSON with a Zod schema, returns suggestions. It never writes to the database directly.

## Auth

- NextAuth v5 credentials provider stays. `ADMIN_PASSWORD` is replaced by `ADMIN_PASSWORD_HASH` (bcrypt via the already-installed `bcryptjs`). A small script `scripts/hash-password.ts` prints a hash.
- Admin pages live under a `src/app/admin/(protected)/` route group whose server `layout.tsx` calls `auth()` and redirects to `/admin/login` when there is no session. `/admin/login` sits outside the group.
- Every `/api/admin/*` handler calls `requireAdmin()` first and returns `401 { ok: false, error: "unauthorized" }` without a session. No `proxy.ts`/`middleware.ts`: Next 16's proxy runs on the Node runtime, which the Cloudflare adapter marks experimental.
- `PATCH` bodies pass through an allowlist of editable fields so clients cannot set `id`, `createdAt`, or other internal columns.
- JWT session, 7-day max age, `AUTH_SECRET` required. `trustHost: true` for Workers.
- Login rate limiting is a Cloudflare WAF rate-limiting rule on `/api/auth/callback/credentials` (5 requests per 10 seconds per IP, block for 10 seconds; free zone plans only offer a 10-second window). Configured in the dashboard; documented in the walkthrough.
- Admin entry point: a site footer on the public pages with a low-contrast "Admin" link to `/admin`. Login page restyled to match the site (serif heading, mono labels, copper accent).

## Admin UI

Decided with the owner on 2026-09-17: the admin lives in the same visual world as the public site but quieter; upload sessions are usually batches from a shoot but single careful uploads are common too; uploads start as unpublished drafts; the owner wants drag-to-reorder for featured photos, collections, bulk actions, and quality-of-life features.

### Design plan

- **Palette (existing tokens):** navy `#0e1824` base, `#111f2e` panels, `#162536` raised; text `#d4dce8`, muted `#7a8fa8`, faint `#3a5068`; copper `#c9a96e` is the only accent; ice `#a8c5da` for links; success `#5dbb8a`; danger `#e07070`.
- **Type:** Cormorant Garamond (light) for page titles and photo titles only. DM Mono for everything else at 12–13 px, sentence case. Tracked all-caps survives only on the small draft/published badge. This is the deliberate difference from the public site.
- **Layout:** 200 px sidebar (Polaris mark, Library, Upload, Collections, View site, Sign out); left-aligned content, max width ~1400 px. Library: grid of flush 3:2 image tiles, title beneath, draft badge when unpublished; click opens a right-side drawer with the edit form. Upload: one dropzone that becomes a list as files land (thumbnail, editable fields, status column) with "Publish all" at the top.
- **Principles:** the photographs are the memorable element; everything else is hairline navy. Copper only on publish state and the primary action. No cards with shadows, no numbered markers, no entrance animations; motion only answers actions (drawer, progress, confirm). Copy in sentence case with verbs that persist through a flow: "Upload photos", "Publish", "Save changes", "Delete photo". Errors state what happened and what to do.
- **Styling mechanism:** Tailwind 4 utilities and theme only (`@import "tailwindcss/theme"` and `"tailwindcss/utilities"`, no preflight, because `globals.css` already carries the site reset and preflight would alter the public pages). An `@theme` block maps the tokens above to `--color-*` and `--font-*`. New admin code and `src/components/ui/` primitives use utilities; public components keep their inline styles until they are touched.

### Routes and behaviour

- `/admin/login` (public): restyled to the plan; a signed-in visitor is redirected to `/admin`.
- `/admin` layout: sidebar + content. Sign out is a form posting to a server action that calls `signOut`.
- `/admin` = Library: search, filters (format, draft/published, featured, untagged), grid/list toggle, edit drawer, featured toggle, delete with confirm.
- `/admin/upload` = the queue. Drop or pick files; three concurrent uploads; per-file: browser EXIF (`src/lib/exif.ts`), compression (4000 px / 8 MB), `POST /api/admin/uploads` which now **creates the draft row** (title from filename, unique slug, `published: false`) and returns it; AI tagging then `PATCH`es suggestions into the row; inline fields edit the row via `PATCH`; per-item Publish and "Publish all". Failed items show the reason and a retry. Creating the row in the upload handler closes the orphaned-object gap; if the row insert fails the handler deletes the object.
- `/admin/collections` (phase 4b): list, create, rename, set cover, drag-order photos within a collection, publish/unpublish.
- Public footer on every public page with a low-contrast "Admin" link.
- `POST /api/admin/photo` is removed (rows are created by the upload handler). `POST /api/admin/migrate-cloudinary` and the Cloudinary fallback are removed; `cloudinaryId` is dropped and `storageKey` becomes required (schema step 4).
- Drafts: `published` defaults to `false` for new rows. Public queries already filter on it.

### Collections (phase 4b)

```prisma
model Collection {
  id          String            @id @default(cuid())
  slug        String            @unique
  title       String
  description String?
  coverId     String?
  cover       Photo?            @relation("CollectionCover", fields: [coverId], references: [id])
  published   Boolean           @default(false)
  order       Int               @default(0)
  photos      CollectionPhoto[]
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}

model CollectionPhoto {
  collectionId String
  photoId      String
  order        Int        @default(0)
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  photo        Photo      @relation(fields: [photoId], references: [id], onDelete: Cascade)
  @@id([collectionId, photoId])
}
```

Public presentation of collections is designed in the public-site phase.

### Bulk actions and reorder (phase 4b)

- Library multi-select (checkbox on hover, shift-click ranges): publish, unpublish, add to collection, add/remove tag, delete. One `POST /api/admin/photos/bulk` with `{ ids, action, payload }`.
- Featured order: a "Featured" view with drag-to-reorder (`Reorder` from `motion/react`, already installed) writing `order` via one `PATCH /api/admin/photos/order` with the id list.
- Quality of life: tag autocomplete from existing tags; auto-slug from title with uniqueness check; duplicate detection on upload by original filename and byte size; "Copy public URL" on a photo; unsaved-changes guard on the drawer; keyboard shortcuts in the drawer (Esc close, Cmd+S save, Cmd+Enter publish).

### Shared primitives

`src/components/ui/`: `Button` (primary/secondary/danger/ghost, sizes sm/md, loading state), `Input`, `Textarea`, `Select`, `Field` (label + control + hint + error), `TagInput`, `Toggle`, `Badge` (draft/published/featured), `Drawer`, `Dropzone`. Each file has one responsibility; rendered with `@testing-library/react` under a jsdom environment per test file.

## Public site

Final phase, after the storage and admin work ships:

- `next/image` with the custom loader, `sizes` derived from the gallery column count, blur placeholders from the database.
- `Gallery.tsx` split into `gallery/GalleryGrid.tsx`, `gallery/GalleryFilters.tsx`, `gallery/Lightbox.tsx`, `gallery/EmptyState.tsx` (keeps the existing messages), and `gallery/useGalleryFilter.ts`.
- Home and Work pages become static with on-demand revalidation instead of `revalidate = 0`.
- Visual evolutions are proposed at that point using the frontend-design skill and approved before implementation. Candidates: keyboard navigation and swipe in the lightbox, a photo detail panel that uses the EXIF and film fields already stored, aspect-aware masonry, and a film-grain treatment for film-format shots.

## Cloudflare deployment

Packages: `@opennextjs/cloudflare`, `wrangler` (dev dependencies).

Files:

- `wrangler.jsonc`: `nodejs_compat` flag, `main` from OpenNext, bindings `PHOTOS` (R2), `NEXT_INC_CACHE_R2_BUCKET` (R2), `IMAGES` (Images), `ASSETS`. Non-secret vars.
- `open-next.config.ts`: R2 incremental cache.
- `next.config.ts`: calls `initOpenNextCloudflareForDev()` so `next dev` gets the bindings.
- `scripts`: `preview` (build + local Worker), `deploy`, `cf-typegen`.
- `.dev.vars` (gitignored) for local secrets.

Secrets set with `wrangler secret put`: `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_PASSWORD_HASH`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`.

Walkthrough (`docs/deploy-cloudflare.md`) covers: creating the two R2 buckets, enabling Images, adding the rate-limit rule, setting secrets, first deploy to the `workers.dev` URL, verifying, attaching the custom domain, moving DNS off Vercel, and rolling back by pointing DNS back.

The account is on the Workers Paid plan ($5/month); the free plan's 10 ms CPU limit per request would be too tight for server-rendered pages and streaming uploads.

## Cloudinary migration

`scripts/migrate-cloudinary.ts` (run locally, Node):

- For each `Photo` with a null `storageKey`, download the original from Cloudinary, upload to R2 through the S3 API (`@aws-sdk/client-s3`, dev dependency), compute the blur placeholder with `sharp` (dev dependency, local only), update the row.
- Idempotent, `--dry-run` flag, logs each photo, stops on the first failure.
- Cloudinary stays untouched until the public pages have been verified on R2. Then the account can be closed.

## Error handling

- API routes return `{ ok: boolean, error?: string }` with proper status codes. A shared `apiError()` helper replaces the copy-pasted try/catch blocks.
- Upload queue shows per-file status (queued, uploading, tagging, done, failed) and a retry button. Failures leave no orphaned R2 objects: the handler deletes the object if the database write fails.
- Image route returns 404 for unknown keys and 400 for bad widths, both cacheable for 60 seconds to absorb bad crawlers.
- Tagging failure is non-fatal: the draft is created and the user tags manually.

## Testing

Vitest with the Node environment.

- Unit: image loader URL builder, width validation, slug generation, EXIF mapping, tag response parsing, `apiError`.
- Route handlers: upload, photo CRUD, tag, and the image route with mocked `db`, `PHOTOS`, and `IMAGES` bindings.
- `requireAdmin()` and the protected layout: authenticated and unauthenticated cases.
- No browser end-to-end tests this round. Manual verification checklist lives in the walkthrough.

## Phases and order

1. Lock down: `requireAdmin()` on every admin API route, protected admin layout, PATCH field allowlist, password hash, tag route fix, `apiError`, Vitest setup. Ships on Vercel as-is. (Done 2026-09-16.)
2. Cloudflare deploy: OpenNext config, walkthrough, first deploy to workers.dev, DNS cutover for bycanopus.com. Images still served from Cloudinary at this point. Ordered before storage so the storage phase builds directly on Workers bindings instead of a throwaway S3-API path.
3. Storage: schema step 1, R2 bindings, image route, loader, upload endpoint, migration script and run, schema step 4.
4a. Admin foundation: Tailwind theme, UI primitives, admin shell + sign out, login restyle, footer link, drafts, upload queue that creates rows, library rebuild, Cloudinary cleanup (schema step 4). Remove old admin pages.
4b. Admin power: bulk actions, featured drag-reorder, collections, quality-of-life features.
5. Public site: `next/image` adoption, Gallery split, static pages with revalidation, then approved visual evolutions.

Each phase is a separate branch and pull request. Work is delegated to cheaper models per task with orchestrator review before merge.

## Open questions

1. ~~Site domain name~~ Resolved: `bycanopus.com`, DNS already on Cloudflare.
2. ~~Is the Cloudflare account already on Workers Paid?~~ Resolved: yes.
3. Local environment: there is no `.env` in the repo checkout. The migration script and local dev need `DATABASE_URL`, Cloudinary credentials, and `ANTHROPIC_API_KEY`. `vercel env pull .env.local` would provide them.
