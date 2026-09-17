# Phase 3: R2 Storage and Cloudinary Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve every photo from a private Cloudflare R2 bucket through an app route that resizes with the Cloudflare Images binding, upload new photos through the Worker, and move the existing Cloudinary photos across with a one-click admin migration. Cloudinary stays as a read fallback until the migration is verified.

**Architecture:** Originals live in R2 under `photos/<uuid>.<ext>`; nothing in the bucket is public. `GET /img/<key>?w=<width>&q=<quality>` reads the object with the R2 binding, resizes with the Images binding to one of six allowed widths, negotiates AVIF/WebP/JPEG from the `Accept` header, and caches at the edge. `POST /api/admin/uploads` streams a file into R2 and returns its metadata (dimensions, MIME, size, a 16 px blur placeholder); the existing `POST /api/admin/photo` then creates the row with a `storageKey`. Rendering uses `photoSrc(photo, width)` which falls back to Cloudinary while `storageKey` is null. `POST /api/admin/migrate-cloudinary` fills `storageKey` for old rows. Bindings are accessed through `getEnv()` with hand-written structural types (the Cloudflare runtime types clash with DOM lib types, see phase 2).

**Tech Stack:** Next.js 16.3.5 on Cloudflare Workers via @opennextjs/cloudflare 1.20.6, R2 + Images bindings, Prisma 7.10 (`prisma-client` generator, workerd runtime) + `PrismaNeonHttp`, NextAuth v5, Vitest 5.

**Spec:** `docs/superpowers/specs/2026-09-16-admin-storage-cloudflare-design.md` (Architecture, Data model, Image delivery, Upload flow, Cloudinary migration, Error handling). Deviations recorded in this plan: migration runs on the Worker via an admin endpoint (no local script, no S3 keys, no sharp); `published` defaults to `true` until the admin rebuild introduces drafts; upload returns metadata and does not create the row (so the current admin pages keep their two-step flow).

## Global Constraints

- **Do not run `git commit` or `git push`.** Where a task says "Commit", run `git status --short` instead.
- **No Cloudflare login, no `wrangler deploy`, no `opennextjs-cloudflare deploy/upload`.** `npm run preview` (local workerd, local R2 simulation) is allowed and required for the smoke test.
- **Never run `prisma migrate deploy`, `prisma migrate dev`, `prisma db push`, or any SQL against the database.** The migration SQL is written to disk only; the controller applies it with the owner's approval.
- Never print values from `.env.local` or `.dev.vars`.
- `npm install` runs without flags. No new runtime dependencies in this phase.
- Every `/api/admin/*` handler calls `requireAdmin()` first. API responses keep `{ ok: true, ...data }` / `{ ok: false, error }`.
- Allowed image widths: `[320, 640, 960, 1280, 1920, 2560]`. Quality clamps to 60–90, default 80. Object keys match `^photos/[0-9a-f-]{36}\.(jpg|png|webp)$`.
- Accepted upload MIME types: `image/jpeg`, `image/png`, `image/webp`; max 25 MB.
- Tests at `src/**/*.test.ts`, run with `npm test` (currently 55, pristine output). `npx tsc --noEmit` clean. Scoped lint `npx eslint src/lib src/app/api src/app/admin scripts vitest.config.mts` at 0 errors.
- `next dev` runs with `initOpenNextCloudflareForDev()`, which provides local R2 and Images simulations; the Images simulation supports only `width`, `height`, `rotate`, and `format` locally (`quality`/`fit` are ignored there).

---

### Task 1: Binding config and typed access

**Files:**
- Modify: `wrangler.jsonc`
- Create: `src/lib/cloudflare.ts`
- Test: `src/lib/cloudflare.test.ts`

**Interfaces:**
- Produces: `getEnv(): AppEnv` where `AppEnv = { PHOTOS: PhotoBucket; IMAGES: ImagesApi }`; `getEdgeCache(): Cache | null`; `getWaitUntil(): (p: Promise<unknown>) => void`.
- Produces the structural types `PhotoBucket`, `BucketObject`, `ImagesApi`, `ImageTransformer`, `ImageOutput`, `ImageInfo` used by every later task.

- [ ] **Step 1: Add the bindings to `wrangler.jsonc`**

After the `"services"` block add:

```jsonc
  "r2_buckets": [
    {
      "binding": "PHOTOS",
      "bucket_name": "canopus-photos"
    }
  ],
  "images": {
    "binding": "IMAGES"
  },
```

- [ ] **Step 2: Write the failing test**

`src/lib/cloudflare.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCloudflareContext } = vi.hoisted(() => ({ getCloudflareContext: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext }));

import { getEdgeCache, getEnv, getWaitUntil } from "@/lib/cloudflare";

describe("cloudflare helpers", () => {
  beforeEach(() => getCloudflareContext.mockReset());

  it("getEnv returns the bindings from the Cloudflare context", () => {
    const env = { PHOTOS: {}, IMAGES: {} };
    getCloudflareContext.mockReturnValue({ env, ctx: { waitUntil: vi.fn() } });
    expect(getEnv()).toBe(env);
  });

  it("getEnv throws a clear error when a binding is missing", () => {
    getCloudflareContext.mockReturnValue({ env: { PHOTOS: {} }, ctx: {} });
    expect(() => getEnv()).toThrow(/IMAGES/);
  });

  it("getWaitUntil forwards to ctx.waitUntil", () => {
    const waitUntil = vi.fn();
    getCloudflareContext.mockReturnValue({ env: {}, ctx: { waitUntil } });
    const p = Promise.resolve();
    getWaitUntil()(p);
    expect(waitUntil).toHaveBeenCalledWith(p);
  });

  it("getEdgeCache returns null when the Cache API is absent", () => {
    expect(getEdgeCache()).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test -- src/lib/cloudflare.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement `src/lib/cloudflare.ts`**

```ts
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Structural types for the two bindings this app uses. The official
// @cloudflare/workers-types package redefines DOM globals (fetch, Response)
// and breaks tsc for the rest of the app, so we describe only what we call.

export interface BucketObject {
  body: ReadableStream;
  size: number;
  httpEtag: string;
  httpMetadata?: { contentType?: string };
  writeHttpMetadata(headers: Headers): void;
}

export interface PhotoBucket {
  get(key: string): Promise<BucketObject | null>;
  head(key: string): Promise<{ size: number } | null>;
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | Blob,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
}

export type ImageFormat = "image/avif" | "image/webp" | "image/jpeg";

export interface ImageOutput {
  image(): ReadableStream;
  contentType(): string;
  response(): Response;
}

