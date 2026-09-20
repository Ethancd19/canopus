# Phase 5: Public Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public site fast and complete: a responsive hero, `next/image` tiles, a split gallery with the approved tile refinements, lightbox navigation, public collection pages, and statically cached pages that refresh in the background.

**Architecture:** The public pages keep their inline-style, `motion/react` character. `Gallery.tsx` is split into `src/components/gallery/*` with a filter hook and a lightbox that owns navigation. A custom `next/image` loader points at the existing `/img` route, and the six served widths are mirrored in `next.config.ts`. Public data access moves into `src/lib/public-queries.ts` so pages stay thin and testable. OpenNext's R2 incremental cache plus the memory queue turn `/`, `/work`, and `/work/[slug]` into static pages with `revalidate = 60`.

**Tech Stack:** Next.js 16.3 App Router, React 19 (React Compiler lint rules), `motion/react` 12, `motion-plus` `ScrambleText`, Prisma 7 over Neon HTTP, `@opennextjs/cloudflare` 1.20, `sharp` (new dev dependency, local script only), Vitest 5 + Testing Library (jsdom per file).

**Spec:** `docs/superpowers/specs/2026-09-16-admin-storage-cloudflare-design.md` → "Public site" (decided 2026-09-19).

## Global Constraints

- **Do not run `git commit` or `git push`.** Where a task says "Commit", run `git status --short` instead.
- **No Cloudflare login/deploy.** `npm run preview` only in Task 8.
- **Never run `prisma migrate deploy/dev`, `db push`, or `db execute`.** Migration SQL is generated schema-to-schema (`prisma migrate diff --from-schema <HEAD schema copy> --to-schema prisma/schema.prisma --script`) and applied by the controller with the owner's approval. It is additive.
- Never print values from `.env.local` or `.dev.vars`.
- **Photos are only resized and encoded.** No crop, filter, overlay, grain, colour treatment, or `object-fit: cover` on a photo (the hero is the one exception: it is a full-bleed background today and stays one). Masonry, true aspect ratios, the reveal animation, and the hover zoom stay.
- Public components use the existing inline-style conventions and colour values found in `Gallery.tsx`/`WorkClient.tsx` (navy `#0E1824`, text `#D4DCE8`, copper `#B87333`, panel `#111F2E`); do not introduce Tailwind classes into public components.
- Copy is sentence case, plain verbs. Empty-state messages in `constants.ts` are kept verbatim.
- Bare `<button>` elements must set `background: "transparent"` (no preflight).
- React Compiler rules: no conditional hooks, no `setState` synchronously inside an effect, no ref reads during render.
- Tests: `src/**/*.test.{ts,tsx}` via `npm test` (386 pristine at start); `npx tsc --noEmit` clean; `npx eslint src scripts vitest.config.mts` with 0 errors once Task 2 lands (the pre-existing `Gallery.tsx:586` error disappears with the split).
- `next build` prerenders `/` and `/work`, so it needs `DATABASE_URL` from `.env.local` (already present locally).

---

### Task 1: Image loader and Next image config

**Files:**
- Create: `src/lib/image-loader.ts`, `src/lib/image-loader.test.ts`
- Create: `src/lib/gallery-layout.ts`, `src/lib/gallery-layout.test.ts`
- Modify: `next.config.ts`

**Interfaces:**
- Consumes: `IMAGE_WIDTHS`, `ImageWidth` from `src/lib/image-request.ts`.
- Produces: `default function imageLoader({ src, width }: { src: string; width: number; quality?: number }): string`; `export function snapWidth(width: number): ImageWidth` (smallest allowed width ≥ requested, else the largest); `export const GALLERY_COLUMNS = { wide: 4, desktop: 3, tablet: 2, phone: 1 }`; `export const GALLERY_BREAKPOINTS = { wide: 1600, tablet: 1024, phone: 640 }`; `export const GALLERY_GAP = "6px"`; `export const GALLERY_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (min-width: 1600px) 25vw, 33vw"`.

- [ ] **Step 1: Write the failing loader tests**

```ts
// src/lib/image-loader.test.ts
import { describe, it, expect } from "vitest";
import imageLoader, { snapWidth } from "@/lib/image-loader";

describe("snapWidth", () => {
  it("returns the smallest allowed width at or above the request", () => {
    expect(snapWidth(1)).toBe(320);
    expect(snapWidth(320)).toBe(320);
    expect(snapWidth(321)).toBe(640);
    expect(snapWidth(1000)).toBe(1280);
  });
  it("caps at the largest allowed width", () => {
    expect(snapWidth(4000)).toBe(2560);
  });
});

describe("imageLoader", () => {
  it("builds an /img URL with a snapped width and ignores quality", () => {
    expect(imageLoader({ src: "photos/abc.jpg", width: 700, quality: 50 })).toBe("/img/photos/abc.jpg?w=960");
  });
});
```

- [ ] **Step 2: Run, expect failure** — `npx vitest run src/lib/image-loader.test.ts` fails with "Cannot find module".

- [ ] **Step 3: Implement**

```ts
// src/lib/image-loader.ts
"use client";

import { IMAGE_WIDTHS, type ImageWidth } from "@/lib/image-request";

/** Smallest served width that is at least `width`; the largest when none is. */
export function snapWidth(width: number): ImageWidth {
  for (const w of IMAGE_WIDTHS) if (w >= width) return w;
  return IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
}

/**
 * next/image loader. `src` is the photo's storageKey (e.g. "photos/<uuid>.jpg").
 * Quality is fixed server-side at 80, so it is ignored here on purpose.
 */
export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  return `/img/${src}?w=${snapWidth(width)}`;
}
```

