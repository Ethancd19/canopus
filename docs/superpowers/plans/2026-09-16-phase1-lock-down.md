# Phase 1: Lock Down Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every admin page and admin API route require a session, hash the admin password, fix the broken AI tagging route, and add a Vitest harness so the rest of the project can be tested.

**Architecture:** Auth is enforced in two places: a server `layout.tsx` inside a `src/app/admin/(protected)/` route group redirects unauthenticated page requests, and a `requireAdmin()` helper is the first line of every `/api/admin/*` handler. Shared JSON response helpers replace the copy-pasted try/catch blocks. No `proxy.ts` or `middleware.ts` is added.

**Tech Stack:** Next.js 16.1 App Router, React 19, NextAuth v5 (beta.30), Prisma 7 + Neon adapter, bcryptjs 3, `@anthropic-ai/sdk`, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-16-admin-storage-cloudflare-design.md` (sections: Auth, Error handling, Testing, Phases 1).

## Global Constraints

- **Do not run `git commit` or `git push`.** The repo owner commits themselves. Leave all work as uncommitted changes in the working tree. Where a task step says "Commit", instead run `git status --short` and confirm only the expected files changed.
- Node 26 is installed; `node scripts/foo.ts` runs TypeScript directly (type stripping), no `tsx` needed.
- Path alias `@/*` maps to `./src/*` (see `tsconfig.json`).
- API responses keep the existing shape `{ ok: true, ...data }` on success and `{ ok: false, error: string }` on failure. Existing client pages depend on it.
- Tests live next to code as `*.test.ts` under `src/` and run with `npm test`.
- Model IDs never carry date suffixes: `claude-opus-5`, `claude-haiku-4-5`.
- Every route handler under `src/app/api/admin/` must call `requireAdmin()` before touching the database or any external API.
- Keep the existing inline-style admin pages working. Do not restyle in this phase.

---

### Task 1: Vitest harness and API response helpers

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/api.ts`
- Test: `src/lib/api.test.ts`
- Modify: `package.json` (scripts + devDependency)

**Interfaces:**
- Produces: `apiOk<T extends object>(data: T, init?: ResponseInit): Response` returning JSON `{ ok: true, ...data }`.
- Produces: `apiError(message: string, status: number): Response` returning JSON `{ ok: false, error: message }`.
- Produces: `handleRouteError(err: unknown): Response` returning `apiError(message, 500)` and logging with `console.error`.

- [ ] **Step 1: Install Vitest and add scripts**

```bash
npm install --save-dev vitest
```

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    clearMocks: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

- [ ] **Step 3: Write the failing tests**

`src/lib/api.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { apiOk, apiError, handleRouteError } from "@/lib/api";

describe("apiOk", () => {
  it("returns 200 JSON with ok:true merged with data", async () => {
    const res = apiOk({ photo: { id: "1" } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, photo: { id: "1" } });
  });

  it("accepts a custom status", async () => {
    const res = apiOk({}, { status: 201 });
    expect(res.status).toBe(201);
  });
});

describe("apiError", () => {
  it("returns the status and ok:false with the message", async () => {
    const res = apiError("nope", 401);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: "nope" });
  });
});

describe("handleRouteError", () => {
  it("maps Error instances to a 500 with the message", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = handleRouteError(new Error("boom"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "boom" });
    expect(spy).toHaveBeenCalled();
  });

  it("stringifies non-Error values", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = handleRouteError("weird");
    expect(await res.json()).toEqual({ ok: false, error: "weird" });
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test -- src/lib/api.test.ts`
Expected: FAIL with "Cannot find module '@/lib/api'" or similar.

- [ ] **Step 5: Implement `src/lib/api.ts`**

```ts
import { NextResponse } from "next/server";

export function apiOk<T extends object>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, ...data }, init);
}

export function apiError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export function handleRouteError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error("[api] route error:", err);
  return apiError(message, 500);
}
```

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `npm test -- src/lib/api.test.ts`
Expected: 5 passed.

- [ ] **Step 7: Check the working tree**

Run: `git status --short`
Expected: `package.json`, `package-lock.json`, `vitest.config.ts`, `src/lib/api.ts`, `src/lib/api.test.ts` changed or added. Do not commit.

---

### Task 2: Hashed admin password

**Files:**
- Create: `src/lib/password.ts`
- Create: `scripts/hash-password.ts`
- Modify: `src/lib/auth.ts`
- Test: `src/lib/password.test.ts`
- Modify: `package.json` (script)

**Interfaces:**
- Produces: `hashPassword(plain: string): Promise<string>` (bcrypt, cost 12).
- Produces: `verifyAdminPassword(candidate: string, hash: string | undefined): Promise<boolean>`; returns `false` when `hash` is missing, empty, or `candidate` is empty, without throwing.
- Env var `ADMIN_PASSWORD_HASH` replaces `ADMIN_PASSWORD`.

- [ ] **Step 1: Write the failing tests**

`src/lib/password.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hashPassword, verifyAdminPassword } from "@/lib/password";

describe("password", () => {
  it("verifies a password against its own hash", async () => {
    const hash = await hashPassword("correct horse");
    expect(hash).not.toBe("correct horse");
    expect(await verifyAdminPassword("correct horse", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct horse");
    expect(await verifyAdminPassword("battery staple", hash)).toBe(false);
  });

  it("returns false when the hash is missing or empty", async () => {
    expect(await verifyAdminPassword("anything", undefined)).toBe(false);
    expect(await verifyAdminPassword("anything", "")).toBe(false);
  });

  it("returns false for an empty candidate", async () => {
    const hash = await hashPassword("correct horse");
    expect(await verifyAdminPassword("", hash)).toBe(false);
  });
}, 30_000);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/password.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/lib/password.ts`**

```ts
import bcrypt from "bcryptjs";

const COST = 12;

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, COST);
}

export async function verifyAdminPassword(
  candidate: string,
  hash: string | undefined,
) {
  if (!candidate || !hash) return false;
  try {
    return await bcrypt.compare(candidate, hash);
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test -- src/lib/password.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Create `scripts/hash-password.ts`**

Reads the password from stdin so it never lands in shell history.

```ts
import { createInterface } from "node:readline";
import bcrypt from "bcryptjs";

const rl = createInterface({ input: process.stdin, terminal: false });
let line: string | undefined;
rl.on("line", (l) => {
  if (line === undefined) line = l;
});
rl.on("close", async () => {
  if (!line) {
    console.error("Usage: printf '%s' 'your password' | node scripts/hash-password.ts");
    process.exit(1);
  }
  const hash = await bcrypt.hash(line, 12);
  console.log(hash);
});
```

Add to `package.json` scripts:

```json
"hash-password": "node scripts/hash-password.ts"
```

Verify: `printf '%s' 'test' | npm run -s hash-password` prints a string starting with `$2b$12$`.

- [ ] **Step 6: Update `src/lib/auth.ts`**

Replace the whole file:

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyAdminPassword } from "@/lib/password";

const SEVEN_DAYS = 60 * 60 * 24 * 7;

export const { auth, handlers, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: SEVEN_DAYS },
  providers: [
    Credentials({
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const candidate =
          typeof credentials?.password === "string" ? credentials.password : "";
        const ok = await verifyAdminPassword(
          candidate,
          process.env.ADMIN_PASSWORD_HASH,
        );
        return ok ? { id: "admin", name: "Ethan" } : null;
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
  },
});
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (Prisma client types require `npx prisma generate` to have run; if you see "Module '@prisma/client' has no exported member 'Photo'", run `npx prisma generate` first.)

- [ ] **Step 8: Check the working tree**

Run: `git status --short`
Expected: `src/lib/password.ts`, `src/lib/password.test.ts`, `scripts/hash-password.ts`, `src/lib/auth.ts`, `package.json`. Do not commit.

---

### Task 3: `requireAdmin()` and protected API routes

**Files:**
- Create: `src/lib/require-admin.ts`
- Create: `src/lib/photo-fields.ts`
- Test: `src/lib/require-admin.test.ts`
- Test: `src/lib/photo-fields.test.ts`
- Modify: `src/app/api/admin/photo/route.ts`
- Modify: `src/app/api/admin/photo/[id]/route.ts`
- Modify: `src/app/api/admin/photos/route.ts`
- Test: `src/app/api/admin/photo/route.test.ts`
- Test: `src/app/api/admin/photo/[id]/route.test.ts`
- Test: `src/app/api/admin/photos/route.test.ts`

**Interfaces:**
- Consumes: `apiError`, `apiOk`, `handleRouteError` from Task 1; `auth` from `@/lib/auth`.
- Produces: `requireAdmin(): Promise<Response | null>`; resolves to a 401 `apiError("unauthorized", 401)` when `auth()` returns no session, otherwise `null`.
- Produces: `PHOTO_EDITABLE_FIELDS` (readonly string array) and `pickPhotoFields(body: unknown): Record<string, unknown>` that returns only allowlisted keys.

- [ ] **Step 1: Write the failing `requireAdmin` test**

`src/lib/require-admin.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/require-admin";

const mockedAuth = vi.mocked(auth);

describe("requireAdmin", () => {
  beforeEach(() => mockedAuth.mockReset());

  it("returns a 401 response when there is no session", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await requireAdmin();
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
    expect(await res!.json()).toEqual({ ok: false, error: "unauthorized" });
  });

  it("returns null when a session exists", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    expect(await requireAdmin()).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/lib/require-admin.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/lib/require-admin.ts`**

```ts
import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api";

/**
 * Returns a 401 Response when no admin session exists, otherwise null.
 * Usage in a route handler:
 *   const denied = await requireAdmin(); if (denied) return denied;
 */
