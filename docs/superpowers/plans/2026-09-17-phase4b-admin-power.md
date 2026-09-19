# Phase 4b: Admin Power Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the library multi-select with bulk actions, a drag-to-reorder view for the home page's featured photos, collections (model, API, admin pages), and the quality-of-life features the owner asked for.

**Architecture:** Two new Prisma models (`Collection`, `CollectionPhoto`) in an additive migration. Three new admin API surfaces: a bulk endpoint, an order endpoint, and collection CRUD with membership/order. The library gains a selection layer and an action bar; a `/admin/featured` page and `/admin/collections` pages use `Reorder` from `motion/react` for drag ordering. All UI is built from the phase 4a primitives and the shared `PhotoFields`.

**Tech Stack:** as phase 4a. `Reorder.Group`/`Reorder.Item` from `motion/react` (installed). No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-09-16-admin-storage-cloudflare-design.md` — Admin UI → Collections (phase 4b), Bulk actions and reorder (phase 4b), Design plan.

## Global Constraints

- **Do not run `git commit` or `git push`.** Where a task says "Commit", run `git status --short` instead.
- **No Cloudflare login/deploy.** `npm run preview` only in Task 8.
- **Never run `prisma migrate deploy/dev`, `db push`, or `db execute`.** Migration SQL is generated schema-to-schema (`prisma migrate diff --from-schema <HEAD schema> --to-schema prisma/schema.prisma --script`, the Prisma 7 flag names) and applied by the controller with the owner's approval. It is additive, so it may be applied before the deploy.
- Never print values from `.env.local` or `.dev.vars`.
- Every `/api/admin/*` handler calls `requireAdmin()` first; responses `{ ok: true, ... }` / `{ ok: false, error }`; `handleRouteError` returns the generic message.
- `PrismaNeonHttp` supports no transactions: multi-row writes use `Promise.all` of independent updates and are documented as non-atomic.
- Design plan is binding (spec → Admin UI → Design plan): DM Mono 12–13 px sentence case; serif light for page/photo/collection titles; copper only on publish state and the primary button; `rounded-sm` max; no shadows; no entrance animations; motion only in the Drawer and in drag reordering. Copy in sentence case with persistent verbs.
- Tailwind classes only in admin code; the only inline style is the blur `backgroundImage`.
- Tests: `src/**/*.test.{ts,tsx}` via `npm test` (currently 172, pristine); `npx tsc --noEmit` clean; `npx eslint src scripts vitest.config.mts` with 0 errors besides the pre-existing `Gallery.tsx` one.
- Bare `<button>` elements must carry `bg-transparent` (the site has no preflight; the UA default is light gray).

---

### Task 1: Collections schema (additive)

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260917200000_collections/migration.sql`
- Modify: `src/lib/admin-api.ts` (types only: `export type Collection = PrismaCollection;`)

**Interfaces:**
- Models exactly as the spec's Collections section, plus on `Photo`: `collections CollectionPhoto[]` and `coverOf Collection[] @relation("CollectionCover")`.

- [ ] **Step 1:** Add the models and back-relations. `npx prisma generate`; `npx tsc --noEmit` clean.
- [ ] **Step 2:** Generate the migration SQL schema-to-schema; it must contain only `CREATE TABLE "Collection"`, `CREATE TABLE "CollectionPhoto"`, indexes (`Collection_slug_key`, the composite primary key), and the two foreign keys (`CollectionPhoto` → `Collection` ON DELETE CASCADE, → `Photo` ON DELETE CASCADE; `Collection.coverId` → `Photo` ON DELETE SET NULL). No changes to existing columns. Paste it in the report.
- [ ] **Step 3:** `npm test && npx tsc --noEmit`. Do not apply.

---

### Task 2: Bulk and order endpoints

**Files:**
- Create: `src/app/api/admin/photos/bulk/route.ts` (+test)
- Create: `src/app/api/admin/photos/order/route.ts` (+test)
- Create: `src/lib/bulk.ts`, `src/lib/bulk.test.ts` (pure validation)
- Modify: `src/lib/admin-api.ts` (`bulkPhotos(ids, action, payload?)`, `orderPhotos(ids)`) (+test cases)