```ts
// src/lib/gallery-layout.ts
/** Column counts and breakpoints shared by the grid CSS and the `sizes` hint. */
export const GALLERY_COLUMNS = { wide: 4, desktop: 3, tablet: 2, phone: 1 } as const;
export const GALLERY_BREAKPOINTS = { wide: 1600, tablet: 1024, phone: 640 } as const;
export const GALLERY_GAP = "6px";
export const GALLERY_SIZES =
  `(max-width: ${GALLERY_BREAKPOINTS.phone}px) 100vw, ` +
  `(max-width: ${GALLERY_BREAKPOINTS.tablet}px) 50vw, ` +
  `(min-width: ${GALLERY_BREAKPOINTS.wide}px) 25vw, 33vw`;
```

```ts
// src/lib/gallery-layout.test.ts
import { it, expect } from "vitest";
import { GALLERY_SIZES } from "@/lib/gallery-layout";

it("orders the sizes hint from narrowest to widest with a 33vw default", () => {
  expect(GALLERY_SIZES).toBe("(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (min-width: 1600px) 25vw, 33vw");
});
```

Add to `next.config.ts` inside `nextConfig`:

```ts
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    // Mirror the widths /img serves so next/image never asks for another.
    deviceSizes: [640, 960, 1280, 1920, 2560],
    imageSizes: [320],
    qualities: [80],
  },
```

- [ ] **Step 4: Run** — `npx vitest run src/lib/image-loader.test.ts src/lib/gallery-layout.test.ts` passes; `npx tsc --noEmit` clean; `npm run build` succeeds (the config is validated at build).

- [ ] **Step 5: Commit** — `git status --short`.

---

### Task 2: Gallery split with tile refinements and `next/image` tiles

**Files:**
- Create: `src/components/gallery/constants.ts`, `useGalleryFilter.ts` (+ `useGalleryFilter.test.ts`), `GalleryFilters.tsx`, `EmptyState.tsx`, `PhotoCard.tsx`, `GalleryGrid.tsx`, `Lightbox.tsx`, `Gallery.tsx` (+ `Gallery.test.tsx`)
- Delete: `src/components/Gallery.tsx`
- Modify: `src/components/HomeClient.tsx:7`, `src/components/WorkClient.tsx:5` (import path only)

**Interfaces:**
- Consumes: Task 1 (`GALLERY_*`, the loader through `next/image`).
- Produces: `export default function Gallery({ photos, theme = "dark", showFilters = true }: { photos: Photo[]; theme?: "dark" | "light"; showFilters?: boolean })`; `export function useGalleryFilter(photos: Photo[]): { filtered: Photo[]; activeFormat: string; activeGenre: string; setFormat(f: string): void; setGenre(g: string): void; emptyMessage: string }`; `Lightbox` props `{ photos: Photo[]; index: number; onClose(): void; onNavigate(index: number): void; returnFocusTo: HTMLElement | null }` (navigation is wired in Task 3; this task moves the component as-is behind the new props with `index` resolving the photo).

- [ ] **Step 1: Move code without behaviour change.** From the old `Gallery.tsx`: lines 9–98 (types, `FORMAT_LABELS`, `ALL_FORMATS`, `ALL_GENRES`, `EMPTY_MESSAGES`, `CHEEKY_MESSAGES`, `pickRandom`, `tc`, `LIGHT`, `DARK`) → `constants.ts` (export everything). Lines 100–202 (`MiniExif`, `ExifBar`) and 283–320 (`MetaRow`) and 321–565 (`ExpandedPhoto`) → `Lightbox.tsx` (rename `ExpandedPhoto` to `Lightbox`, a **named** export, take `photos` + `index`, derive `const photo = photos[index]`). Lines 204–281 (`PhotoCard`) → `PhotoCard.tsx`. The filter bar JSX → `GalleryFilters.tsx` with props `{ theme, activeFormat, activeGenre, onFormat, onGenre }`. The empty branch → `EmptyState.tsx` with props `{ theme, message }`. The grid branch → `GalleryGrid.tsx` with props `{ photos, onOpen(index, el) }`.

- [ ] **Step 2: Write the failing hook test**

```ts
// src/components/gallery/useGalleryFilter.test.ts
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGalleryFilter } from "@/components/gallery/useGalleryFilter";
import { EMPTY_MESSAGES, CHEEKY_MESSAGES } from "@/components/gallery/constants";
import type { Photo } from "@/types/photo";

const photo = (id: string, format: Photo["format"], tags: string[]): Photo =>
  ({ id, title: id, slug: id, storageKey: `photos/${id}.jpg`, blurDataUrl: null, format, tags, width: 3, height: 2,
     aspectRatio: 1.5, location: null, caption: null, camera: null, lens: null, focalLength: null, aperture: null,
     shutterSpeed: null, iso: null, filmStock: null, filmFormat: null }) as Photo;

const photos = [photo("a", "DIGITAL", ["landscape"]), photo("b", "FILM_35MM", ["portrait"])];

describe("useGalleryFilter", () => {
  it("starts unfiltered with a deterministic first message", () => {
    const { result } = renderHook(() => useGalleryFilter(photos));
    expect(result.current.filtered).toHaveLength(2);
    expect(result.current.emptyMessage).toBe(EMPTY_MESSAGES[0]);
  });
  it("filters by format label and genre tag, case-insensitively", () => {
    const { result } = renderHook(() => useGalleryFilter(photos));
    act(() => result.current.setFormat("35mm"));
    expect(result.current.filtered.map((p) => p.id)).toEqual(["b"]);
    act(() => result.current.setGenre("Portrait"));
    expect(result.current.filtered.map((p) => p.id)).toEqual(["b"]);
  });
  it("picks a new message when a filter empties the grid and a cheeky one after two in a row", () => {
    const { result } = renderHook(() => useGalleryFilter(photos));
    act(() => result.current.setGenre("street"));
    expect(EMPTY_MESSAGES).toContain(result.current.emptyMessage);
    act(() => result.current.setFormat("120"));
    expect(CHEEKY_MESSAGES).toContain(result.current.emptyMessage);
  });
});
```