export async function requireAdmin(): Promise<Response | null> {
  const session = await auth();
  if (!session?.user) return apiError("unauthorized", 401);
  return null;
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npm test -- src/lib/require-admin.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Write the failing `pickPhotoFields` test**

`src/lib/photo-fields.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { pickPhotoFields } from "@/lib/photo-fields";

describe("pickPhotoFields", () => {
  it("keeps only editable fields", () => {
    const out = pickPhotoFields({
      title: "Dunes",
      featured: true,
      id: "hacked",
      createdAt: "2020-01-01",
      cloudinaryId: "x",
    });
    expect(out).toEqual({ title: "Dunes", featured: true });
  });

  it("returns an empty object for non-object input", () => {
    expect(pickPhotoFields(null)).toEqual({});
    expect(pickPhotoFields("str")).toEqual({});
  });

  it("drops undefined values but keeps null", () => {
    expect(pickPhotoFields({ caption: null, location: undefined })).toEqual({
      caption: null,
    });
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npm test -- src/lib/photo-fields.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 7: Implement `src/lib/photo-fields.ts`**

```ts
export const PHOTO_EDITABLE_FIELDS = [
  "title",
  "slug",
  "format",
  "tags",
  "featured",
  "order",
  "caption",
  "location",
  "takenAt",
  "camera",
  "lens",
  "focalLength",
  "aperture",
  "shutterSpeed",
  "iso",
  "filmStock",
  "filmFormat",
] as const;

export type PhotoEditableField = (typeof PHOTO_EDITABLE_FIELDS)[number];

export function pickPhotoFields(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") return {};
  const src = body as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of PHOTO_EDITABLE_FIELDS) {
    if (key in src && src[key] !== undefined) out[key] = src[key];
  }
  return out;
}
```

- [ ] **Step 8: Run it and confirm it passes**

Run: `npm test -- src/lib/photo-fields.test.ts`
Expected: 3 passed.

- [ ] **Step 9: Write the failing route tests**

`src/app/api/admin/photos/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: { photo: { findMany: vi.fn() } },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { GET } from "./route";

