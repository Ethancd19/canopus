# Phase 4a: Admin Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three inline-styled admin pages with a coherent admin: Tailwind theme on the site's tokens, shared primitives, a sidebar shell with sign-out, a restyled login, a public footer with the admin link, drafts, an upload queue that creates draft rows, a rebuilt library with an edit drawer, and removal of every Cloudinary remnant.

**Architecture:** Tailwind 4 utilities (theme + utilities layers only, no preflight) mapped to the existing CSS variables. Admin pages are thin server wrappers around client components under `src/components/admin/`, built from primitives in `src/components/ui/`. The upload endpoint now creates the draft row so nothing is ever orphaned; the queue and the drawer both edit rows through the existing `PATCH /api/admin/photo/[id]`. Cloudinary code, the migration endpoint, and the `cloudinaryId` column go away (schema step 4).

**Tech Stack:** Next.js 16.3.5 App Router on Cloudflare Workers, React 19, Tailwind 4.2, `motion/react` (already installed) for the drawer, NextAuth v5, Prisma 7.10 (workerd client), Vitest 5 + `@testing-library/react` + `jsdom` for component tests.

**Spec:** `docs/superpowers/specs/2026-09-16-admin-storage-cloudflare-design.md` — sections Admin UI (Design plan, Routes and behaviour, Shared primitives), Upload flow, Data model, Phases 4a.

## Global Constraints

- **Do not run `git commit` or `git push`.** Where a task says "Commit", run `git status --short` instead.
- **No Cloudflare login/deploy.** `npm run preview` is allowed only in Task 8.
- **Never run `prisma migrate deploy/dev`, `db push`, or `db execute`.** Migration SQL is written to disk; the controller applies it with the owner's approval.
- Never print values from `.env.local` or `.dev.vars`.
- New devDependencies allowed: `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`. No new runtime dependencies (`motion/react` provides `AnimatePresence`, `motion`, `Reorder`).
- **Design plan is binding** (spec → Admin UI → Design plan): DM Mono 12–13 px sentence case for UI text; Cormorant Garamond light for page and photo titles; copper only on publish state and the primary button; no shadows, no rounded card kit (max `rounded-sm` on inputs/buttons), no entrance animations; sentence-case copy with persistent verbs ("Upload photos", "Publish", "Save changes", "Delete photo"). Tracked uppercase only on `Badge`.
- Tailwind classes only in new/rebuilt admin code; no new inline style objects. Public components keep their inline styles except where a task says otherwise.
- Every `/api/admin/*` handler calls `requireAdmin()` first; responses stay `{ ok: true, ... }` / `{ ok: false, error }`.
- Tests: `src/**/*.test.{ts,tsx}` via `npm test` (currently 94, pristine). Component tests declare `// @vitest-environment jsdom` at the top of the file. `npx tsc --noEmit` clean. Scoped lint `npx eslint src scripts vitest.config.mts` at 0 errors (pre-existing warnings in `Gallery.tsx`/`BehindClient.tsx`/`ContactClient.tsx` are acceptable).
- Keep each task's working tree green (tests, tsc) before reporting.

---

### Task 1: Tailwind theme and component test harness

**Files:**
- Modify: `src/app/globals.css`
- Modify: `vitest.config.mts`
- Modify: `package.json` (devDependencies via npm)
- Create: `src/test/setup.ts`
- Create: `src/components/ui/Button.tsx`, `src/components/ui/Button.test.tsx`

**Interfaces:**
- Produces Tailwind utilities for tokens: colors `navy`, `navy-mid`, `navy-light`, `text`, `muted`, `faint`, `copper`, `ice`, `success`, `danger`; fonts `font-serif`, `font-mono`.
- Produces `Button` (used by every later task): `props: { variant?: "primary" | "secondary" | "danger" | "ghost"; size?: "sm" | "md"; loading?: boolean } & ButtonHTMLAttributes`.