- [ ] **Step 3: Implement the hook** (this replaces the mount effect that set state; the first message is deterministic so server and client render the same HTML):

```ts
// src/components/gallery/useGalleryFilter.ts
"use client";

import { useRef, useState } from "react";
import { ALL_FORMATS, CHEEKY_MESSAGES, EMPTY_MESSAGES, FORMAT_LABELS, pickRandom } from "@/components/gallery/constants";
import type { Photo } from "@/types/photo";

function matches(p: Photo, format: string, genre: string): boolean {
  const fmtMatch = format === "All" || FORMAT_LABELS[p.format] === format;
  const genreMatch = genre === "All" || p.tags.map((t) => t.toLowerCase()).includes(genre.toLowerCase());
  return fmtMatch && genreMatch;
}

export function useGalleryFilter(photos: Photo[]) {
  const [activeFormat, setActiveFormat] = useState<string>(ALL_FORMATS[0]);
  const [activeGenre, setActiveGenre] = useState<string>("All");
  const [emptyMessage, setEmptyMessage] = useState<string>(EMPTY_MESSAGES[0]);
  const historyRef = useRef<string[]>([EMPTY_MESSAGES[0]]);
  const consecutiveEmptyRef = useRef(0);

  const filtered = photos.filter((p) => matches(p, activeFormat, activeGenre));

  const afterChange = (format: string, genre: string) => {
    const empty = !photos.some((p) => matches(p, format, genre));
    if (!empty) {
      consecutiveEmptyRef.current = 0;
      return;
    }
    consecutiveEmptyRef.current += 1;
    const pool = consecutiveEmptyRef.current >= 2 ? CHEEKY_MESSAGES : EMPTY_MESSAGES;
    const msg = pickRandom(pool, historyRef.current, 3);
    historyRef.current = [...historyRef.current, msg];
    setEmptyMessage(msg);
  };

  const setFormat = (f: string) => { setActiveFormat(f); afterChange(f, activeGenre); };
  const setGenre = (g: string) => { setActiveGenre(g); afterChange(activeFormat, g); };

  return { filtered, activeFormat, activeGenre, setFormat, setGenre, emptyMessage };
}
```

- [ ] **Step 4: `PhotoCard` with `next/image`.** Keep the `motion.div`, reveal transition, hover scale, and the format badge exactly. Replace the aspect-ratio padding box and `motion.img` with the following. Pass `loader={imageLoader}` explicitly (as well as the `loaderFile` config) so the component builds `/img` URLs in Vitest too, where `next.config.ts` is not loaded:

```tsx
import Image from "next/image";
import imageLoader from "@/lib/image-loader";
import { GALLERY_SIZES } from "@/lib/gallery-layout";
// inside the card, in place of the padded box + <motion.img>:
<Image
  loader={imageLoader}
  src={photo.storageKey}
  alt={photo.title}
  width={photo.width}
  height={photo.height}
  sizes={GALLERY_SIZES}
  placeholder={photo.blurDataUrl ? "blur" : "empty"}
  blurDataURL={photo.blurDataUrl ?? undefined}
  draggable={false}
  style={{
    display: "block",
    width: "100%",
    height: "auto",
    transition: "transform 0.6s ease",
    transform: hovered ? "scale(1.03)" : "scale(1)",
  }}
/>
```

Make the card keyboard-operable: on the outer `motion.div` add `role="button"`, `tabIndex={0}`, `aria-label={\`Open ${photo.title}\`}`, and `onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(photo, e.currentTarget); } }}`; `onClick={(e) => onClick(photo, e.currentTarget)}`. `onClick` prop type becomes `(p: Photo, el: HTMLElement) => void`. Give it a visible focus style: `outline: "1px solid rgba(212,220,232,0.35)"` on `:focus-visible` via a small `<style>` in `GalleryGrid` targeting `[data-photo-card]:focus-visible`.

- [ ] **Step 5: `GalleryGrid` with the approved columns and gaps.** Replace the `columns` style and inline `<style>`:

```tsx
import { GALLERY_BREAKPOINTS as B, GALLERY_COLUMNS as C, GALLERY_GAP } from "@/lib/gallery-layout";
<motion.div key="grid" layout style={{ columns: `var(--gallery-cols, ${C.desktop})`, columnGap: GALLERY_GAP }}>
  <style>{`
    @media (min-width: ${B.wide}px)   { :root { --gallery-cols: ${C.wide}; } }
    @media (max-width: ${B.tablet}px) { :root { --gallery-cols: ${C.tablet}; } }
    @media (max-width: ${B.phone}px)  { :root { --gallery-cols: ${C.phone}; } }
    [data-photo-card]:focus-visible { outline: 1px solid rgba(212,220,232,0.35); outline-offset: 2px; }
  `}</style>
  {photos.map((photo, i) => (
    <div key={photo.id} style={{ marginBottom: GALLERY_GAP, breakInside: "avoid" }}>
      <PhotoCard photo={photo} index={i} onClick={(p, el) => onOpen(i, el)} />
    </div>
  ))}
</motion.div>
```