export interface ImageTransformer {
  transform(options: { width?: number; height?: number; fit?: string; blur?: number }): ImageTransformer;
  output(options: { format: ImageFormat; quality?: number }): Promise<ImageOutput>;
}

export interface ImageInfo {
  format: string;
  fileSize: number;
  width?: number;
  height?: number;
}

export interface ImagesApi {
  input(stream: ReadableStream): ImageTransformer;
  info(stream: ReadableStream): Promise<ImageInfo>;
}

export interface AppEnv {
  PHOTOS: PhotoBucket;
  IMAGES: ImagesApi;
}

/** Bindings declared in wrangler.jsonc. Throws early if one is missing. */
export function getEnv(): AppEnv {
  const env = getCloudflareContext().env as unknown as Partial<AppEnv>;
  for (const name of ["PHOTOS", "IMAGES"] as const) {
    if (!env[name]) throw new Error(`Cloudflare binding ${name} is not configured`);
  }
  return env as AppEnv;
}

/** `ctx.waitUntil` for work that should outlive the response (edge cache writes). */
export function getWaitUntil(): (promise: Promise<unknown>) => void {
  const { ctx } = getCloudflareContext();
  return (promise) => ctx.waitUntil(promise);
}

/** The Workers edge cache, or null outside workerd (next dev, tests). */
export function getEdgeCache(): Cache | null {
  const c = (globalThis as { caches?: { default?: Cache } }).caches;
  return c && c.default ? c.default : null;
}
```

- [ ] **Step 5: Run the tests, type-check, and confirm the Worker still builds**

Run: `npm test -- src/lib/cloudflare.test.ts && npx tsc --noEmit && npx wrangler deploy --dry-run --outdir="$(mktemp -d)"`
Expected: 4 tests pass; tsc clean; the dry run lists `env.PHOTOS (canopus-photos)` and `env.IMAGES` among the bindings. (The dry run does not need the bucket to exist.)

- [ ] **Step 6: Check the working tree**

Run: `git status --short`
Expected: `wrangler.jsonc` modified; two new files. Do not commit.

---

### Task 2: Schema step 1 (additive) and shared types

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260917000000_add_storage_fields/migration.sql`
- Modify: `src/types/photo.ts`
- Modify: `src/lib/photo-fields.ts`, `src/lib/photo-fields.test.ts`
- Modify: `src/app/page.tsx`, `src/app/work/page.tsx`
- Modify: `src/app/api/admin/photo/route.test.ts` (fixture only; the route itself changes in Task 4)

**Interfaces:**
- Produces the `Photo` model fields: `cloudinaryId String?`, `storageKey String? @unique`, `published Boolean @default(true)`, `blurDataUrl String?`, `mimeType String?`, `sizeBytes Int?`, `originalFilename String?`.
- Produces `Photo` type in `src/types/photo.ts` including `cloudinaryId`, `storageKey`, `blurDataUrl`, `width`, `height`.
- Adds `published` to `PHOTO_EDITABLE_FIELDS`.

- [ ] **Step 1: Update the model in `prisma/schema.prisma`**

Replace `cloudinaryId String` with:

```prisma
  // Storage. cloudinaryId is nullable during the migration and dropped afterwards.
  cloudinaryId     String?
  storageKey       String?  @unique
  published        Boolean  @default(true)
  blurDataUrl      String?
  mimeType         String?
  sizeBytes        Int?
  originalFilename String?
```

- [ ] **Step 2: Generate the migration SQL without touching a database**

```bash
mkdir -p prisma/migrations/20260917000000_add_storage_fields
git show HEAD:prisma/schema.prisma > /tmp/schema-before.prisma
npx prisma migrate diff \
  --from-schema-datamodel /tmp/schema-before.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/20260917000000_add_storage_fields/migration.sql
cat prisma/migrations/20260917000000_add_storage_fields/migration.sql
```

Expected content (the exact statements Prisma emits; verify by reading):

```sql
-- AlterTable
ALTER TABLE "Photo" ALTER COLUMN "cloudinaryId" DROP NOT NULL,
ADD COLUMN     "blurDataUrl" TEXT,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "originalFilename" TEXT,
ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sizeBytes" INTEGER,
ADD COLUMN     "storageKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Photo_storageKey_key" ON "Photo"("storageKey");
```

It must contain no `DROP COLUMN` and no `NOT NULL` on the new nullable columns. If the diff output differs in ordering only, keep Prisma's output. Then `npx prisma generate`.

- [ ] **Step 3: Update `src/types/photo.ts`**

```ts
import type { Photo as PrismaPhoto } from "@/generated/prisma/client";

export type Photo = Pick<
  PrismaPhoto,
  | "id"
  | "title"
  | "slug"
  | "cloudinaryId"
  | "storageKey"
  | "blurDataUrl"
  | "format"
  | "tags"
  | "width"
  | "height"
  | "aspectRatio"
  | "location"
  | "caption"
  | "camera"
  | "lens"
  | "focalLength"
  | "aperture"
  | "shutterSpeed"
  | "iso"
  | "filmStock"
  | "filmFormat"
>;
```

- [ ] **Step 4: Allow `published` in PATCH and filter public queries**

In `src/lib/photo-fields.ts` add `"published"` to `PHOTO_EDITABLE_FIELDS` (after `"order"`). In `src/lib/photo-fields.test.ts` extend the first test's input with `published: false` and expect it kept.

In `src/app/page.tsx` change the query to `where: { featured: true, published: true }`. In `src/app/work/page.tsx` add `where: { published: true }`.

- [ ] **Step 5: Keep the POST route test fixture valid for now**

In `src/app/api/admin/photo/route.test.ts` leave `cloudinaryId: "canopus/dunes"` in `validBody` (Task 4 rewrites this file).

- [ ] **Step 6: Verify**

Run: `npm test && npx tsc --noEmit`
Expected: all pass (56 with the extended fixture), tsc clean. `git status --short` shows the schema, migration folder, and four source files. Do not commit. Do not apply the migration.

---

### Task 3: Image route and URL helper

**Files:**
- Create: `src/lib/image-request.ts`, `src/lib/image-request.test.ts`
- Create: `src/lib/photo-url.ts`, `src/lib/photo-url.test.ts`
- Create: `src/app/img/[...key]/route.ts`, `src/app/img/[...key]/route.test.ts`

**Interfaces:**
- Consumes: `getEnv`, `getEdgeCache`, `getWaitUntil` from Task 1.
- Produces: `IMAGE_WIDTHS`, `parseImageRequest(url: URL, accept: string | null): ParsedImageRequest | { error: string; status: 400 }`, `pickFormat(accept: string | null): ImageFormat`.
- Produces: `photoSrc(photo: { storageKey: string | null; cloudinaryId: string | null }, width: ImageWidth): string`.

