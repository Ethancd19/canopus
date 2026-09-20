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