- [ ] **Step 6: `Gallery.tsx` composition.** State: `const [active, setActive] = useState<{ index: number; el: HTMLElement | null } | null>(null)`; `const { filtered, ...filter } = useGalleryFilter(photos)`; render `GalleryFilters` only when `showFilters`; `EmptyState` when `filtered.length === 0`; else `GalleryGrid photos={filtered} onOpen={(index, el) => setActive({ index, el })}`; `<AnimatePresence>{active && <Lightbox photos={filtered} index={active.index} onClose={() => setActive(null)} onNavigate={(index) => setActive({ index, el: active.el })} returnFocusTo={active.el} />}</AnimatePresence>`.

- [ ] **Step 7: Component test**

```tsx
// src/components/gallery/Gallery.test.tsx
// @vitest-environment jsdom
import { it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Gallery from "@/components/gallery/Gallery";
import type { Photo } from "@/types/photo";

vi.mock("motion-plus/react", () => ({ ScrambleText: ({ children }: { children: string }) => <span>{children}</span> }));

const photos = [
  { id: "a", title: "Dunes", slug: "dunes", storageKey: "photos/a.jpg", blurDataUrl: null, format: "DIGITAL", tags: ["landscape"], width: 3, height: 2, aspectRatio: 1.5 },
  { id: "b", title: "Rain", slug: "rain", storageKey: "photos/b.jpg", blurDataUrl: null, format: "FILM_35MM", tags: ["street"], width: 2, height: 3, aspectRatio: 0.667 },
] as unknown as Photo[];

it("renders a tile per photo with a snapped /img src and opens the lightbox on Enter", () => {
  render(<Gallery photos={photos} />);
  const tiles = screen.getAllByRole("button", { name: /^Open / });
  expect(tiles).toHaveLength(2);
  expect(screen.getByAltText("Dunes").getAttribute("src")).toMatch(/^\/img\/photos\/a\.jpg\?w=\d+$/);
  fireEvent.keyDown(tiles[1], { key: "Enter" });
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Rain" })).toBeInTheDocument();
});

it("hides the filter bar when showFilters is false", () => {
  render(<Gallery photos={photos} showFilters={false} />);
  expect(screen.queryByRole("button", { name: "Digital" })).toBeNull();
});
```

Add `role="dialog"`, `aria-modal="true"`, and `aria-label={photo.title}` to the Lightbox's outer `motion.div` in this task (navigation itself is Task 3).

- [ ] **Step 8: Wire imports, delete the old file.** `HomeClient.tsx` and `WorkClient.tsx` import `Gallery from "@/components/gallery/Gallery"`. Delete `src/components/Gallery.tsx`.

- [ ] **Step 9: Run** — `npm test`, `npx tsc --noEmit`, `npx eslint src` → 0 errors (the old 586 error is gone). `npm run build` succeeds.

- [ ] **Step 10: Commit** — `git status --short`.

---

### Task 3: Lightbox navigation

**Files:**
- Modify: `src/components/gallery/Lightbox.tsx`
- Create: `src/components/gallery/Lightbox.test.tsx`, `src/components/gallery/useLightboxNavigation.ts` (+ `useLightboxNavigation.test.ts`)

**Interfaces:**
- Consumes: Task 2 `Lightbox` props.
- Produces: `export function useLightboxNavigation({ count, index, onNavigate, onClose }): { prev(): void; next(): void; onPointerDown(e: React.PointerEvent): void; onPointerUp(e: React.PointerEvent): void }`; `export const SWIPE_THRESHOLD_PX = 60`.

- [ ] **Step 1: Hook test**

```ts
// src/components/gallery/useLightboxNavigation.test.ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLightboxNavigation } from "@/components/gallery/useLightboxNavigation";

function setup(index = 1, count = 3) {
  const onNavigate = vi.fn();
  const onClose = vi.fn();
  const hook = renderHook(() => useLightboxNavigation({ count, index, onNavigate, onClose }));
  return { hook, onNavigate, onClose };
}

describe("useLightboxNavigation", () => {
  it("ArrowRight/ArrowLeft move with wrap-around, Escape closes", () => {
    const { onNavigate, onClose } = setup(2, 3);
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" })); });
    expect(onNavigate).toHaveBeenLastCalledWith(0);
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" })); });
    expect(onNavigate).toHaveBeenLastCalledWith(1);
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); });
    expect(onClose).toHaveBeenCalled();
  });
  it("a horizontal drag beyond the threshold navigates; a short one does not", () => {
    const { hook, onNavigate } = setup(0, 2);
    act(() => hook.result.current.onPointerDown({ clientX: 200, clientY: 10 } as React.PointerEvent));
    act(() => hook.result.current.onPointerUp({ clientX: 100, clientY: 12 } as React.PointerEvent));
    expect(onNavigate).toHaveBeenLastCalledWith(1);
    act(() => hook.result.current.onPointerDown({ clientX: 100, clientY: 10 } as React.PointerEvent));
    act(() => hook.result.current.onPointerUp({ clientX: 130, clientY: 10 } as React.PointerEvent));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
  it("does nothing with a single photo", () => {
    const { hook, onNavigate } = setup(0, 1);
    act(() => hook.result.current.next());
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Implement**

```ts
// src/components/gallery/useLightboxNavigation.ts
"use client";

import { useEffect, useRef } from "react";
import type { PointerEvent } from "react";

export const SWIPE_THRESHOLD_PX = 60;