- [ ] **Step 1: Write the failing helper tests**

`src/lib/image-request.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { IMAGE_WIDTHS, parseImageRequest, pickFormat } from "@/lib/image-request";

const KEY = "photos/0b2b8a6e-1d4f-4c1e-9b2a-3f9e8d7c6b5a.jpg";

describe("pickFormat", () => {
  it("prefers avif, then webp, then jpeg", () => {
    expect(pickFormat("image/avif,image/webp,*/*")).toBe("image/avif");
    expect(pickFormat("image/webp,*/*")).toBe("image/webp");
    expect(pickFormat("*/*")).toBe("image/jpeg");
    expect(pickFormat(null)).toBe("image/jpeg");
  });
});

describe("parseImageRequest", () => {
  it("accepts an allowed width and clamps quality", () => {
    const r = parseImageRequest(new URL(`https://x/img/${KEY}?w=960&q=95`), "image/webp");
    expect(r).toEqual({ key: KEY, width: 960, quality: 90, format: "image/webp" });
  });

  it("defaults quality to 80", () => {
    const r = parseImageRequest(new URL(`https://x/img/${KEY}?w=320`), null);
    expect(r).toMatchObject({ quality: 80, format: "image/jpeg" });
  });

  it("rejects a width outside the allowlist", () => {
    expect(parseImageRequest(new URL(`https://x/img/${KEY}?w=1000`), null)).toEqual({
      error: `w must be one of ${IMAGE_WIDTHS.join(", ")}`,
      status: 400,
    });
  });

  it("rejects a missing width", () => {
    expect(parseImageRequest(new URL(`https://x/img/${KEY}`), null)).toMatchObject({ status: 400 });
  });

  it("rejects keys outside photos/<uuid>.<ext>", () => {
    expect(parseImageRequest(new URL("https://x/img/../secret?w=320"), null)).toMatchObject({ status: 400 });
    expect(parseImageRequest(new URL("https://x/img/photos/evil.exe?w=320"), null)).toMatchObject({ status: 400 });
  });
});
```

`src/lib/photo-url.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { photoSrc } from "@/lib/photo-url";

describe("photoSrc", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the image route when a storageKey exists", () => {
    expect(photoSrc({ storageKey: "photos/a.jpg", cloudinaryId: "old" }, 960)).toBe("/img/photos/a.jpg?w=960");
  });

  it("falls back to Cloudinary while storageKey is null", () => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "demo");
    expect(photoSrc({ storageKey: null, cloudinaryId: "canopus/x" }, 1920)).toBe(
      "https://res.cloudinary.com/demo/image/upload/w_1920,q_auto,f_auto/canopus/x",
    );
  });

  it("returns an empty string when neither source exists", () => {
    expect(photoSrc({ storageKey: null, cloudinaryId: null }, 320)).toBe("");
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/lib/image-request.test.ts src/lib/photo-url.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement the helpers**

`src/lib/image-request.ts`:

```ts
import type { ImageFormat } from "@/lib/cloudflare";

export const IMAGE_WIDTHS = [320, 640, 960, 1280, 1920, 2560] as const;
export type ImageWidth = (typeof IMAGE_WIDTHS)[number];

export const KEY_PATTERN = /^photos\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

export type ParsedImageRequest = {
  key: string;
  width: ImageWidth;
  quality: number;
  format: ImageFormat;
};

export function pickFormat(accept: string | null): ImageFormat {
  const a = accept ?? "";
  if (a.includes("image/avif")) return "image/avif";
  if (a.includes("image/webp")) return "image/webp";
  return "image/jpeg";
}

export function parseImageRequest(
  url: URL,
  accept: string | null,
): ParsedImageRequest | { error: string; status: 400 } {
  const key = decodeURIComponent(url.pathname.replace(/^\/img\//, ""));
  if (!KEY_PATTERN.test(key)) return { error: "invalid image key", status: 400 };

  const width = Number(url.searchParams.get("w"));
  if (!(IMAGE_WIDTHS as readonly number[]).includes(width)) {
    return { error: `w must be one of ${IMAGE_WIDTHS.join(", ")}`, status: 400 };
  }

  const q = url.searchParams.get("q");
  const quality = q === null ? 80 : Math.min(90, Math.max(60, Number(q) || 80));

  return { key, width: width as ImageWidth, quality, format: pickFormat(accept) };
}
```

`src/lib/photo-url.ts`:

```ts
import type { ImageWidth } from "@/lib/image-request";

type Source = { storageKey: string | null; cloudinaryId: string | null };

/**
 * URL for a photo at one of the allowed widths. Prefers R2 via the /img route;
 * falls back to Cloudinary for rows that have not been migrated yet.
 */
export function photoSrc(photo: Source, width: ImageWidth): string {
  if (photo.storageKey) return `/img/${photo.storageKey}?w=${width}`;
  if (photo.cloudinaryId) {
    const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    return `https://res.cloudinary.com/${cloud}/image/upload/w_${width},q_auto,f_auto/${photo.cloudinaryId}`;
  }
  return "";
}
```

- [ ] **Step 4: Write the failing route test**

`src/app/img/[...key]/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getEnv, getEdgeCache, getWaitUntil } = vi.hoisted(() => ({
  getEnv: vi.fn(),
  getEdgeCache: vi.fn(),
  getWaitUntil: vi.fn(),
}));
vi.mock("@/lib/cloudflare", () => ({ getEnv, getEdgeCache, getWaitUntil }));

import { GET } from "./route";

const KEY = "photos/0b2b8a6e-1d4f-4c1e-9b2a-3f9e8d7c6b5a.jpg";
const ctx = { params: Promise.resolve({ key: KEY.split("/") }) };

function req(qs: string, accept = "image/webp") {
  return new Request(`https://x/img/${KEY}${qs}`, { headers: { accept } });
}

function bindings(objectExists = true) {
  const output = { image: () => new Blob(["img"]).stream(), contentType: () => "image/webp", response: () => new Response("img") };
  const transformer = { transform: vi.fn(), output: vi.fn().mockResolvedValue(output) };
  transformer.transform.mockReturnValue(transformer);
  const IMAGES = { input: vi.fn().mockReturnValue(transformer), info: vi.fn() };
  const PHOTOS = {
    get: vi.fn().mockResolvedValue(
      objectExists ? { body: new Blob(["raw"]).stream(), size: 3, httpEtag: '"e"', writeHttpMetadata: vi.fn() } : null,
    ),
    head: vi.fn(), put: vi.fn(), delete: vi.fn(),
  };
  getEnv.mockReturnValue({ PHOTOS, IMAGES });
  return { PHOTOS, IMAGES, transformer };
}

