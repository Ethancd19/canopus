import { describe, it, expect, vi } from "vitest";

const db = vi.hoisted(() => ({
  photo: { findMany: vi.fn() },
  collection: { findMany: vi.fn(), findFirst: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ db }));

import {
  getFeaturedPhotos,
  getPublishedCollection,
  getPublishedCollections,
  getPublishedPhotos,
  getSportsGenres,
  PUBLIC_PHOTO_SELECT,
} from "@/lib/public-queries";
import { SPORTS_GENRES } from "@/lib/site";

const photo = (id: string, published = true) => ({ id, title: id, slug: id, storageKey: `photos/${id}.jpg`, blurDataUrl: null,
  format: "DIGITAL", tags: [], width: 3, height: 2, aspectRatio: 1.5, location: null, caption: null, camera: null, lens: null,
  focalLength: null, aperture: null, shutterSpeed: null, iso: null, filmStock: null, filmFormat: null, published });

describe("getFeaturedPhotos", () => {
  it("asks for featured, published photos in order, selecting only public fields", async () => {
    db.photo.findMany.mockResolvedValue([]);
    await getFeaturedPhotos();
    expect(db.photo.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { featured: true, published: true }, orderBy: { order: "asc" }, select: PUBLIC_PHOTO_SELECT,
    }));
  });
});

describe("getPublishedPhotos", () => {
  it("selects only public fields", async () => {
    db.photo.findMany.mockResolvedValue([]);
    await getPublishedPhotos();
    expect(db.photo.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { published: true }, select: PUBLIC_PHOTO_SELECT,
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

  it("asks for published collections in order, with only published members in order", async () => {
    db.collection.findMany.mockResolvedValue([]);
    await getPublishedCollections();
    expect(db.collection.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { published: true },
      orderBy: { order: "asc" },
      include: expect.objectContaining({
        photos: expect.objectContaining({
          where: { photo: { published: true } },
          orderBy: { order: "asc" },
        }),
      }),
    }));
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
  it("scopes and orders member photos to published ones", async () => {
    db.collection.findFirst.mockResolvedValue({ id: "c1", slug: "a", title: "A", description: null, photos: [] });
    await getPublishedCollection("a");
    expect(db.collection.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({
        photos: expect.objectContaining({
          where: { photo: { published: true } },
          orderBy: { order: "asc" },
        }),
      }),
    }));
  });
});

describe("getSportsGenres", () => {
  it("returns every configured genre in order, marking missing collections as empty", async () => {
    db.collection.findMany.mockResolvedValue([
      { id: "c2", slug: "live", title: "Live nights", description: "d", cover: photo("x"), photos: [{ photo: photo("m") }], _count: { photos: 4 } },
      { id: "c1", slug: "sports", title: "Sports", description: null, cover: photo("y", false), photos: [{ photo: photo("m") }], _count: { photos: 1 } },
    ]);
    const result = await getSportsGenres();
    expect(result.map((g) => [g.slug, g.title, g.count, g.cover?.id ?? null, g.description])).toEqual([
      ["sports", "Sports", 1, "m", null],
      ["motorsport", "Motorsport", 0, null, null],
      ["live", "Live", 4, "x", "d"],
    ]);
    expect(result.map((g) => g.blurb)).toEqual(SPORTS_GENRES.map((g) => g.blurb));
    expect("published" in (result[2].cover as object)).toBe(false);
  });

  it("queries only the configured slugs, published, with a published cover and first member", async () => {
    db.collection.findMany.mockResolvedValue([]);
    await getSportsGenres();
    expect(db.collection.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { slug: { in: ["sports", "motorsport", "live"] }, published: true },
      include: expect.objectContaining({
        photos: expect.objectContaining({ take: 1, where: { photo: { published: true } }, orderBy: { order: "asc" } }),
      }),
    }));
  });
});