export function useLightboxNavigation({
  count, index, onNavigate, onClose,
}: { count: number; index: number; onNavigate: (i: number) => void; onClose: () => void }) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const prev = () => { if (count > 1) onNavigate((index - 1 + count) % count); };
  const next = () => { if (count > 1) onNavigate((index + 1) % count); };

  const latest = useRef({ prev, next, onClose });
  useEffect(() => { latest.current = { prev, next, onClose }; });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") latest.current.next();
      else if (e.key === "ArrowLeft") latest.current.prev();
      else if (e.key === "Escape") latest.current.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onPointerDown = (e: PointerEvent) => { start.current = { x: e.clientX, y: e.clientY }; };
  const onPointerUp = (e: PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) next(); else prev();
  };
  return { prev, next, onPointerDown, onPointerUp };
}
```

- [ ] **Step 3: Wire the Lightbox.** In `Lightbox.tsx`: call the hook; attach `onPointerDown`/`onPointerUp` to the image container (`touch-action: pan-y` style so vertical scroll still works); add two arrow buttons (mono `‹` and `›`, same style as the existing Close button, `aria-label="Previous photo"`/`"Next photo"`, hidden when `photos.length < 2`, `background: "transparent"`) at the bottom of the side panel next to Close; when `index` changes reset `loaded` via `key={photo.id}` on the image element rather than an effect; preload neighbours:

```ts
useEffect(() => {
  if (photos.length < 2) return;
  const urls = [photos[(index + 1) % photos.length], photos[(index - 1 + photos.length) % photos.length]]
    .map((p) => photoSrc(p, 1920));
  const imgs = urls.map((u) => { const i = new window.Image(); i.src = u; return i; });
  return () => { imgs.forEach((i) => { i.src = ""; }); };
}, [photos, index]);
```

Body scroll lock and focus return:

```ts
useEffect(() => {
  const previous = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => {
    document.body.style.overflow = previous;
    if (returnFocusTo?.isConnected) returnFocusTo.focus();
  };
}, [returnFocusTo]);
```

Reduced motion: `const reduced = useReducedMotion();` and pass `transition={{ duration: reduced ? 0 : 0.25 }}` (and `0.3`, `0.4` counterparts) on the three motion elements. Apply the same to `PhotoCard`'s reveal (`duration: reduced ? 0 : 0.5, delay: reduced ? 0 : index * 0.035`).

- [ ] **Step 4: Lightbox test**

```tsx
// src/components/gallery/Lightbox.test.tsx
// @vitest-environment jsdom
import { it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Lightbox } from "@/components/gallery/Lightbox";
import type { Photo } from "@/types/photo";

const photos = [
  { id: "a", title: "Dunes", storageKey: "photos/a.jpg", format: "DIGITAL", tags: [], width: 3, height: 2, aspectRatio: 1.5 },
  { id: "b", title: "Rain", storageKey: "photos/b.jpg", format: "FILM_35MM", tags: [], width: 2, height: 3, aspectRatio: 0.667 },
] as unknown as Photo[];

it("shows the indexed photo, navigates with the next button, and restores focus on close", () => {
  const onNavigate = vi.fn();
  const onClose = vi.fn();
  const opener = document.createElement("button");
  document.body.appendChild(opener);
  const { unmount } = render(<Lightbox photos={photos} index={0} onClose={onClose} onNavigate={onNavigate} returnFocusTo={opener} />);
  expect(screen.getByRole("dialog", { name: "Dunes" })).toBeInTheDocument();
  expect(document.body.style.overflow).toBe("hidden");
  fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
  expect(onNavigate).toHaveBeenCalledWith(1);
  unmount();
  expect(document.body.style.overflow).toBe("");
  expect(document.activeElement).toBe(opener);
});
```

- [ ] **Step 5: Run** — `npx vitest run src/components/gallery`, then `npm test && npx tsc --noEmit && npx eslint src/components/gallery`.

- [ ] **Step 6: Commit** — `git status --short`.

---

### Task 4: Public queries and the collection order index

**Files:**
- Create: `src/lib/public-queries.ts`, `src/lib/public-queries.test.ts`
- Modify: `prisma/schema.prisma` (`CollectionPhoto` gains `@@index([collectionId, order])`)
- Create: `prisma/migrations/20260919000000_collection_photo_order_index/migration.sql`
- Modify: `src/app/page.tsx`, `src/app/work/page.tsx` (use the queries; keep `revalidate = 0` until Task 7)

**Interfaces:**
- Produces:
  - `export const PUBLIC_PHOTO_SELECT` — a Prisma `select` object listing exactly the fields of `Photo` in `src/types/photo.ts` (so pages stop shipping EXIF-adjacent private fields like `originalFilename` and `sizeBytes` to the client).
  - `export async function getFeaturedPhotos(): Promise<Photo[]>` — `featured && published`, `orderBy: { order: "asc" }`.
  - `export async function getPublishedPhotos(): Promise<Photo[]>` — `published`, `orderBy: { createdAt: "desc" }`.
  - `export type PublicCollectionSummary = { id: string; slug: string; title: string; description: string | null; count: number; cover: Photo | null }`.
  - `export async function getPublishedCollections(): Promise<PublicCollectionSummary[]>` — `published`, `orderBy: { order: "asc" }`, `include: { cover: { select: PUBLIC_PHOTO_SELECT }, photos: { take: 1, orderBy: { order: "asc" }, where: { photo: { published: true } }, select: { photo: { select: PUBLIC_PHOTO_SELECT } } }, _count: { select: { photos: { where: { photo: { published: true } } } } } }`; `cover` = the explicit cover if it is published, else the first published member, else null; `count` = published member count.
  - `export type PublicCollection = { id: string; slug: string; title: string; description: string | null; photos: Photo[] }`.
  - `export async function getPublishedCollection(slug: string): Promise<PublicCollection | null>` — `findFirst({ where: { slug, published: true }, include: { photos: { where: { photo: { published: true } }, orderBy: { order: "asc" }, select: { photo: { select: PUBLIC_PHOTO_SELECT } } } } })`, mapped to the flat shape.
  - `export async function getPublishedCollectionSlugs(): Promise<string[]>`.

- [ ] **Step 1: Tests with a mocked `db`**

```ts
// src/lib/public-queries.test.ts
import { describe, it, expect, vi } from "vitest";