- [ ] **Step 1: Install test deps**

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Wire Tailwind without preflight**

At the top of `src/app/globals.css`, after the Google Fonts `@import`, add:

```css
@import "tailwindcss/theme" layer(theme);
@import "tailwindcss/utilities" layer(utilities);

@theme {
  --color-navy: #0e1824;
  --color-navy-mid: #111f2e;
  --color-navy-light: #162536;
  --color-text: #d4dce8;
  --color-muted: #7a8fa8;
  --color-faint: #3a5068;
  --color-copper: #c9a96e;
  --color-ice: #a8c5da;
  --color-success: #5dbb8a;
  --color-danger: #e07070;
  --font-serif: "Cormorant Garamond", serif;
  --font-mono: "DM Mono", monospace;
}
```

Leave every existing rule in the file untouched. Preflight is deliberately not imported: the file already resets the site and preflight would change the public pages.

- [ ] **Step 3: Vitest setup for components**

`src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());
```

In `vitest.config.mts` add `setupFiles: ["./src/test/setup.ts"]` under `test` (keep `environment: "node"` as the default; component tests opt into jsdom per file).

- [ ] **Step 4: Write the failing Button test**

`src/components/ui/Button.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders its label and forwards props", () => {
    render(<Button type="submit">Save changes</Button>);
    const b = screen.getByRole("button", { name: "Save changes" });
    expect(b).toHaveAttribute("type", "submit");
    expect(b.className).toContain("bg-copper");
  });

  it("is disabled and marked busy while loading", () => {
    render(<Button loading>Publishing</Button>);
    const b = screen.getByRole("button");
    expect(b).toBeDisabled();
    expect(b).toHaveAttribute("aria-busy", "true");
  });

  it("applies the variant classes", () => {
    render(<Button variant="danger">Delete photo</Button>);
    expect(screen.getByRole("button").className).toContain("text-danger");
  });
});
```

- [ ] **Step 5: Run to verify it fails, then implement `Button`**

```tsx
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  loading?: boolean;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm font-mono whitespace-nowrap select-none " +
  "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const variants = {
  primary: "bg-copper text-navy hover:bg-copper/90",
  secondary: "border border-text/15 text-text hover:border-text/40 bg-transparent",
  danger: "border border-danger/40 text-danger hover:bg-danger/10 bg-transparent",
  ghost: "text-muted hover:text-text bg-transparent",
} as const;

const sizes = { sm: "h-8 px-3 text-[12px]", md: "h-9 px-4 text-[13px]" } as const;

export function Button({ variant = "primary", size = "md", loading = false, className = "", children, disabled, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <span aria-hidden className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />}
      {children}
    </button>
  );
}
```

- [ ] **Step 6: Verify**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: 97 tests; tsc clean; build succeeds. Confirm the public site's markup is unaffected by grepping the built CSS for `bg-copper` only once Button is used (it is not yet used by a page, so the class may not even be emitted — that is fine).

---

### Task 2: UI primitives

**Files:**
- Create under `src/components/ui/`: `Input.tsx`, `Textarea.tsx`, `Select.tsx`, `Field.tsx`, `TagInput.tsx`, `Toggle.tsx`, `Badge.tsx`, `Drawer.tsx`, `Dropzone.tsx`
- Tests: `TagInput.test.tsx`, `Toggle.test.tsx`, `Dropzone.test.tsx`, `Drawer.test.tsx`, `Badge.test.tsx`