describe("GET /img/[...key]", () => {
  beforeEach(() => {
    getEnv.mockReset(); getEdgeCache.mockReset(); getWaitUntil.mockReset();
    getEdgeCache.mockReturnValue(null);
    getWaitUntil.mockReturnValue(() => {});
  });

  it("returns 400 for a disallowed width without touching the bucket", async () => {
    const { PHOTOS } = bindings();
    const res = await GET(req("?w=999"), ctx);
    expect(res.status).toBe(400);
    expect(PHOTOS.get).not.toHaveBeenCalled();
  });

  it("returns 404 when the object is missing", async () => {
    bindings(false);
    const res = await GET(req("?w=320"), ctx);
    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toContain("max-age=60");
  });

  it("resizes, negotiates the format, and sets immutable caching", async () => {
    const { IMAGES, transformer } = bindings();
    const res = await GET(req("?w=960&q=70", "image/avif,image/webp"), ctx);
    expect(res.status).toBe(200);
    expect(IMAGES.input).toHaveBeenCalledTimes(1);
    expect(transformer.transform).toHaveBeenCalledWith({ width: 960 });
    expect(transformer.output).toHaveBeenCalledWith({ format: "image/avif", quality: 70 });
    expect(res.headers.get("content-type")).toBe("image/avif");
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(res.headers.get("vary")).toBe("Accept");
  });

  it("serves from the edge cache when present", async () => {
    bindings();
    const cached = new Response("cached", { headers: { "content-type": "image/webp" } });
    const cache = { match: vi.fn().mockResolvedValue(cached), put: vi.fn() };
    getEdgeCache.mockReturnValue(cache as unknown as Cache);
    const res = await GET(req("?w=320"), ctx);
    expect(await res.text()).toBe("cached");
    expect(getEnv).not.toHaveBeenCalled();
  });

  it("stores a fresh response in the edge cache via waitUntil", async () => {
    bindings();
    const cache = { match: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined) };
    getEdgeCache.mockReturnValue(cache as unknown as Cache);
    const waitUntil = vi.fn();
    getWaitUntil.mockReturnValue(waitUntil);
    const res = await GET(req("?w=320"), ctx);
    expect(res.status).toBe(200);
    expect(cache.put).toHaveBeenCalledTimes(1);
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 5: Run it to verify it fails**

Run: `npm test -- "src/app/img"`
Expected: FAIL, module not found.

- [ ] **Step 6: Implement `src/app/img/[...key]/route.ts`**

```ts
import { getEdgeCache, getEnv, getWaitUntil } from "@/lib/cloudflare";
import { parseImageRequest } from "@/lib/image-request";

export const dynamic = "force-dynamic";

const IMMUTABLE = "public, max-age=31536000, immutable";

function error(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain", "cache-control": "public, max-age=60" },
  });
}

function cacheKey(request: Request, format: string) {
  // The edge cache ignores Vary for lookups, so fold the negotiated format into the key.
  const url = new URL(request.url);
  url.searchParams.set("f", format);
  return new Request(url.toString(), { method: "GET" });
}

export async function GET(request: Request, _ctx: { params: Promise<{ key: string[] }> }) {
  const parsed = parseImageRequest(new URL(request.url), request.headers.get("accept"));
  if ("error" in parsed) return error(parsed.error, parsed.status);

  const cache = getEdgeCache();
  const key = cacheKey(request, parsed.format);
  if (cache) {
    const hit = await cache.match(key);
    if (hit) return hit;
  }

  const env = getEnv();
  const object = await env.PHOTOS.get(parsed.key);
  if (!object) return error("not found", 404);

  const output = await env.IMAGES.input(object.body)
    .transform({ width: parsed.width })
    .output({ format: parsed.format, quality: parsed.quality });

  const response = new Response(output.image(), {
    status: 200,
    headers: {
      "content-type": parsed.format,
      "cache-control": IMMUTABLE,
      vary: "Accept",
    },
  });

  if (cache) getWaitUntil()(cache.put(key, response.clone()));
  return response;
}
```

`params` is unused because the key is parsed from the URL (route params decode segments individually and would split on `/`); keep the parameter for Next's signature.

- [ ] **Step 7: Verify**

Run: `npm test && npx tsc --noEmit && npx eslint src/lib src/app/img`
Expected: all pass (56 + 5 + 3 + 3 + 5 = 72), tsc clean, no lint errors. If ESLint flags the unused `_ctx`, the leading underscore is the project convention; otherwise add `// eslint-disable-next-line @typescript-eslint/no-unused-vars` above the signature.

- [ ] **Step 8: Check the working tree**

Run: `git status --short`. Do not commit.

---

### Task 4: Upload endpoint, photo create/delete with storage, tagging from R2

**Files:**
- Create: `src/lib/storage.ts`, `src/lib/storage.test.ts`
- Create: `src/app/api/admin/uploads/route.ts`, `src/app/api/admin/uploads/route.test.ts`
- Modify: `src/app/api/admin/photo/route.ts`, `src/app/api/admin/photo/route.test.ts`
- Modify: `src/app/api/admin/photo/[id]/route.ts`, `src/app/api/admin/photo/[id]/route.test.ts`
- Modify: `src/app/api/admin/tags/route.ts`, `src/app/api/admin/tags/route.test.ts`

**Interfaces:**
- Produces in `src/lib/storage.ts`: `ACCEPTED_TYPES`, `MAX_UPLOAD_BYTES = 25 * 1024 * 1024`, `extensionFor(mime): "jpg" | "png" | "webp"`, `newStorageKey(mime): string` (`photos/<crypto.randomUUID()>.<ext>`), `storeImage(env: AppEnv, bytes: ArrayBuffer, mime: string): Promise<StoredImage>` where `StoredImage = { storageKey, width, height, mimeType, sizeBytes, blurDataUrl }`, and `streamOf(bytes: ArrayBuffer): ReadableStream`.
- `POST /api/admin/uploads` (multipart field `file`) → `{ ok, storageKey, width, height, mimeType, sizeBytes, blurDataUrl, originalFilename }`.
- `POST /api/admin/photo` requires `title, slug, storageKey, format, width, height, aspectRatio`; accepts `mimeType, sizeBytes, blurDataUrl, originalFilename, published`; no longer accepts `cloudinaryId`.
- `DELETE /api/admin/photo/[id]` deletes the R2 object after the row (best effort, logged).
- `POST /api/admin/tags` accepts `{ storageKey }` (reads a 1280 px JPEG from R2 and sends it as base64) or `{ imageUrl }` (unchanged).

- [ ] **Step 1: Write the failing storage tests**

`src/lib/storage.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { extensionFor, newStorageKey, storeImage } from "@/lib/storage";

function env() {
  const output = { image: () => new Blob([new Uint8Array([1, 2, 3])]).stream(), contentType: () => "image/webp", response: () => new Response() };
  const transformer = { transform: vi.fn(), output: vi.fn().mockResolvedValue(output) };
  transformer.transform.mockReturnValue(transformer);
  return {
    PHOTOS: { put: vi.fn().mockResolvedValue({}), get: vi.fn(), head: vi.fn(), delete: vi.fn() },
    IMAGES: { input: vi.fn().mockReturnValue(transformer), info: vi.fn().mockResolvedValue({ format: "image/jpeg", fileSize: 10, width: 4000, height: 2667 }) },
    transformer,
  };
}

describe("storage helpers", () => {
  it("maps MIME types to extensions", () => {
    expect(extensionFor("image/jpeg")).toBe("jpg");
    expect(extensionFor("image/png")).toBe("png");
    expect(extensionFor("image/webp")).toBe("webp");
  });

  it("creates keys under photos/ with a uuid", () => {
    expect(newStorageKey("image/png")).toMatch(/^photos\/[0-9a-f-]{36}\.png$/);
  });

  it("stores the object, reads dimensions, and builds a blur placeholder", async () => {
    const e = env();
    const bytes = new Uint8Array([9, 9, 9]).buffer;
    const stored = await storeImage(e, bytes, "image/jpeg");
    expect(stored.storageKey).toMatch(/^photos\/.*\.jpg$/);
    expect(stored).toMatchObject({ width: 4000, height: 2667, mimeType: "image/jpeg", sizeBytes: 3 });
    expect(stored.blurDataUrl).toBe(`data:image/webp;base64,${Buffer.from([1, 2, 3]).toString("base64")}`);
    expect(e.PHOTOS.put).toHaveBeenCalledWith(stored.storageKey, bytes, { httpMetadata: { contentType: "image/jpeg" } });
    expect(e.transformer.transform).toHaveBeenCalledWith({ width: 16 });
  });

  it("rejects images whose dimensions cannot be read", async () => {
    const e = env();
    e.IMAGES.info.mockResolvedValue({ format: "image/jpeg", fileSize: 1 });
    await expect(storeImage(e, new ArrayBuffer(1), "image/jpeg")).rejects.toThrow(/dimensions/);
    expect(e.PHOTOS.put).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails, then implement `src/lib/storage.ts`**

```ts
import type { AppEnv } from "@/lib/cloudflare";

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AcceptedType = (typeof ACCEPTED_TYPES)[number];
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export type StoredImage = {
  storageKey: string;
  width: number;
  height: number;
  mimeType: string;
  sizeBytes: number;
  blurDataUrl: string;
};

export function isAcceptedType(mime: string): mime is AcceptedType {
  return (ACCEPTED_TYPES as readonly string[]).includes(mime);
}

export function extensionFor(mime: string): "jpg" | "png" | "webp" {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export function newStorageKey(mime: string): string {
  return `photos/${crypto.randomUUID()}.${extensionFor(mime)}`;
}

export function streamOf(bytes: ArrayBuffer): ReadableStream {
  return new Blob([bytes]).stream();
}

async function readAll(stream: ReadableStream): Promise<Uint8Array> {
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Reads dimensions, writes the original to R2, and returns a 16 px blur placeholder. */
export async function storeImage(env: AppEnv, bytes: ArrayBuffer, mime: string): Promise<StoredImage> {
  const info = await env.IMAGES.info(streamOf(bytes));
  if (!info.width || !info.height) throw new Error("could not read image dimensions");

  const storageKey = newStorageKey(mime);
  await env.PHOTOS.put(storageKey, bytes, { httpMetadata: { contentType: mime } });

  const tiny = await env.IMAGES.input(streamOf(bytes))
    .transform({ width: 16 })
    .output({ format: "image/webp", quality: 50 });
  const blur = await readAll(tiny.image());
  const blurDataUrl = `data:image/webp;base64,${Buffer.from(blur).toString("base64")}`;

  return { storageKey, width: info.width, height: info.height, mimeType: mime, sizeBytes: bytes.byteLength, blurDataUrl };
}
```

Run: `npm test -- src/lib/storage.test.ts` → 4 pass.

- [ ] **Step 3: Write the failing upload route test**

`src/app/api/admin/uploads/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
const { getEnv, storeImage } = vi.hoisted(() => ({ getEnv: vi.fn(), storeImage: vi.fn() }));
vi.mock("@/lib/cloudflare", () => ({ getEnv }));
vi.mock("@/lib/storage", async (orig) => ({ ...(await orig<typeof import("@/lib/storage")>()), storeImage }));

import { auth } from "@/lib/auth";
import { POST } from "./route";

const mockedAuth = vi.mocked(auth);

function upload(file: File | null) {
  const fd = new FormData();
  if (file) fd.append("file", file);
  return new Request("http://localhost/api/admin/uploads", { method: "POST", body: fd });
}

describe("POST /api/admin/uploads", () => {
  beforeEach(() => {
    mockedAuth.mockReset(); getEnv.mockReset(); storeImage.mockReset();
    getEnv.mockReturnValue({});
  });

  it("rejects unauthenticated requests", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await POST(upload(new File(["x"], "a.jpg", { type: "image/jpeg" })));
    expect(res.status).toBe(401);
    expect(storeImage).not.toHaveBeenCalled();
  });

  it("rejects a missing file", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "E" } } as never);
    const res = await POST(upload(null));
    expect(res.status).toBe(400);
  });

  it("rejects unsupported types", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "E" } } as never);
    const res = await POST(upload(new File(["x"], "a.gif", { type: "image/gif" })));
    expect(res.status).toBe(415);
    expect(storeImage).not.toHaveBeenCalled();
  });

  it("stores the image and returns its metadata", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "E" } } as never);
    storeImage.mockResolvedValue({ storageKey: "photos/k.jpg", width: 10, height: 5, mimeType: "image/jpeg", sizeBytes: 1, blurDataUrl: "data:x" });
    const res = await POST(upload(new File(["x"], "dunes.jpg", { type: "image/jpeg" })));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true, storageKey: "photos/k.jpg", width: 10, height: 5, mimeType: "image/jpeg", sizeBytes: 1, blurDataUrl: "data:x", originalFilename: "dunes.jpg",
    });
  });
});
```

- [ ] **Step 4: Implement `src/app/api/admin/uploads/route.ts`**

```ts
import { apiError, apiOk, handleRouteError } from "@/lib/api";
import { requireAdmin } from "@/lib/require-admin";
import { getEnv } from "@/lib/cloudflare";
import { isAcceptedType, MAX_UPLOAD_BYTES, storeImage } from "@/lib/storage";

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return apiError("file is required", 400);
    if (!isAcceptedType(file.type)) return apiError(`unsupported type ${file.type || "(none)"}`, 415);
    if (file.size > MAX_UPLOAD_BYTES) return apiError("file exceeds 25 MB", 413);

    const stored = await storeImage(getEnv(), await file.arrayBuffer(), file.type);
    return apiOk({ ...stored, originalFilename: file.name });
  } catch (err) {
    return handleRouteError(err);
  }
}
```

Run: `npm test -- "src/app/api/admin/uploads"` → 4 pass.

- [ ] **Step 5: Update `POST /api/admin/photo`**

In `src/app/api/admin/photo/route.ts` replace `cloudinaryId` with `storageKey` in `REQUIRED`, and in `data` replace `cloudinaryId: String(body.cloudinaryId)` with:

```ts
        storageKey: String(body.storageKey),
        mimeType: (body.mimeType as string | null) ?? null,
        sizeBytes: body.sizeBytes === undefined || body.sizeBytes === null ? null : Number(body.sizeBytes),
        blurDataUrl: (body.blurDataUrl as string | null) ?? null,
        originalFilename: (body.originalFilename as string | null) ?? null,
        published: body.published === undefined ? true : Boolean(body.published),