const db = vi.hoisted(() => ({
  photo: { findMany: vi.fn() },
  collection: { findMany: vi.fn(), findFirst: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ db }));

import { getFeaturedPhotos, getPublishedCollection, getPublishedCollections } from "@/lib/public-queries";

const photo = (id: string, published = true) => ({ id, title: id, slug: id, storageKey: `photos/${id}.jpg`, blurDataUrl: null,
  format: "DIGITAL", tags: [], width: 3, height: 2, aspectRatio: 1.5, location: null, caption: null, camera: null, lens: null,
  focalLength: null, aperture: null, shutterSpeed: null, iso: null, filmStock: null, filmFormat: null, published });

describe("getFeaturedPhotos", () => {
  it("asks for featured, published photos in order", async () => {
    db.photo.findMany.mockResolvedValue([]);
    await getFeaturedPhotos();
    expect(db.photo.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { featured: true, published: true }, orderBy: { order: "asc" },
    }));
  });
});

describe("getPublishedCollections", () => {
  it("uses the explicit cover when published, else the first member, else null, and counts published members", async () => {
    db.collection.findMany.mockResolvedValue([
      { id: "c1", slug: "a", title: "A", description: null, cover: photo("x"), photos: [{ photo: photo("m") }], _count: { photos: 4 } },
      { id: "c2", slug: "b", title: "B", description: "d", cover: photo("y", false), photos: [{ photo: photo("m") }], _count: { photos: 1 } },
      { id: "c3", slug: "c", title: "C", description: null, cover: null, photos: [], _count: { photos: 0 } },
    ]);
    const result = await getPublishedCollections();
    expect(result.map((c) => [c.slug, c.cover?.id ?? null, c.count])).toEqual([["a", "x", 4], ["b", "m", 1], ["c", null, 0]]);
    expect("published" in (result[0].cover as object)).toBe(false);
  });
});

describe("getPublishedCollection", () => {
  it("returns null for a missing or unpublished slug", async () => {
    db.collection.findFirst.mockResolvedValue(null);
    expect(await getPublishedCollection("nope")).toBeNull();
    expect(db.collection.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: "nope", published: true } }));
  });
  it("flattens member rows into photos in order", async () => {
    db.collection.findFirst.mockResolvedValue({ id: "c1", slug: "a", title: "A", description: null,
      photos: [{ photo: photo("p2") }, { photo: photo("p1") }] });
    const result = await getPublishedCollection("a");
    expect(result?.photos.map((p) => p.id)).toEqual(["p2", "p1"]);
  });
});
```

- [ ] **Step 2: Implement** as specified. The explicit cover must itself be published: check `cover.published` is not in `PUBLIC_PHOTO_SELECT`, so fetch the cover with `select: { ...PUBLIC_PHOTO_SELECT, published: true }` and strip `published` before returning.

- [ ] **Step 3: Schema + migration.** Add `@@index([collectionId, order])` to `CollectionPhoto`. Generate: `git show HEAD:prisma/schema.prisma > /tmp/schema-head.prisma && npx prisma migrate diff --from-schema /tmp/schema-head.prisma --to-schema prisma/schema.prisma --script`. The SQL must be exactly one `CREATE INDEX "CollectionPhoto_collectionId_order_idx" ON "CollectionPhoto"("collectionId", "order");`. Save it to the migration folder. Do not apply. `npx prisma generate`.

- [ ] **Step 4: Pages use the queries.** `src/app/page.tsx` → `const photos = await getFeaturedPhotos();`. `src/app/work/page.tsx` → `getPublishedPhotos()`.

- [ ] **Step 5: Run** — `npm test && npx tsc --noEmit`. **Commit** — `git status --short`.

---

### Task 5: Public collections: strip on `/work` and `/work/[slug]`

**Files:**
- Create: `src/components/CollectionStrip.tsx`, `src/components/CollectionStrip.test.tsx`
- Create: `src/app/work/[slug]/page.tsx`, `src/app/work/[slug]/page.test.tsx`, `src/components/CollectionClient.tsx`
- Modify: `src/app/work/page.tsx`, `src/components/WorkClient.tsx`

**Interfaces:**
- Consumes: Task 4 queries and types; Task 2 `Gallery` with `showFilters={false}`.
- Produces: `CollectionStrip({ collections }: { collections: PublicCollectionSummary[] })` renders nothing when empty; `CollectionClient({ collection }: { collection: PublicCollection })`.

- [ ] **Step 1: Strip test**

```tsx
// src/components/CollectionStrip.test.tsx
// @vitest-environment jsdom
import { it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CollectionStrip } from "@/components/CollectionStrip";

const cover = { id: "p", title: "Dunes", storageKey: "photos/p.jpg", blurDataUrl: null, width: 3000, height: 2000, aspectRatio: 1.5, format: "DIGITAL", tags: [] };