**Interfaces (exact):**
- `Input`, `Textarea`, `Select`: thin wrappers forwarding all native props plus `invalid?: boolean`. Classes: `w-full rounded-sm bg-navy-mid border border-text/10 px-3 font-mono text-[13px] text-text placeholder:text-faint focus:border-ice/60 focus:outline-none` (+ `h-9` for Input/Select, `min-h-24 py-2` for Textarea; `border-danger/60` when invalid). `Select` renders native `<select>` with `children` options.
- `Field({ label, hint?, error?, htmlFor?, children })`: label in `font-mono text-[12px] text-muted` (sentence case), control below, hint `text-faint text-[11px]`, error `text-danger text-[11px]`.
- `TagInput({ value: string[]; onChange(next: string[]); suggestions?: string[]; placeholder? })`: chips + text input; Enter or comma adds (trimmed, lowercased, deduped), Backspace on empty removes last, click × removes; suggestions filtered by the typed prefix shown in a small list, click to add. Chip: `bg-navy-light text-text text-[12px] px-2 py-0.5 rounded-sm`.
- `Toggle({ checked: boolean; onChange(next: boolean); label: string; disabled? })`: `role="switch"`, `aria-checked`; track `h-5 w-9 rounded-full` copper when on, `bg-faint` when off; label in mono 12 px.
- `Badge({ tone: "draft" | "published" | "featured"; children })`: `text-[10px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm border`; draft `text-muted border-text/15`; published `text-copper border-copper/40`; featured `text-ice border-ice/40`.
- `Drawer({ open: boolean; onClose(); title: string; children; footer? })`: fixed right panel `w-[440px] max-w-full h-full bg-navy-mid border-l border-text/10 flex flex-col`, header with the title in `font-serif text-2xl font-light text-text` and a close button, scrollable body, sticky footer; backdrop `bg-navy/60` click closes; Escape closes; slides in with `motion` (`x: 440 → 0`, 200 ms) and respects `prefers-reduced-motion` (no transform, opacity only). On open, focus moves to the panel; on close, focus returns to the previously focused element.
- `Dropzone({ onFiles(files: File[]); accept: string; multiple?: boolean; children })`: a `<label>` wrapping a hidden `<input type="file">`; drag-over adds `border-copper/60`; drop and change both call `onFiles` with only files whose type matches `accept` (comma list). Base: `flex flex-col items-center justify-center gap-2 border border-dashed border-text/20 rounded-sm p-10 text-muted cursor-pointer hover:border-copper/60`.

- [ ] **Step 1: Write the failing tests** (all files start with `// @vitest-environment jsdom`)

`TagInput.test.tsx`:
```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TagInput } from "@/components/ui/TagInput";

describe("TagInput", () => {
  it("adds a trimmed lowercase tag on Enter and dedupes", () => {
    const onChange = vi.fn();
    render(<TagInput value={["street"]} onChange={onChange} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "  Golden Hour " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith(["street", "golden hour"]);
    fireEvent.change(input, { target: { value: "street" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith(["street"]);
  });

  it("removes the last tag on Backspace when empty and by clicking a chip's remove", () => {
    const onChange = vi.fn();
    render(<TagInput value={["a", "b"]} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Backspace" });
    expect(onChange).toHaveBeenLastCalledWith(["a"]);
    fireEvent.click(screen.getByRole("button", { name: "Remove a" }));
    expect(onChange).toHaveBeenLastCalledWith(["b"]);
  });

  it("shows matching suggestions and adds on click", () => {
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} suggestions={["landscape", "long exposure", "macro"]} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "l" } });
    expect(screen.getByText("landscape")).toBeInTheDocument();
    expect(screen.queryByText("macro")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("long exposure"));
    expect(onChange).toHaveBeenLastCalledWith(["long exposure"]);
  });
});
```

`Toggle.test.tsx`:
```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Toggle } from "@/components/ui/Toggle";

describe("Toggle", () => {
  it("is a switch that reports the next value", () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Featured on home page" />);
    const s = screen.getByRole("switch", { name: "Featured on home page" });
    expect(s).toHaveAttribute("aria-checked", "false");
    fireEvent.click(s);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
```