**Interfaces:**
- `POST /api/admin/photos/bulk` body `{ ids: string[]; action: "publish" | "unpublish" | "delete" | "addTag" | "removeTag" | "addToCollection" | "removeFromCollection"; payload?: { tag?: string; collectionId?: string } }`. Validation in `parseBulkRequest(body): { ok: true; value } | { ok: false; error }`: `ids` non-empty array of strings (max 500); `tag` required, trimmed, lowercased, non-empty for tag actions; `collectionId` required for collection actions. Behaviour: publish/unpublish → `updateMany`; addTag/removeTag → load rows, compute new `tags` (dedupe), `Promise.all` updates; delete → load rows, `deleteMany`, then best-effort `PHOTOS.delete` per key (errors logged); addToCollection → `createMany` with `skipDuplicates`, `order` = current max + index; removeFromCollection → `deleteMany` on the join. Response `{ ok, count }`.
- `PATCH /api/admin/photos/order` body `{ ids: string[] }` → sets `order` to the index for each id via `Promise.all` of `update`s; response `{ ok, count }`. Only affects the listed ids.
- Tests: auth gate; validation 400s; each action's Prisma calls (mocked `db`) and the object deletes for `delete`; order sets index values.

- [ ] Write failing tests, implement, verify `npm test && npx tsc --noEmit && npx eslint src/app/api src/lib`.

---

### Task 3: Collections API

**Files:**
- Create: `src/app/api/admin/collections/route.ts` (+test): `GET` (list with `_count.photos` and cover), `POST` `{ title, description? }` → slug via `uniqueSlug(slugify(title))`, `published: false`.
- Create: `src/app/api/admin/collections/[id]/route.ts` (+test): `GET` (collection + ordered photos via the join, ordered by `CollectionPhoto.order`), `PATCH` allowlist `title, slug, description, published, coverId, order` (slug re-validated with `slugify`, P2002 → 409 "slug already in use"; `coverId` must be a member or null), `DELETE`.
- Create: `src/app/api/admin/collections/[id]/photos/route.ts` (+test): `POST` `{ ids }` add members (append order), `PUT` `{ ids }` replace the full ordered membership (delete missing, upsert order), `DELETE` `{ ids }` remove members.
- Modify: `src/lib/admin-api.ts`: `listCollections()`, `createCollection(input)`, `getCollection(id)`, `patchCollection(id, data)`, `deleteCollection(id)`, `setCollectionPhotos(id, ids)`, `addCollectionPhotos(id, ids)`, `removeCollectionPhotos(id, ids)` (+tests).

- [ ] TDD each route with mocked `db`; verify as above.

---

### Task 4: Library multi-select and bulk action bar

**Files:**
- Modify: `src/components/admin/useLibrary.ts` (+test): selection state `selected: Set<string>`, `toggleSelected(id, { range?: boolean })` with shift-range over the current `filtered` order, `selectAllFiltered()`, `clearSelection()`, `bulk(action, payload?)` → calls `bulkPhotos`, then `reload()` and clears selection; returns `{ ok, count?, error? }`.
- Modify: `src/components/admin/Library.tsx`: a checkbox overlay on each tile (top-left, `absolute`, visible on hover or when any selection exists; `aria-label="Select <title>"`), shift-click ranges; a sticky bottom action bar (`fixed bottom-0 left-[200px] right-0 border-t border-text/10 bg-navy-mid px-8 py-3`) shown when `selected.size > 0`: "N selected", buttons Publish, Unpublish, Add tag (inline Input + Apply), Remove tag (Select of `allTags` + Apply), Add to collection (Select of collections + Apply), Delete (two-step "Confirm delete N"), Clear. Results and errors shown in the bar in mono text.
- Create: `src/components/admin/BulkBar.tsx` (+test) to keep `Library.tsx` under control.

- [ ] TDD the hook's selection/range/bulk; a BulkBar render test (buttons, two-step delete, error line); verify.

---

### Task 5: Featured order page

**Files:**
- Create: `src/app/admin/(protected)/featured/page.tsx` (server: title "Featured order" + client component)
- Create: `src/components/admin/FeaturedOrder.tsx`, `src/components/admin/useFeaturedOrder.ts` (+test)
- Modify: `src/components/admin/AdminShell.tsx` (nav: Library, Upload, Featured, Collections) (+test update)