const mockedAuth = vi.mocked(auth);
const findMany = vi.mocked(db.photo.findMany);

describe("GET /api/admin/photos", () => {
  beforeEach(() => {
    mockedAuth.mockReset();
    findMany.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("returns photos when authenticated", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    findMany.mockResolvedValue([{ id: "p1" }] as never);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, photos: [{ id: "p1" }] });
  });
});
```

`src/app/api/admin/photo/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: { photo: { create: vi.fn() } },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { POST } from "./route";

const mockedAuth = vi.mocked(auth);
const create = vi.mocked(db.photo.create);

function req(body: unknown) {
  return new Request("http://localhost/api/admin/photo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  title: "Dunes",
  slug: "dunes",
  cloudinaryId: "canopus/dunes",
  format: "DIGITAL",
  width: 4000,
  height: 2667,
  aspectRatio: 1.5,
};

describe("POST /api/admin/photo", () => {
  beforeEach(() => {
    mockedAuth.mockReset();
    create.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await POST(req(validBody));
    expect(res.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it("creates the photo when authenticated", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    create.mockResolvedValue({ id: "p1", ...validBody } as never);
    const res = await POST(req(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.photo.id).toBe("p1");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "Dunes", width: 4000 }),
      }),
    );
  });

  it("returns 400 when required fields are missing", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    const res = await POST(req({ title: "no slug" }));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});