`Dropzone.test.tsx`:
```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dropzone } from "@/components/ui/Dropzone";

describe("Dropzone", () => {
  it("passes only accepted files from a drop", () => {
    const onFiles = vi.fn();
    render(<Dropzone onFiles={onFiles} accept="image/jpeg,image/png">Drop photos here</Dropzone>);
    const zone = screen.getByText("Drop photos here").closest("label")!;
    const jpg = new File(["x"], "a.jpg", { type: "image/jpeg" });
    const gif = new File(["x"], "b.gif", { type: "image/gif" });
    fireEvent.drop(zone, { dataTransfer: { files: [jpg, gif], types: ["Files"] } });
    expect(onFiles).toHaveBeenCalledWith([jpg]);
  });

  it("passes files chosen with the input", () => {
    const onFiles = vi.fn();
    render(<Dropzone onFiles={onFiles} accept="image/jpeg">Drop photos here</Dropzone>);
    const input = screen.getByLabelText("Drop photos here") as HTMLInputElement;
    const jpg = new File(["x"], "a.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [jpg] } });
    expect(onFiles).toHaveBeenCalledWith([jpg]);
  });
});
```

`Drawer.test.tsx`:
```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Drawer } from "@/components/ui/Drawer";

describe("Drawer", () => {
  it("renders title and children when open and closes on Escape", () => {
    const onClose = vi.fn();
    render(<Drawer open onClose={onClose} title="Edit photo"><p>Body</p></Drawer>);
    expect(screen.getByRole("dialog", { name: "Edit photo" })).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("renders nothing when closed", () => {
    render(<Drawer open={false} onClose={() => {}} title="Edit photo"><p>Body</p></Drawer>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
```

`Badge.test.tsx`: renders `<Badge tone="draft">Draft</Badge>` and asserts text and `uppercase` class; `tone="published"` contains `text-copper`.

- [ ] **Step 2: Run to verify they fail, then implement the primitives** to the interfaces above. `Drawer` uses `AnimatePresence`/`motion.div` from `motion/react` and `useReducedMotion`; render `null` when closed (outside `AnimatePresence`, so the closed test passes synchronously). Give the panel `role="dialog" aria-modal="true" aria-labelledby=<title id>`.

- [ ] **Step 3: Verify**

Run: `npm test && npx tsc --noEmit && npx eslint src/components/ui`
Expected: all green (97 + 10 = 107 tests approximately; report the real number).

---

### Task 3: Admin shell, sign out, login, footer

**Files:**
- Create: `src/components/admin/AdminShell.tsx`, `src/components/admin/AdminShell.test.tsx`
- Create: `src/components/PolarisMark.tsx` (extracted from `Nav.tsx`, which then imports it)
- Create: `src/app/admin/actions.ts`
- Modify: `src/app/admin/(protected)/layout.tsx`
- Modify: `src/app/admin/(protected)/page.tsx` (placeholder heading "Library" until Task 6)
- Modify: `src/app/admin/(protected)/photos/page.tsx` → replace content with `redirect("/admin")`
- Modify: `src/app/admin/login/page.tsx` → server component; Create: `src/components/admin/LoginForm.tsx`
- Create: `src/components/Footer.tsx`; Modify: `src/components/HomeClient.tsx`, `WorkClient.tsx`, `BehindClient.tsx`, `ContactClient.tsx` (append `<Footer />` at the end of each page wrapper)