```

Add a check after the format validation: `if (!/^photos\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(String(body.storageKey))) return apiError("invalid storageKey", 400);`

In `route.test.ts`, change the fixture's `cloudinaryId: "canopus/dunes"` to `storageKey: "photos/0b2b8a6e-1d4f-4c1e-9b2a-3f9e8d7c6b5a.jpg"`, update the `toHaveBeenCalledWith` expectation to include `storageKey` and `published: true`, and add a test that `storageKey: "evil"` returns 400 with `create` not called.

- [ ] **Step 6: Delete the object on `DELETE /api/admin/photo/[id]`**

In `src/app/api/admin/photo/[id]/route.ts`:

```ts
import { getEnv } from "@/lib/cloudflare";
// ...
export async function DELETE(_request: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const photo = await db.photo.delete({ where: { id } });
    if (photo.storageKey) {
      try {
        await getEnv().PHOTOS.delete(photo.storageKey);
      } catch (err) {
        console.error(`[photo] row ${id} deleted but object ${photo.storageKey} was not:`, err);
      }
    }
    return apiOk({});
  } catch (err) {
    return handleRouteError(err);
  }
}
```

In the test file add `vi.mock("@/lib/cloudflare", ...)` with a hoisted `PHOTOS.delete` mock; make `del.mockResolvedValue({ storageKey: "photos/k.jpg" })` in the existing DELETE success test and assert `PHOTOS.delete` was called with that key; add a test where the row has `storageKey: null` and the bucket is not called.

- [ ] **Step 7: Tagging from R2**

In `src/app/api/admin/tags/route.ts` accept either input:

```ts
import { getEnv } from "@/lib/cloudflare";
import { KEY_PATTERN } from "@/lib/image-request";
// ...
    const body = (await request.json()) as { imageUrl?: unknown; storageKey?: unknown };
    let imageBlock: Anthropic.ImageBlockParam;
    if (typeof body.storageKey === "string" && KEY_PATTERN.test(body.storageKey)) {
      const env = getEnv();
      const object = await env.PHOTOS.get(body.storageKey);
      if (!object) return apiError("photo not found in storage", 404);
      const out = await env.IMAGES.input(object.body).transform({ width: 1280 }).output({ format: "image/jpeg", quality: 80 });
      const data = Buffer.from(await new Response(out.image()).arrayBuffer()).toString("base64");
      imageBlock = { type: "image", source: { type: "base64", media_type: "image/jpeg", data } };
    } else if (isHttpsUrl(body.imageUrl)) {
      imageBlock = { type: "image", source: { type: "url", url: body.imageUrl } };
    } else {
      return apiError("storageKey or an https imageUrl is required", 400);
    }