it("renders a link per collection with title, count, and the cover at its own aspect ratio", () => {
  render(<CollectionStrip collections={[
    { id: "c1", slug: "coast", title: "Coast", description: null, count: 12, cover: cover as never },
    { id: "c2", slug: "empty", title: "Empty", description: null, count: 0, cover: null },
  ]} />);
  const link = screen.getByRole("link", { name: /Coast/ });
  expect(link).toHaveAttribute("href", "/work/coast");
  expect(screen.getByText("12 photos")).toBeInTheDocument();
  expect(screen.getByAltText("Dunes")).toHaveAttribute("width", "3000");
  expect(screen.getByText("Empty")).toBeInTheDocument();
});

it("renders nothing when there are no collections", () => {
  const { container } = render(<CollectionStrip collections={[]} />);
  expect(container).toBeEmptyDOMElement();
});
```

- [ ] **Step 2: Implement the strip.** Client component. A horizontally scrolling row (`display: flex; gap: 6px; overflow-x: auto; scroll-snap-type: x proximity; padding-bottom: 0.5rem`) of `next/link` cards. Each card: fixed row height `clamp(140px, 22vw, 220px)`; the cover `<Image loader={imageLoader} width={cover.width} height={cover.height}>` styled `height: 100%; width: auto`, `sizes="(max-width: 640px) 60vw, 30vw"`, `placeholder` from blur, no `object-fit` (natural aspect ratio, no crop); a placeholder block `aspect-ratio: 3/2` in `#111F2E` when `cover` is null; beneath, the title in `var(--font-serif)` 1.1rem weight 300 `#D4DCE8`, and the count in `var(--font-mono)` 9px letter-spacing 0.15em `rgba(212,220,232,0.4)` as `"1 photo"` / `"N photos"`. The whole strip is wrapped in the same `motion.div` reveal as `WorkClient` uses (`opacity 0→1, y 16→0`, 0.7s). Section label above it: mono 10px uppercase copper "Collections", matching the "All work" label style in `WorkClient`.

- [ ] **Step 3: `/work` page and `WorkClient`.** `work/page.tsx`: `const [photos, collections] = await Promise.all([getPublishedPhotos(), getPublishedCollections()]);` → `<WorkClient photos={photos} collections={collections} />`. `WorkClient` renders `<CollectionStrip collections={collections} />` between the `Archive` heading and the `Gallery`, with `marginBottom: "3rem"` when non-empty.

- [ ] **Step 4: Collection page**

```tsx
// src/app/work/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedCollection } from "@/lib/public-queries";
import CollectionClient from "@/components/CollectionClient";

export const revalidate = 0; // Task 7 switches this to 60 and adds generateStaticParams.

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getPublishedCollection(slug);
  return collection ? { title: `${collection.title} · Canopus`, description: collection.description ?? undefined } : {};
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = await getPublishedCollection(slug);
  if (!collection) notFound();
  return <CollectionClient collection={collection} />;
}
```

`CollectionClient`: same shell as `WorkClient` (Nav, section padding, reveal). Label line: mono copper `Collection`; `h1` = title (same style as `Archive`); description (if any) in `var(--font-serif)` 1.15rem weight 300 italic `rgba(212,220,232,0.6)` max-width 60ch, `marginBottom: "3rem"`; a mono back link `← All work` to `/work` above the label; then `<Gallery photos={collection.photos} showFilters={false} />`. Footer.

- [ ] **Step 5: Page test** — mock `@/lib/public-queries` and `next/navigation`'s `notFound` (throwing); assert the page calls `notFound()` for a null collection and renders the title otherwise (render the awaited element with `render(await CollectionPage({ params: Promise.resolve({ slug: "x" }) }))`, jsdom, `motion-plus/react` mocked as in Task 2).

- [ ] **Step 6: Run** — `npm test && npx tsc --noEmit && npx eslint src`. `npm run build` lists `/work/[slug]`. **Commit** — `git status --short`.

---

### Task 6: Hero variants

**Files:**
- Create: `scripts/hero-variants.mts`
- Create (generated, committed): `public/hero/intro-{1280,1920,2560}.{avif,webp,jpg}`
- Modify: `package.json` (`sharp` devDependency; script `"hero": "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/hero-variants.mts"`), `src/components/HomeClient.tsx:73-85`
- Create: `src/components/HomeHero.test.tsx` (if the hero markup is extracted to `src/components/HomeHero.tsx`; do extract it: `HomeHero({ visible }: { visible: boolean })` returns the `<picture>` inside the existing fading `motion.div`).

- [ ] **Step 1: Script**

```ts
// scripts/hero-variants.mts
// Writes responsive AVIF/WebP/JPEG variants of public/intro.jpg into public/hero/.
// Resize + encode only: no crop, no colour change. Run: npm run hero
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const SRC = "public/intro.jpg";
const OUT = "public/hero";
const WIDTHS = [1280, 1920, 2560] as const;

await mkdir(OUT, { recursive: true });
for (const w of WIDTHS) {
  const base = sharp(SRC).rotate().resize({ width: w, withoutEnlargement: true });
  await base.clone().avif({ quality: 60 }).toFile(`${OUT}/intro-${w}.avif`);
  await base.clone().webp({ quality: 80 }).toFile(`${OUT}/intro-${w}.webp`);
  await base.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(`${OUT}/intro-${w}.jpg`);
  console.log(`wrote intro-${w}.{avif,webp,jpg}`);
}
```

`npm install --save-dev sharp`, then `npm run hero`. Report the nine file sizes.

- [ ] **Step 2: Hero markup.** Replace the `backgroundImage: "url(/intro.jpg)"` div contents with (keeping the `motion.div`, its opacity animation, `position: absolute; inset: 0`):