```

`src/app/api/admin/photo/[id]/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: { photo: { update: vi.fn(), delete: vi.fn() } },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PATCH, DELETE } from "./route";

const mockedAuth = vi.mocked(auth);
const update = vi.mocked(db.photo.update);
const del = vi.mocked(db.photo.delete);
const params = Promise.resolve({ id: "p1" });

function patchReq(body: unknown) {
  return new Request("http://localhost/api/admin/photo/p1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/photo/[id]", () => {
  beforeEach(() => {
    mockedAuth.mockReset();
    update.mockReset();
    del.mockReset();
  });

  it("PATCH rejects unauthenticated requests", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await PATCH(patchReq({ title: "x" }), { params });
    expect(res.status).toBe(401);
    expect(update).not.toHaveBeenCalled();
  });

  it("PATCH only forwards editable fields", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    update.mockResolvedValue({ id: "p1", title: "x" } as never);
    const res = await PATCH(
      patchReq({ title: "x", id: "evil", createdAt: "1999" }),
      { params },
    );
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { title: "x" },
    });
  });

  it("DELETE rejects unauthenticated requests", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await DELETE(new Request("http://localhost"), { params });
    expect(res.status).toBe(401);
    expect(del).not.toHaveBeenCalled();
  });

  it("DELETE removes the photo when authenticated", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    del.mockResolvedValue({} as never);
    const res = await DELETE(new Request("http://localhost"), { params });
    expect(res.status).toBe(200);
    expect(del).toHaveBeenCalledWith({ where: { id: "p1" } });
  });
});
```

- [ ] **Step 10: Run them to verify they fail**

Run: `npm test -- src/app/api/admin`
Expected: FAIL (401 cases fail because routes don't check auth; the 400 case fails; the allowlist case fails).

- [ ] **Step 11: Rewrite `src/app/api/admin/photos/route.ts`**

```ts
import { db } from "@/lib/db";
import { apiOk, handleRouteError } from "@/lib/api";
import { requireAdmin } from "@/lib/require-admin";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const photos = await db.photo.findMany({ orderBy: { createdAt: "desc" } });
    return apiOk({ photos });
  } catch (err) {
    return handleRouteError(err);
  }
}
```

- [ ] **Step 12: Rewrite `src/app/api/admin/photo/route.ts`**

```ts
import { db } from "@/lib/db";
import { apiError, apiOk, handleRouteError } from "@/lib/api";
import { requireAdmin } from "@/lib/require-admin";