```

and use `imageBlock` in `messages[0].content`. Import the type with `import Anthropic from "@anthropic-ai/sdk";` already present (`Anthropic.ImageBlockParam`). Add a test: with `storageKey`, the bucket and Images binding are called and `create` receives a base64 image block with `media_type: "image/jpeg"`; the existing URL tests stay.

- [ ] **Step 8: Verify**

Run: `npm test && npx tsc --noEmit && npx eslint src/lib src/app/api`
Expected: all green. Record the test count. `git status --short`; do not commit.

---

### Task 5: Cloudinary migration endpoint

**Files:**
- Create: `src/app/api/admin/migrate-cloudinary/route.ts`, `src/app/api/admin/migrate-cloudinary/route.test.ts`

**Interfaces:**
- Consumes: `storeImage` (Task 4), `getEnv` (Task 1), `db`.
- Produces: `POST /api/admin/migrate-cloudinary` → `{ ok, migrated: string[], failed: { id: string; error: string }[], remaining: number }`. Idempotent: only rows with `storageKey: null` and a `cloudinaryId` are processed, in `createdAt` order, sequentially.

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
const { getEnv, storeImage, findMany, update } = vi.hoisted(() => ({
  getEnv: vi.fn(), storeImage: vi.fn(), findMany: vi.fn(), update: vi.fn(),
}));
vi.mock("@/lib/cloudflare", () => ({ getEnv }));
vi.mock("@/lib/storage", async (orig) => ({ ...(await orig<typeof import("@/lib/storage")>()), storeImage }));
vi.mock("@/lib/db", () => ({ db: { photo: { findMany, update } } }));

import { auth } from "@/lib/auth";
import { POST } from "./route";

const mockedAuth = vi.mocked(auth);

describe("POST /api/admin/migrate-cloudinary", () => {
  beforeEach(() => {
    mockedAuth.mockReset(); getEnv.mockReset(); storeImage.mockReset(); findMany.mockReset(); update.mockReset();
    getEnv.mockReturnValue({});
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "demo");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("rejects unauthenticated requests", async () => {
    mockedAuth.mockResolvedValue(null as never);
    expect((await POST(new Request("http://x", { method: "POST" }))).status).toBe(401);
  });

  it("copies each unmigrated photo into storage and updates the row", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "E" } } as never);
    findMany.mockResolvedValue([{ id: "p1", cloudinaryId: "canopus/a" }, { id: "p2", cloudinaryId: "canopus/b" }]);
    vi.mocked(fetch).mockResolvedValue(new Response(new Uint8Array([1]), { status: 200, headers: { "content-type": "image/jpeg" } }));
    storeImage.mockResolvedValue({ storageKey: "photos/k.jpg", width: 1, height: 1, mimeType: "image/jpeg", sizeBytes: 1, blurDataUrl: "d" });
    update.mockResolvedValue({});
    const res = await POST(new Request("http://x", { method: "POST" }));
    expect(await res.json()).toEqual({ ok: true, migrated: ["p1", "p2"], failed: [], remaining: 0 });
    expect(fetch).toHaveBeenCalledWith("https://res.cloudinary.com/demo/image/upload/canopus/a");
    expect(update).toHaveBeenCalledWith({ where: { id: "p1" }, data: { storageKey: "photos/k.jpg", width: 1, height: 1, mimeType: "image/jpeg", sizeBytes: 1, blurDataUrl: "d" } });
  });

  it("records failures and keeps going", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "E" } } as never);
    findMany.mockResolvedValue([{ id: "p1", cloudinaryId: "canopus/a" }, { id: "p2", cloudinaryId: "canopus/b" }]);
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("nope", { status: 404 }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1]), { status: 200, headers: { "content-type": "image/jpeg" } }));
    storeImage.mockResolvedValue({ storageKey: "photos/k.jpg", width: 1, height: 1, mimeType: "image/jpeg", sizeBytes: 1, blurDataUrl: "d" });
    update.mockResolvedValue({});
    const body = await (await POST(new Request("http://x", { method: "POST" }))).json();
    expect(body.migrated).toEqual(["p2"]);
    expect(body.failed).toEqual([{ id: "p1", error: "Cloudinary responded 404" }]);
    expect(body.remaining).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails, then implement**

```ts
import { db } from "@/lib/db";
import { apiOk, handleRouteError } from "@/lib/api";
import { requireAdmin } from "@/lib/require-admin";
import { getEnv } from "@/lib/cloudflare";
import { isAcceptedType, storeImage } from "@/lib/storage";