```tsx
<picture>
  <source type="image/avif" srcSet="/hero/intro-1280.avif 1280w, /hero/intro-1920.avif 1920w, /hero/intro-2560.avif 2560w" sizes="100vw" />
  <source type="image/webp" srcSet="/hero/intro-1280.webp 1280w, /hero/intro-1920.webp 1920w, /hero/intro-2560.webp 2560w" sizes="100vw" />
  <img
    src="/hero/intro-1920.jpg"
    srcSet="/hero/intro-1280.jpg 1280w, /hero/intro-1920.jpg 1920w, /hero/intro-2560.jpg 2560w"
    sizes="100vw"
    alt=""
    fetchPriority="high"
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
  />
</picture>
```

- [ ] **Step 3: Test** — render `HomeHero` and assert the `<img>` `src` is `/hero/intro-1920.jpg`, both `<source>` types exist, and `sizes="100vw"`.

- [ ] **Step 4: Run** — `npm test && npx tsc --noEmit`. `ls -la public/hero` shows all nine files; the 1920 AVIF should be well under 500 KB. **Commit** — `git status --short` (the variants are meant to be committed; `public/intro.jpg` stays for now and is removed in Task 8 once the preview confirms the hero).

---

### Task 7: Static pages with background refresh

**Files:**
- Modify: `open-next.config.ts`, `wrangler.jsonc`, `src/app/page.tsx`, `src/app/work/page.tsx`, `src/app/work/[slug]/page.tsx`, `src/lib/db.ts` (comment only), `docs/deploy-cloudflare.md`, `README.md`

- [ ] **Step 1: OpenNext config**

```ts
// open-next.config.ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";

// Static public pages (`revalidate = 60`) are stored in R2 and refreshed in the
// background by the memory queue, which re-requests the page through the
// WORKER_SELF_REFERENCE binding. No tag cache: there is no on-demand purge yet.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  queue: memoryQueue,
});
```

Confirm the import paths exist under `node_modules/@opennextjs/cloudflare/dist/api/overrides/` and that `package.json` `exports` of the adapter expose them (check `node_modules/@opennextjs/cloudflare/package.json`; if the export is `./overrides/*`, the paths above are right).

- [ ] **Step 2: Binding.** In `wrangler.jsonc` `r2_buckets`, add `{ "binding": "NEXT_INC_CACHE_R2_BUCKET", "bucket_name": "canopus-cache" }`. Do not touch the `PHOTOS` entries.

- [ ] **Step 3: Pages.** Replace `export const revalidate = 0;` with `export const revalidate = 60;` in `src/app/page.tsx`, `src/app/work/page.tsx`, and `src/app/work/[slug]/page.tsx`; in the slug page add `export const dynamicParams = true;` and `export async function generateStaticParams() { return (await getPublishedCollectionSlugs()).map((slug) => ({ slug })); }` (import `getPublishedCollectionSlugs` from `@/lib/public-queries`). Update the comment in `src/lib/db.ts` ("Any page that reads `db` must be dynamic") to say pages may be static with `revalidate` because the client reads `process.env.DATABASE_URL`, which is present at build time and at runtime.

- [ ] **Step 4: Docs.** `docs/deploy-cloudflare.md`: a new section "8. Page cache bucket" before Rollback: create an R2 bucket named exactly `canopus-cache` in the dashboard (same steps as the photos bucket, no public access, no custom domain), then `npm run deploy`. In Day-to-day: "Public pages are cached and refresh within 60 seconds of a change; the admin is never cached." README "Deploy" section: one line on the cache bucket.

- [ ] **Step 5: Verify locally.** `npm run build:cf` must succeed and the build output must list `/` and `/work` as static (○ or ●, not ƒ). `npx wrangler r2 bucket create canopus-cache` is **not** run by the implementer (Cloudflare access is the owner's). For the local preview, `opennextjs-cloudflare preview` uses a local R2 simulation, so no bucket is needed: run `npm run preview` in the background, request `/work` twice with `curl -sI`, and check the second response carries `x-opennext-cache: HIT` (the first is `MISS`). If that header is absent in this adapter version, report the full response headers of both requests instead and confirm the second `/work` no longer triggers a database query (add a temporary `console.log` in `getPublishedPhotos`, observe the preview log, remove it). Stop the preview (`pkill -f "opennextjs-cloudflare preview"; pkill -f workerd`).

- [ ] **Step 6: Run** — `npm test && npx tsc --noEmit && npx eslint src scripts vitest.config.mts`. **Commit** — `git status --short`.

---

### Task 8: Docs, gates, smoke

- README: a "Public site" section (hero variants and `npm run hero`, the gallery folder, collections at `/work/<slug>`, caching behaviour); spec status line for phase 5.
- Remove `public/intro.jpg` only if the controller's preview confirms the `<picture>` hero renders (the variants replace it entirely). Record the removal in the report.
- Gates: `npm test && npx tsc --noEmit && npx eslint src scripts vitest.config.mts && npm run build:cf` (size guard must pass; expect a small increase from `next/image`).
- Controller applies the additive index migration (owner-approved) before the smoke.
- Smoke on `npm run preview` (controller): `/` 200 with `<picture>` and `/hero/intro-1920.jpg` in the HTML, no `intro.jpg`; `/hero/intro-1920.avif` 200 `image/avif`; `/work` 200 with `srcset` on tiles and `?w=` URLs only from the served list; create a throwaway published collection "Smoke test" via the admin API with two photos, `/work/smoke-test` 200 with both titles and no filter bar, `/work` 200 containing "Smoke test" (allow up to 60 s for the cached page), `/work/does-not-exist` 404; delete the collection; after 65 s `/work/smoke-test` 404. Never mutate real photos.