**Interfaces:**
- `AdminShell({ children })` (client): `<div className="min-h-screen bg-navy text-text flex">` with `<aside className="w-[200px] shrink-0 border-r border-text/10 flex flex-col p-5 gap-6">` containing the Polaris mark + "Canopus" (reuse the SVG from `Nav.tsx` by extracting `PolarisMarkIcon` into `src/components/PolarisMark.tsx` and importing it in both), nav links (`Library` → `/admin`, `Upload` → `/admin/upload`) with the active one in `text-text` and others in `text-muted hover:text-text`, then at the bottom `View site` (`/`, `target="_blank"`) and a sign-out `<form action={signOutAction}>` with a ghost `Button` "Sign out". `<main className="flex-1 min-w-0 px-8 py-7 max-w-[1400px]">{children}</main>`. Active link uses `usePathname()`.
- `signOutAction` in `src/app/admin/actions.ts`: `"use server"; export async function signOutAction() { await signOut({ redirectTo: "/admin/login" }); }` importing `signOut` from `@/lib/auth`.
- Login: `src/app/admin/login/page.tsx` becomes a server component: `const session = await auth(); if (session?.user) redirect("/admin"); return <LoginForm />;`. `LoginForm` (client) keeps the current sign-in logic (`signIn("credentials", { password, redirect: false })`, on success `router.push("/admin")`) but is built from `Field`, `Input`, `Button`: centered column max-w-[360px]; `font-serif text-3xl font-light` "Canopus", mono muted line "Sign in to manage photos", password field, primary button "Sign in", inline error "That password didn't match." in `text-danger`.
- `Footer({ tone = "dark" })` (client or server; no hooks needed): `<footer>` with a hairline top border, mono 11 px; left "© 2026 Ethan Duval", right links `Work`, `Behind`, `Contact` spaced with `gap-6` (no separators), then `Admin` at `opacity-40`. `tone="light"` swaps to the slate-on-light colors used at the end of the home page (`#2A3A4A` text on the light background). Inline styles are acceptable in this one public component so it matches its neighbours; keep it under 60 lines.

- [ ] **Step 1: Write the failing shell test**

`AdminShell.test.tsx` (jsdom): mock `next/navigation` `usePathname` → `/admin/upload`; render `<AdminShell><p>child</p></AdminShell>`; assert links "Library" and "Upload" exist, "Upload" has `aria-current="page"`, the child renders, and a button "Sign out" exists. (Mock `@/app/admin/actions` to `{ signOutAction: vi.fn() }`.)

- [ ] **Step 2: Implement**, then wire the layout:

```tsx
// src/app/admin/(protected)/layout.tsx
import { requireAdminPage } from "@/lib/admin-guard";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return <AdminShell>{children}</AdminShell>;
}
```

- [ ] **Step 3: Footer on public pages**; on `HomeClient` decide `tone` by reading where the footer lands (the page ends on the light slate background, so pass `tone="light"`); the other three pages are dark.

- [ ] **Step 4: Verify**

`npm test && npx tsc --noEmit && npx eslint src && npm run build`. Then `npm run dev` on a spare port, and with curl confirm `/admin/login` → 200, `/admin` → 307 to login, `/` and `/work` and `/behind` and `/contact` all → 200 and contain `href="/admin"`. Kill the dev server. Do not commit.

---

### Task 4: Drafts, upload creates the row, Cloudinary removal (schema step 4)