function originalUrl(cloudinaryId: string) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  return `https://res.cloudinary.com/${cloud}/image/upload/${cloudinaryId}`;
}

/** Copies every photo that still lives only on Cloudinary into R2. Safe to re-run. */
export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const env = getEnv();
    const pending = await db.photo.findMany({
      where: { storageKey: null, cloudinaryId: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { id: true, cloudinaryId: true },
    });

    const migrated: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const photo of pending) {
      try {
        const res = await fetch(originalUrl(photo.cloudinaryId!));
        if (!res.ok) throw new Error(`Cloudinary responded ${res.status}`);
        const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim();
        if (!isAcceptedType(mime)) throw new Error(`unsupported type ${mime || "(none)"}`);
        const stored = await storeImage(env, await res.arrayBuffer(), mime);
        await db.photo.update({
          where: { id: photo.id },
          data: {
            storageKey: stored.storageKey,
            width: stored.width,
            height: stored.height,
            mimeType: stored.mimeType,
            sizeBytes: stored.sizeBytes,
            blurDataUrl: stored.blurDataUrl,
          },
        });
        migrated.push(photo.id);
      } catch (err) {
        failed.push({ id: photo.id, error: err instanceof Error ? err.message : String(err) });
      }
    }

    return apiOk({ migrated, failed, remaining: failed.length });
  } catch (err) {
    return handleRouteError(err);
  }
}
```

Run: `npm test -- "src/app/api/admin/migrate-cloudinary"` → 3 pass. Then `npm test && npx tsc --noEmit`. Do not commit.

---

### Task 6: Wire the pages to storage

**Files:**
- Modify: `src/components/Gallery.tsx`
- Modify: `src/app/admin/(protected)/upload/page.tsx`
- Modify: `src/app/admin/(protected)/bulk_upload/page.tsx`
- Modify: `src/app/admin/(protected)/photos/page.tsx`

**Interfaces:**
- Consumes: `photoSrc` (Task 3), `adminFetch`, `/api/admin/uploads`, `/api/admin/tags` with `storageKey`, `/api/admin/migrate-cloudinary`.

No restyling. Keep every existing style object; change only data flow. Do not use `next/image` yet (phase 5).

- [ ] **Step 1: Gallery**

Delete `cloudinaryUrl` in `src/components/Gallery.tsx`; `import { photoSrc } from "@/lib/photo-url";`. Grid image: `src={photoSrc(photo, 960)}`. Lightbox image: `src={photoSrc(photo, 1920)}`.

- [ ] **Step 2: Single upload page**

Replace `uploadToCloudinary` with:

```ts
  const uploadToStorage = async () => {
    if (!file) throw new Error("No file selected");
    const compressed = await imageCompression(file, {
      maxSizeMB: 8,
      maxWidthOrHeight: 4000,
      useWebWorker: true,
      preserveExif: true,
    });
    const formData = new FormData();
    formData.append("file", compressed, file.name);
    const res = await adminFetch("/api/admin/uploads", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error ?? "Upload failed");
    return data as { storageKey: string; width: number; height: number; mimeType: string; sizeBytes: number; blurDataUrl: string; originalFilename: string };
  };