const REQUIRED = ["title", "slug", "cloudinaryId", "format", "width", "height", "aspectRatio"] as const;

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const missing = REQUIRED.filter(
      (k) => body[k] === undefined || body[k] === null || body[k] === "",
    );
    if (missing.length > 0) {
      return apiError(`missing required fields: ${missing.join(", ")}`, 400);
    }

    const photo = await db.photo.create({
      data: {
        title: String(body.title),
        slug: String(body.slug),
        cloudinaryId: String(body.cloudinaryId),
        format: body.format as "DIGITAL" | "FILM_35MM" | "FILM_120MM",
        width: Number(body.width),
        height: Number(body.height),
        aspectRatio: Number(body.aspectRatio),
        tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
        featured: Boolean(body.featured ?? false),
        location: (body.location as string | null) ?? null,
        caption: (body.caption as string | null) ?? null,
        camera: (body.camera as string | null) ?? null,
        lens: (body.lens as string | null) ?? null,
        focalLength: (body.focalLength as string | null) ?? null,
        aperture: (body.aperture as string | null) ?? null,
        shutterSpeed: (body.shutterSpeed as string | null) ?? null,
        iso: (body.iso as string | null) ?? null,
        filmStock: (body.filmStock as string | null) ?? null,
        filmFormat: (body.filmFormat as string | null) ?? null,
      },
    });

    return apiOk({ photo });
  } catch (err) {
    return handleRouteError(err);
  }
}
```

- [ ] **Step 13: Rewrite `src/app/api/admin/photo/[id]/route.ts`**

```ts
import { db } from "@/lib/db";
import { apiOk, handleRouteError } from "@/lib/api";
import { requireAdmin } from "@/lib/require-admin";
import { pickPhotoFields } from "@/lib/photo-fields";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const data = pickPhotoFields(await request.json());
    const photo = await db.photo.update({ where: { id }, data });
    return apiOk({ photo });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    await db.photo.delete({ where: { id } });
    return apiOk({});
  } catch (err) {
    return handleRouteError(err);
  }
}
```

If `db.photo.update({ data })` complains about the `Record<string, unknown>` type, cast at the call site: `data: data as Parameters<typeof db.photo.update>[0]["data"]`.

- [ ] **Step 14: Run all tests and type-check**

Run: `npm test && npx tsc --noEmit`
Expected: all pass, no type errors.

- [ ] **Step 15: Check the working tree**

Run: `git status --short`
Expected: the three route files modified, two new lib files, and five new test files. Do not commit.

---

### Task 4: Protected admin layout

**Files:**
- Move: `src/app/admin/upload/page.tsx` → `src/app/admin/(protected)/upload/page.tsx`
- Move: `src/app/admin/bulk_upload/page.tsx` → `src/app/admin/(protected)/bulk_upload/page.tsx`
- Move: `src/app/admin/photos/page.tsx` → `src/app/admin/(protected)/photos/page.tsx`
- Create: `src/app/admin/(protected)/layout.tsx`
- Create: `src/app/admin/(protected)/page.tsx`
- Create: `src/lib/admin-guard.ts`
- Test: `src/lib/admin-guard.test.ts`

**Interfaces:**
- Consumes: `auth` from `@/lib/auth`.
- Produces: `requireAdminPage(): Promise<void>` that calls `redirect("/admin/login")` from `next/navigation` when there is no session. The layout calls it; keeping the logic in a lib file makes it unit-testable.
- URLs do not change: `/admin/upload`, `/admin/bulk_upload`, `/admin/photos` still work. `/admin` now redirects to `/admin/photos`. `/admin/login` stays public.

- [ ] **Step 1: Move the pages with git so history follows**

```bash
mkdir -p "src/app/admin/(protected)"
git mv src/app/admin/upload "src/app/admin/(protected)/upload"
git mv src/app/admin/bulk_upload "src/app/admin/(protected)/bulk_upload"
git mv src/app/admin/photos "src/app/admin/(protected)/photos"
```

- [ ] **Step 2: Write the failing guard test**

`src/lib/admin-guard.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-guard";