**Files:**
- Modify: `prisma/schema.prisma`; Create: `prisma/migrations/20260917100000_drafts_and_drop_cloudinary/migration.sql`
- Create: `src/lib/slug.ts`, `src/lib/slug.test.ts`, `src/lib/exif.ts`, `src/lib/exif.test.ts`
- Modify: `src/app/api/admin/uploads/route.ts` (+test)
- Delete: `src/app/api/admin/photo/route.ts` (+test), `src/app/api/admin/migrate-cloudinary/` (route + test)
- Modify: `src/app/api/admin/tags/route.ts` (+test): storageKey only
- Modify: `src/lib/photo-url.ts` (+test): `photoSrc({ storageKey }: { storageKey: string }, width)`; drop the fallback and the env read
- Modify: `src/types/photo.ts` (drop `cloudinaryId`), `src/lib/photo-fields.test.ts` if it references `cloudinaryId`
- Delete: `src/app/admin/(protected)/upload/page.tsx`, `src/app/admin/(protected)/bulk_upload/`
- Modify: `src/app/admin/(protected)/photos/page.tsx` already redirects (Task 3); ensure no file still references `cloudinaryId`, `migrate-cloudinary`, or `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- Modify: `.env.example`, `docs/deploy-cloudflare.md` (remove the Cloudinary variable and the fallback notes; add the step-4 migration to section 7 as "8. After a week: `npx prisma migrate deploy` drops the Cloudinary column; then delete the Cloudinary account")
- Modify: `src/components/Gallery.tsx` only if it references `cloudinaryId` (it should only call `photoSrc`)

**Interfaces:**
- Schema: `published Boolean @default(false)`; `cloudinaryId` removed; `storageKey String @unique` (required). Migration generated schema-to-schema (`prisma migrate diff --from-schema-datamodel <HEAD schema> --to-schema-datamodel prisma/schema.prisma --script`); expected statements: `ALTER TABLE "Photo" DROP COLUMN "cloudinaryId"`, `ALTER COLUMN "published" SET DEFAULT false`, `ALTER COLUMN "storageKey" SET NOT NULL`. Not applied by the implementer.
- `titleFromFilename("IMG_0042-dunes at dusk.JPG") === "IMG 0042 dunes at dusk"`; `slugify("Dunes at Dusk!") === "dunes-at-dusk"`; `uniqueSlug(base, exists: (slug) => Promise<boolean>)` appends `-2`, `-3`, … up to 50 tries.
- `mapExif(raw: Record<string, unknown>): ExifFields` where `ExifFields = { camera?: string; lens?: string; focalLength?: string; aperture?: string; shutterSpeed?: string; iso?: string; takenAt?: string }` — move the existing mapping logic from the old upload page (`exifr` output keys `Make`, `Model`, `LensModel`, `FocalLength`, `FNumber`, `ExposureTime`, `ISO`, `DateTimeOriginal`) into this pure function, formatting shutter as `1/250` for sub-second exposures and `2s` otherwise, focal length as `50mm`, aperture as `2.8`.
- `POST /api/admin/uploads` multipart: `file` (required) plus optional text fields `camera, lens, focalLength, aperture, shutterSpeed, iso, takenAt, format, force`. Behaviour: auth → content-length/type/size checks (unchanged) → duplicate check: if `force !== "1"` and a photo exists with the same `originalFilename` and `sizeBytes`, return `apiError("already uploaded as <title>", 409)` with `{ ok: false, error, existingId }` → `storeImage` → row create `{ title: titleFromFilename, slug: uniqueSlug, storageKey, width, height, aspectRatio, mimeType, sizeBytes, blurDataUrl, originalFilename, format: format in enum ? format : "DIGITAL", published: false, tags: [], ...exif }` → if create throws, delete the object and rethrow → `apiOk({ photo })`. Tests: 409 path (`findFirst` mocked), force bypass, row created with `published: false` and a slug, object deleted when `create` rejects.
- Tags route: body `{ storageKey }` only; 400 otherwise. Tests updated.

- [ ] **Step 1: Write failing tests for `slug`, `exif`, the new upload behaviour, tags** — then implement. Delete the removed routes/pages and their tests. Update `photo-url` and its tests.

- [ ] **Step 2: Generate the migration SQL** with the diff command (use `git show HEAD:prisma/schema.prisma` as the from-schema), read it, and confirm it has exactly the three statements above (order may differ). Run `npx prisma generate`.

- [ ] **Step 3: Grep gates**

`grep -rn "cloudinary" src docs README.md .env.example --exclude-dir=generated -i` must return nothing except the historical migration SQL files under `prisma/migrations/` and the docs line that says the column is dropped.

- [ ] **Step 4: Verify** `npm test && npx tsc --noEmit && npx eslint src && npm run build`. Do not commit; do not apply the migration.

---

### Task 5: Upload queue

**Files:**
- Create: `src/components/admin/UploadQueue.tsx`, `src/components/admin/useUploadQueue.ts`, `src/components/admin/useUploadQueue.test.ts`, `src/components/admin/PhotoFields.tsx`
- Create: `src/app/admin/(protected)/upload/page.tsx` (server: heading + `<UploadQueue />`)
- Create: `src/lib/admin-api.ts` (typed client helpers: `uploadPhoto(file, fields)`, `patchPhoto(id, data)`, `deletePhoto(id)`, `tagPhoto(storageKey)`, `listPhotos()`), `src/lib/admin-api.test.ts`

**Interfaces:**
- `useUploadQueue()` (pure state machine, testable with mocked `admin-api`): items `{ localId, file, previewUrl, status: "queued" | "compressing" | "uploading" | "tagging" | "ready" | "published" | "failed" | "duplicate", error?, photo?: Photo, existingId? }`; `add(files)`, `retry(localId)`, `remove(localId)` (DELETEs the row if one exists), `uploadAnyway(localId)` (retries with `force`), `publish(localId)`, `publishAll()`; runs at most 3 uploads concurrently; per item: compress (`browser-image-compression`, 4000 px / 8 MB, preserve EXIF) → read EXIF (`exifr.parse`) → `mapExif` → `uploadPhoto` → on 409 mark `duplicate` → on success `tagging`: `tagPhoto(storageKey)` then `patchPhoto` with suggestions only for empty fields (tags when empty, caption when empty, location when empty), failures in tagging are non-fatal → `ready`.
- `PhotoFields({ photo, onChange(partial), suggestions })`: the shared edit form used by the queue rows and the library drawer: `title` (Input), `slug` (read-only mono text under the title), `tags` (TagInput), `format` (Select: Digital / 35mm film / 120 film), film-only `filmStock`, `filmFormat` (shown when format ≠ DIGITAL), `location`, `caption` (Textarea), `featured` (Toggle "Featured on home page"), EXIF group (camera, lens, focal length, aperture, shutter, ISO as small inputs in a 3-column grid). Calls `onChange` with the partial on blur/commit.
- `UploadQueue` UI: page title "Upload photos" (serif), one-line mono helper "Drop JPEG, PNG, or WebP files. Each becomes a draft you can publish here or from the library."; `Dropzone` on top (compact once items exist); toolbar with "Publish all ready (N)" primary button and counts; list rows: 96 px thumbnail (object-cover), `PhotoFields` in the middle, a status column on the right (mono muted text: "Compressing", "Uploading", "Tagging with AI", "Draft" badge + "Publish" secondary button, "Published" badge, or the error with "Retry"/"Upload anyway"/"Remove"). Each field change PATCHes after 500 ms debounce with a tiny "Saved" confirmation in the status column.

- [ ] **Step 1: Write failing tests for `admin-api` (fetch mocked via `adminFetch` mock) and `useUploadQueue`** (jsdom, `renderHook` from testing-library, mocks for `browser-image-compression`, `exifr`, and `@/lib/admin-api`): adds files as queued, processes at most 3 at a time, marks `duplicate` on 409 and `ready` on success, `publish` PATCHes `{ published: true }`, `remove` calls `deletePhoto` when a row exists.

- [ ] **Step 2: Implement** the hook, the form, the page.

- [ ] **Step 3: Verify** `npm test && npx tsc --noEmit && npx eslint src && npm run build`.

---

### Task 6: Library

**Files:**
- Create: `src/components/admin/Library.tsx`, `src/components/admin/PhotoDrawer.tsx`, `src/components/admin/useLibrary.ts`, `src/components/admin/useLibrary.test.ts`
- Modify: `src/app/admin/(protected)/page.tsx` → heading "Library" + `<Library />`

**Interfaces:**
- `useLibrary()`: loads `listPhotos()`; state `search`, `format` (all/DIGITAL/FILM_35MM/FILM_120MM), `state` (all/drafts/published/featured/untagged), `view` ("grid" | "list", persisted in `localStorage` key `canopus.admin.view`, wrapped in try/catch); derived `filtered`; actions `update(id, partial)` (optimistic + PATCH, rollback on failure), `remove(id)` (DELETE), `togglePublished(id)`, `toggleFeatured(id)`; `allTags` derived for `TagInput` suggestions.
- `Library`: toolbar (search Input, two Selects, view toggle as two ghost Buttons, count "16 photos · 3 drafts" written as "16 photos, 3 drafts"); grid: `grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]`, each tile a `<button>` with the image (`photoSrc(photo, 640)`, `aspect-[3/2] object-cover`, blur placeholder via inline `backgroundImage: url(blurDataUrl)` which is the one allowed inline style), title in serif below, `Badge` draft when unpublished, small featured badge; list view: rows with 64 px thumb, title, tags, format, state. Empty state: "No photos match. Clear the filters or upload some." Loading: mono "Loading photos".
- `PhotoDrawer({ photo, onClose, onSave, onDelete, onTogglePublished, suggestions })`: `Drawer` titled with the photo title; body: 3:2 preview (`photoSrc(photo, 960)`), `PhotoFields` bound to a local draft copy; footer: `Delete photo` (danger, asks "Delete this photo? This also removes the file." via a second click state "Confirm delete"), then `Unpublish`/`Publish` (secondary), then `Save changes` (primary, disabled when clean). Unsaved changes: closing with dirty state asks "Discard unsaved changes?" (a small inline confirm in the footer, not `window.confirm`). Keyboard: Esc closes (or prompts when dirty), Cmd/Ctrl+S saves.

- [ ] **Step 1: Failing `useLibrary` tests** (jsdom + mocked `admin-api`): filters by state and search, optimistic update with rollback on failure, view persistence.

- [ ] **Step 2: Implement** and wire the page.

- [ ] **Step 3: Verify** `npm test && npx tsc --noEmit && npx eslint src && npm run build`.

---

### Task 7: Docs

**Files:** `README.md`, `docs/deploy-cloudflare.md`

- README Admin section: describe the two pages (Library, Upload), drafts, sign out, and that the footer links to `/admin`. Remove any mention of bulk upload or Cloudinary.
- Walkthrough section 7: replace steps 5–7 (migrate button, Cloudinary wait) with the final state: "8. Apply the final migration (drops the Cloudinary column, uploads default to drafts): `npx prisma migrate deploy`, then `npm run deploy`. Delete the Cloudinary account afterwards." Keep 1–4 and 6.

---

### Task 8: Verification and local smoke test

- [ ] **Step 1: Gates** `npm test && npx tsc --noEmit && npx eslint src scripts vitest.config.mts && npm run build:cf` (0 lint errors; size guard passes).
- [ ] **Step 2: Migration** — controller applies `20260917100000_drafts_and_drop_cloudinary` with the owner's explicit approval (it drops a column). Implementers stop here if it is not applied; the smoke test needs the new default.
- [ ] **Step 3: Smoke** (`npm run preview`, `.dev.vars` has DATABASE_URL and the preview password hash): log in with curl as in phase 3; `GET /admin` → 200 and contains "Library"; `GET /admin/upload` → 200; `GET /admin/login` with the session cookie → 307 to `/admin`; upload `public/intro.jpg` with `-F camera=Test` → 200 with `photo.published === false`, a slug, and `camera: "Test"`; upload the same file again → 409; `-F force=1` → 200; `PATCH /api/admin/photo/<id>` `{ published: true }` → 200; `GET /work` on the preview lists the new `/img/photos/<key>` (it reads the production database, so the row is real); **then DELETE both created rows** via `/api/admin/photo/<id>` and confirm `GET /api/admin/photos` no longer lists them (the objects only ever existed in the local bucket). `GET /api/auth/signout` flow: POST to the sign-out action is exercised in the shell test; skip here. Kill the preview.
- [ ] **Step 4: Report** files, test count, size-guard figure, smoke lines.