**Interfaces:**
- `useFeaturedOrder()`: loads `listPhotos()`, keeps `featured` rows sorted by `order` then `createdAt`; `move(ids)` (new order), `dirty`, `save()` → `orderPhotos(ids)` then reload; error surfaced.
- UI: helper line "Drag to set the order photos appear on the home page."; `Reorder.Group axis="y" values={ids} onReorder={move}` of rows (`Reorder.Item` with `value={id}`): 64 px thumb, serif title, mono position number on the left; a drag handle affordance via `cursor-grab`; primary "Save order" disabled when clean; secondary "Reset". Respect reduced motion (`Reorder` handles layout animation; pass `layout={false}` when `useReducedMotion()`).
- Test the hook (ordering, dirty, save) and a render test that rows appear in order.

---

### Task 6: Collections admin

**Files:**
- Create: `src/app/admin/(protected)/collections/page.tsx` + `src/components/admin/Collections.tsx`, `useCollections.ts` (+test)
- Create: `src/app/admin/(protected)/collections/[id]/page.tsx` + `src/components/admin/CollectionDetail.tsx`, `useCollection.ts` (+test), `PhotoPicker.tsx` (+test)

**Interfaces:**
- List page "Collections": rows (serif title, mono `/work/<slug>`, count, draft/published Badge), "New collection" primary button opening a small inline form (title, create); click a row → detail.
- Detail page: title (serif, editable via `PhotoFields`-style inline Input), description Textarea, `Toggle tone="copper"` "Published", cover picker (a row of member thumbnails, click to set cover, current cover outlined `border-copper`), members grid with `Reorder.Group axis` in a wrapped list (use `axis="y"` list view for reliability; a grid reorder is out of scope), "Add photos" opening `PhotoPicker` (a `Drawer` listing library photos with search and checkboxes, excluding current members; "Add N photos"), per-member "Remove"; "Save changes" primary when dirty; "Delete collection" danger two-step. Errors surfaced in mono `text-danger`.
- Hooks tested with mocked `admin-api`.

---

### Task 7: Quality of life and deferred items

**Files:**
- Modify: `src/components/admin/PhotoDrawer.tsx` (+test): editable slug field with "Regenerate from title"; server 409 on slug conflict surfaces "That slug is already in use."; "Copy image URL" ghost button (copies `${location.origin}/img/${storageKey}?w=1920` via `navigator.clipboard.writeText`, shows "Copied"); Cmd/Ctrl+Enter toggles publish.
- Modify: `src/app/api/admin/photo/[id]/route.ts` (+test): validate `slug` with `slugify` equality (400 otherwise); catch P2002 on `slug` → 409.
- Modify: `src/components/admin/useUploadQueue.ts`/`UploadQueue.tsx`: tag suggestions = `TAG_OPTIONS` merged with tags from `listPhotos()` fetched once on mount (non-fatal).
- Modify: `src/components/ui/Drawer.tsx` (+test): focus trap (Tab/Shift+Tab cycle within the panel); restore focus after the exit animation completes (`onExitComplete`).
- Modify: `src/lib/photo-fields.ts` (+test): light type checks: `tags` must be an array of strings, `order` a number, `published`/`featured` booleans, `format` in the enum; invalid → dropped with a 400 listing the bad fields from the PATCH route.

---

### Task 8: Docs, verification, smoke

- README: Featured order and Collections sections; walkthrough: note the additive collections migration goes before the deploy.
- Gates: `npm test && npx tsc --noEmit && npx eslint src scripts vitest.config.mts && npm run build:cf`.
- Controller applies the additive migration (owner-approved) before the smoke test.
- Smoke on `npm run preview` with the curl login: create a collection via `POST /api/admin/collections` (title "Smoke test"), add two existing photo ids, `PUT` a reversed order, `GET` shows the order, `PATCH` published true then false, `GET /admin/collections` and `/admin/collections/<id>` and `/admin/featured` → 200; bulk `addTag` "smoke" on one photo then `removeTag`; `PATCH /api/admin/photos/order` with the current featured ids reversed then restored; finally `DELETE` the collection and confirm the photos are untouched (tags back to original, no `smoke` tag). Never delete or unpublish real photos.