```

Rename state `cloudinaryId` → `storageKey` (`setStorageKey`), add state `stored` holding the full upload response. In `handleUpload`: `const uploaded = await uploadToStorage(); setStored(uploaded); setStorageKey(uploaded.storageKey); setWidth(uploaded.width); setHeight(uploaded.height);` and tag with `getAiTags({ storageKey: uploaded.storageKey })` (change `getAiTags` to take an object and JSON-post it). Remove the `console.log("Cloud name" ...)`. In `handleSave` send `storageKey, mimeType, sizeBytes, blurDataUrl, originalFilename` from `stored` instead of `cloudinaryId`. Every `cloudinaryId &&` render guard becomes `storageKey &&`. Reset `stored`/`storageKey` where the old state was reset.

- [ ] **Step 3: Bulk upload page**

Same replacement for its `uploadToCloudinary(file)` → `uploadToStorage(file)` returning the upload response; `Entry.cloudinaryId` → `storageKey` plus `mimeType`, `sizeBytes`, `blurDataUrl`, `originalFilename` fields on the entry (fill from the response at the point where `result.public_id` was stored); the save body sends those instead of `cloudinaryId`.

- [ ] **Step 4: Photos (library) page**

- Replace `cloudinaryThumb` with `photoSrc(photo, 320)` at both `<img>` sites; the `Photo` type in this file gains `storageKey: string | null; cloudinaryId: string | null`.
- AI tag: post `{ storageKey: photo.storageKey }` when present, else `{ imageUrl: <existing Cloudinary URL> }`.
- Add a migration control in the page header (next to the existing buttons): render only when `photos.some((p) => !p.storageKey)`; a button labelled `MIGRATE FROM CLOUDINARY (${count})` that posts to `/api/admin/migrate-cloudinary` via `adminFetch`, shows "Migrating…" while pending, then reloads the list and shows a one-line result `Migrated N, failed M` (list failed ids and errors below it in the same mono style as other status text). Keep the styling consistent with the page's existing inline style objects.

- [ ] **Step 5: Verify**

Run: `npm test && npx tsc --noEmit && npx eslint src/components src/app/admin` (0 errors; pre-existing warnings about `<img>` remain) and `npm run build` (must succeed). `grep -rn "res.cloudinary.com" src --include=*.tsx --include=*.ts | grep -v generated` must show only `src/lib/photo-url.ts`, the photos page's AI-tag fallback URL, and the migration route. Do not commit.

---

### Task 7: Docs and housekeeping

**Files:**
- Modify: `docs/deploy-cloudflare.md`
- Modify: `README.md`
- Rename: `scripts/*.ts` → `scripts/*.mts` (three files) and update `package.json` scripts and the two imports of `../src/lib/*.ts` (they stay `.ts`, imported from `.mts` files)
- Modify: `.env.example`

- [ ] **Step 1: Storage section in the walkthrough**

Append to `docs/deploy-cloudflare.md`, before "## Rollback":

````markdown
## 7. Storage (R2 + Images)

Do these once, in order.

1. Create the bucket (private by default):
   ```bash
   npx wrangler r2 bucket create canopus-photos
   ```
2. Enable image transformations: dashboard → Images → Transformations → enable for `bycanopus.com`. The Free plan includes 5,000 unique transformations a month; the Worker only requests six fixed widths per photo, so a few hundred photos stay well inside it.
3. Apply the database migration (adds nullable storage columns; existing rows are untouched and stay visible):
   ```bash
   npx prisma migrate deploy
   ```
   This reads `DATABASE_URL` from `.env.local`.
4. Deploy: `npm run deploy`. The dry-run size guard runs as part of the build.
5. Open `/admin/photos` and press **Migrate from Cloudinary**. It copies every original into R2 and fills the storage fields. Re-run it if any fail; it skips finished rows.
6. Verify `/` and `/work`: image URLs now start with `/img/photos/`. Open one in a new tab; the response has `content-type: image/avif` or `image/webp` and `cache-control: public, max-age=31536000, immutable`.
7. Leave Cloudinary alone for a week. The admin rebuild removes the fallback and the `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` variable; delete the Cloudinary account after that.

Local development: `next dev` and `npm run preview` use a local, empty R2 simulation, so existing photos render from Cloudinary and new test uploads only exist on your machine.
````

- [ ] **Step 2: README and env example**

README Admin section: add "Uploads go to Cloudflare R2 and are served from `/img/<key>?w=<width>`; see the walkthrough's Storage section." `.env.example`: mark `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` as "read fallback during the storage migration; removed after".

- [ ] **Step 3: Rename the helper scripts to `.mts`**

```bash
git mv scripts/hash-password.ts scripts/hash-password.mts
git mv scripts/strip-baked-env.ts scripts/strip-baked-env.mts
git mv scripts/check-worker-size.ts scripts/check-worker-size.mts
```

Update `package.json` (`hash-password`, `build:cf`) and README references. This removes Node's `MODULE_TYPELESS_PACKAGE_JSON` warning. Verify: `printf '%s' 'x' | npm run -s hash-password` prints a hash with no warning; `node scripts/check-worker-size.mts` still runs (needs an existing `.open-next`).

- [ ] **Step 4: Check the working tree**

`git status --short`. Do not commit.

---

### Task 8: Phase verification and local Worker smoke test

**Files:** none new.

- [ ] **Step 1: Gates**

Run: `npm test && npx tsc --noEmit && npx eslint src/lib src/app/api src/app/admin src/app/img scripts vitest.config.mts && npm run build:cf`
Expected: all green; the size guard prints a figure under 8192 KiB. Paste outputs.

- [ ] **Step 2: Migration applied (controller step, owner approval required)**

The controller runs `npx prisma migrate deploy` against the production database only after the owner says yes. Implementers never run it. The smoke test below queries the production database, so this must happen first.

- [ ] **Step 3: Local Worker smoke test with a real login and upload**

1. Ensure `.dev.vars` has `DATABASE_URL` (copied from `.env.local` by shell, never printed) and add a local-only admin hash: `printf '%s' 'preview-password' | npm run -s hash-password` → `ADMIN_PASSWORD_HASH=<hash>` and `AUTH_SECRET=local-preview-only-secret`.
2. `npm run preview > /tmp/preview.log 2>&1 &`, wait for `/behind` → 200.
3. Log in with curl:
   ```bash
   J=/tmp/cj; rm -f $J
   CSRF=$(curl -s -c $J -b $J http://localhost:8787/api/auth/csrf | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).csrfToken))")
   curl -s -c $J -b $J -o /dev/null -w '%{http_code}\n' -X POST http://localhost:8787/api/auth/callback/credentials \
     -H 'content-type: application/x-www-form-urlencoded' \
     --data-urlencode "csrfToken=$CSRF" --data-urlencode "password=preview-password" --data-urlencode "json=true"
   curl -s -b $J -o /dev/null -w '%{http_code}\n' http://localhost:8787/api/admin/photos   # expect 200
   ```
4. Upload a real image (use `public/intro.jpg`):
   ```bash
   curl -s -b $J -F "file=@public/intro.jpg;type=image/jpeg" http://localhost:8787/api/admin/uploads
   ```
   Expect `{"ok":true,"storageKey":"photos/....jpg","width":...,"height":...,"blurDataUrl":"data:image/webp;base64,..."}`. Record the key.
5. Fetch it back through the image route:
   ```bash
   curl -s -o /tmp/out.img -w '%{http_code} %{content_type} %{size_download}\n' -H 'accept: image/webp' "http://localhost:8787/img/<key>?w=320"
   curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:8787/img/<key>?w=999"   # 400
   curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:8787/img/photos/00000000-0000-0000-0000-000000000000.jpg?w=320"   # 404
   ```
   Expect 200 with `image/webp` and a small size for the first (local Images honours width and format).
6. Do NOT call `POST /api/admin/photo` or the migration endpoint locally (the local bucket is not the production bucket; a row would point at an object that only exists on this machine).
7. `/work` → 200 with Cloudinary URLs (no rows migrated yet). `grep -iE "error|CompileError" /tmp/preview.log` → nothing relevant. Kill the preview.

- [ ] **Step 4: Report**

Files changed, test count, size-guard figure, smoke-test lines (never env values). Do not commit.