const mockedAuth = vi.mocked(auth);

describe("requireAdminPage", () => {
  beforeEach(() => mockedAuth.mockReset());

  it("redirects to the login page without a session", async () => {
    mockedAuth.mockResolvedValue(null as never);
    await expect(requireAdminPage()).rejects.toThrow("REDIRECT:/admin/login");
    expect(redirect).toHaveBeenCalledWith("/admin/login");
  });

  it("resolves quietly with a session", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    await expect(requireAdminPage()).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test -- src/lib/admin-guard.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement `src/lib/admin-guard.ts`**

```ts
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Server-only. Redirects to the login page when no admin session exists. */
export async function requireAdminPage(): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
}
```

- [ ] **Step 5: Run it and confirm it passes**

Run: `npm test -- src/lib/admin-guard.test.ts`
Expected: 2 passed.

- [ ] **Step 6: Create the protected layout and index redirect**

`src/app/admin/(protected)/layout.tsx`:

```tsx
import { requireAdminPage } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();
  return <>{children}</>;
}
```

`src/app/admin/(protected)/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function AdminIndex() {
  redirect("/admin/photos");
}
```

- [ ] **Step 7: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 8: Check the working tree**

Run: `git status --short`
Expected: three renames (shown as `R`), two new files under `(protected)`, `src/lib/admin-guard.ts`, `src/lib/admin-guard.test.ts`. Do not commit.

---

### Task 5: Fix the AI tagging route

**Files:**
- Move: `src/app/api/admin/tag/route.ts` → `src/app/api/admin/tags/route.ts`
- Create: `src/lib/tagging.ts`
- Test: `src/lib/tagging.test.ts`
- Test: `src/app/api/admin/tags/route.test.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `apiOk`, `apiError`, `handleRouteError`.
- Produces: `TAG_OPTIONS` (readonly string array), `TAGGING_PROMPT` (string), `getTaggingModel(): string` (reads `ANTHROPIC_MODEL`, defaults to `"claude-opus-5"`), `parseTagResponse(text: string): TagSuggestion` where `TagSuggestion = { tags: string[]; location: string; caption: string }`.
- Route response shape stays `{ ok: true, tags, location, caption }` so both admin pages keep working unchanged.

- [ ] **Step 1: Move the route directory**

```bash
git mv src/app/api/admin/tag src/app/api/admin/tags
```

- [ ] **Step 2: Write the failing parser tests**

`src/lib/tagging.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { getTaggingModel, parseTagResponse, TAG_OPTIONS } from "@/lib/tagging";

describe("parseTagResponse", () => {
  it("parses clean JSON", () => {
    const out = parseTagResponse(
      '{"tags":["landscape","golden hour"],"location":"Iceland","caption":"Wind over black sand."}',
    );
    expect(out).toEqual({
      tags: ["landscape", "golden hour"],
      location: "Iceland",
      caption: "Wind over black sand.",
    });
  });

  it("strips markdown fences", () => {
    const out = parseTagResponse('```json\n{"tags":["astro"],"location":"","caption":"Stars."}\n```');
    expect(out.tags).toEqual(["astro"]);
  });

  it("drops tags outside the allowed list and lowercases the rest", () => {
    const out = parseTagResponse('{"tags":["Landscape","unicorns"],"location":"","caption":"x"}');
    expect(out.tags).toEqual(["landscape"]);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseTagResponse("not json")).toThrow();
  });

  it("throws when tags is not an array", () => {
    expect(() => parseTagResponse('{"tags":"landscape","location":"","caption":"x"}')).toThrow();
  });

  it("exposes at least the original tag options", () => {
    expect(TAG_OPTIONS).toContain("landscape");
    expect(TAG_OPTIONS).toContain("black and white");
  });
});

describe("getTaggingModel", () => {
  const original = process.env.ANTHROPIC_MODEL;
  afterEach(() => {
    if (original === undefined) delete process.env.ANTHROPIC_MODEL;
    else process.env.ANTHROPIC_MODEL = original;
  });

  it("defaults to claude-opus-5", () => {
    delete process.env.ANTHROPIC_MODEL;
    expect(getTaggingModel()).toBe("claude-opus-5");
  });

  it("honours ANTHROPIC_MODEL", () => {
    process.env.ANTHROPIC_MODEL = "claude-haiku-4-5";
    expect(getTaggingModel()).toBe("claude-haiku-4-5");
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test -- src/lib/tagging.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement `src/lib/tagging.ts`**

```ts
export const TAG_OPTIONS = [
  "landscape",
  "astro",
  "architecture",
  "sports",
  "underwater",
  "street",
  "portrait",
  "nature",
  "urban",
  "abstract",
  "golden hour",
  "blue hour",
  "long exposure",
  "black and white",
  "aerial",
  "macro",
] as const;

export type TagSuggestion = {
  tags: string[];
  location: string;
  caption: string;
};

export const TAGGING_PROMPT = `Analyse this photograph and respond with JSON only, no markdown:
{
  "tags": ["tag1", "tag2"],
  "location": "location if identifiable, empty string if not",
  "caption": "one evocative sentence describing the image"
}

For tags, choose from: ${TAG_OPTIONS.join(", ")}.
Pick 2-4 that genuinely apply. Be precise, not generous.`;

const DEFAULT_MODEL = "claude-opus-5";

export function getTaggingModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

export function parseTagResponse(text: string): TagSuggestion {
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed: unknown = JSON.parse(clean);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("tag response is not an object");
  }
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.tags)) {
    throw new Error("tag response has no tags array");
  }
  const allowed = new Set<string>(TAG_OPTIONS);
  const tags = obj.tags
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => allowed.has(t));
  return {
    tags,
    location: typeof obj.location === "string" ? obj.location : "",
    caption: typeof obj.caption === "string" ? obj.caption : "",
  };
}
```

- [ ] **Step 5: Run it and confirm it passes**

Run: `npm test -- src/lib/tagging.test.ts`
Expected: 8 passed.

- [ ] **Step 6: Write the failing route test**

`src/app/api/admin/tags/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

// vi.mock is hoisted above imports, so the mock fn must be hoisted too.
const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create };
  },
}));

import { auth } from "@/lib/auth";
import { POST } from "./route";

const mockedAuth = vi.mocked(auth);

function req(body: unknown) {
  return new Request("http://localhost/api/admin/tags", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/tags", () => {
  beforeEach(() => {
    mockedAuth.mockReset();
    create.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await POST(req({ imageUrl: "https://example.com/a.jpg" }));
    expect(res.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a non-https imageUrl", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    const res = await POST(req({ imageUrl: "ftp://example.com/a.jpg" }));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns parsed suggestions", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    create.mockResolvedValue({
      content: [
        {
          type: "text",
          text: '{"tags":["street"],"location":"Tokyo","caption":"Neon rain."}',
        },
      ],
    });
    const res = await POST(req({ imageUrl: "https://example.com/a.jpg" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      tags: ["street"],
      location: "Tokyo",
      caption: "Neon rain.",
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                type: "image",
                source: { type: "url", url: "https://example.com/a.jpg" },
              }),
            ]),
          }),
        ],
      }),
    );
  });
});
```

- [ ] **Step 7: Run it to verify it fails**

Run: `npm test -- src/app/api/admin/tags`
Expected: FAIL (401 and 400 cases fail; success case fails on the `ok` key).

- [ ] **Step 8: Rewrite `src/app/api/admin/tags/route.ts`**

```ts
import Anthropic from "@anthropic-ai/sdk";
import { apiError, apiOk, handleRouteError } from "@/lib/api";
import { requireAdmin } from "@/lib/require-admin";
import { getTaggingModel, parseTagResponse, TAGGING_PROMPT } from "@/lib/tagging";

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { imageUrl } = (await request.json()) as { imageUrl?: unknown };
    if (!isHttpsUrl(imageUrl)) {
      return apiError("imageUrl must be an https URL", 400);
    }

    const client = new Anthropic();
    const response = await client.messages.create({
      model: getTaggingModel(),
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: imageUrl } },
            { type: "text", text: TAGGING_PROMPT },
          ],
        },
      ],
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
    const suggestion = parseTagResponse(text);
    return apiOk(suggestion);
  } catch (err) {
    return handleRouteError(err);
  }
}
```

Note: the client is constructed inside the handler so the module can load without `ANTHROPIC_API_KEY` set (needed for tests and builds).

- [ ] **Step 9: Run all tests, type-check, lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all green.

- [ ] **Step 10: Check the working tree**

Run: `git status --short`
Expected: rename of the route dir, modified route, new lib + two tests. Do not commit.

---

### Task 6: Environment documentation

**Files:**
- Create: `.env.example`
- Modify: `.gitignore`
- Modify: `README.md`

- [ ] **Step 1: Un-ignore the example env file**

Append to `.gitignore` after the `.env*` line:

```
!.env.example
```

- [ ] **Step 2: Create `.env.example`**

```
# Neon Postgres connection string (pooled)
DATABASE_URL=

# NextAuth: generate with `openssl rand -base64 32`
AUTH_SECRET=

# bcrypt hash of the admin password: `printf '%s' 'your password' | npm run -s hash-password`
ADMIN_PASSWORD_HASH=

# Anthropic API key for AI tagging
ANTHROPIC_API_KEY=
# Optional. Defaults to claude-opus-5. Cheaper: claude-haiku-4-5
ANTHROPIC_MODEL=

# Resend API key for the contact form
RESEND_API_KEY=

# Cloudinary (until the R2 migration in phase 2)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
```

- [ ] **Step 3: Replace `README.md` boilerplate**

Replace the whole file with:

````markdown
# Canopus

Photography portfolio. Next.js 16, Prisma 7 on Neon Postgres, NextAuth v5.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the values
npx prisma generate
npm run dev
```

### Admin password

The admin login compares against a bcrypt hash in `ADMIN_PASSWORD_HASH`:

```bash
printf '%s' 'your password' | npm run -s hash-password
```

Paste the output into `.env.local` (and into your host's environment settings).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Prisma generate + Next dev server |
| `npm run build` | Production build |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest in watch mode |
| `npm run lint` | ESLint |
| `npm run hash-password` | Hash an admin password from stdin |

## Admin

- `/admin/login` is public. Everything else under `/admin` requires a session.
- Every `/api/admin/*` route returns `401 { ok: false, error: "unauthorized" }` without a session.

## Design docs

- `docs/superpowers/specs/` holds design specs.
- `docs/superpowers/plans/` holds implementation plans.
````

- [ ] **Step 4: Verify the example file is tracked and README renders**

Run: `git status --short .env.example README.md .gitignore`
Expected: `.env.example` shows as untracked (`??`), meaning the ignore exception works. Do not commit.

---

### Task 7: Phase verification

**Files:** none new.

- [ ] **Step 1: Full test, type, lint pass**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all green. Paste the summary lines in the report.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: succeeds. Public pages are dynamic (`revalidate = 0`) so the build does not need a live database. If the build fails because `DATABASE_URL` is unset at module load, report the exact error rather than working around it.

- [ ] **Step 3: Confirm no admin route is unguarded**

Run:

```bash
grep -L "requireAdmin" $(find src/app/api/admin -name route.ts)
```

Expected: no output (every route file mentions `requireAdmin`).

- [ ] **Step 4: Confirm no reference to the old env var or route remains**

Run:

```bash
grep -rn "ADMIN_PASSWORD\b\|api/admin/tag\"" src || echo "clean"
```

Expected: `clean` (only `ADMIN_PASSWORD_HASH` and `/api/admin/tags` are referenced).

- [ ] **Step 5: Report**

List every file changed (`git status --short`), the test count, and any deviations from this plan. Do not commit.
