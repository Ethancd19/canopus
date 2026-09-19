// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listPhotosMock = vi.fn();
const orderPhotosMock = vi.fn();
vi.mock("@/lib/admin-api", () => ({
  listPhotos: (...args: unknown[]) => listPhotosMock(...args),
  orderPhotos: (...args: unknown[]) => orderPhotosMock(...args),
}));

import { useFeaturedOrder } from "@/components/admin/useFeaturedOrder";

function makePhoto(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    title: "Dunes at dawn",
    slug: "dunes-at-dawn",
    storageKey: "photos/a.jpg",
    blurDataUrl: null,
    published: true,
    featured: true,
    order: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    format: "DIGITAL",
    tags: [] as string[],
    location: null,
    caption: null,
    ...overrides,
  };
}

beforeEach(() => {
  listPhotosMock.mockReset();
  orderPhotosMock.mockReset();
});

describe("useFeaturedOrder", () => {
  it("loads only featured photos, sorted by order then createdAt", async () => {
    const photos = [
      makePhoto({ id: "unfeatured", featured: false, order: 0 }),
      makePhoto({ id: "b", order: 2, createdAt: "2026-01-01T00:00:00.000Z" }),
      makePhoto({ id: "a", order: 1, createdAt: "2026-01-02T00:00:00.000Z" }),
      makePhoto({ id: "c", order: 1, createdAt: "2026-01-01T00:00:00.000Z" }),
    ];
    listPhotosMock.mockResolvedValue({ ok: true, photos });
    const { result } = renderHook(() => useFeaturedOrder());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.photos.map((p) => p.id)).toEqual(["c", "a", "b"]);
    expect(result.current.error).toBeNull();
    expect(result.current.dirty).toBe(false);
  });

  it("sets error to the server message when listPhotos fails", async () => {
    listPhotosMock.mockResolvedValue({ ok: false, error: "network blip" });
    const { result } = renderHook(() => useFeaturedOrder());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("network blip");
    expect(result.current.photos).toEqual([]);
  });

  it("move() reorders client-side and marks dirty", async () => {
    const photos = [makePhoto({ id: "a", order: 0 }), makePhoto({ id: "b", order: 1 })];
    listPhotosMock.mockResolvedValue({ ok: true, photos });
    const { result } = renderHook(() => useFeaturedOrder());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.dirty).toBe(false);

    act(() => result.current.move(["b", "a"]));

    expect(result.current.photos.map((p) => p.id)).toEqual(["b", "a"]);
    expect(result.current.dirty).toBe(true);
  });

  it("save() calls orderPhotos with the current ids, then reloads and clears dirty", async () => {
    const photos = [makePhoto({ id: "a", order: 0 }), makePhoto({ id: "b", order: 1 })];
    listPhotosMock.mockResolvedValueOnce({ ok: true, photos });
    orderPhotosMock.mockResolvedValue({ ok: true, count: 2 });
    const reloaded = [makePhoto({ id: "b", order: 0 }), makePhoto({ id: "a", order: 1 })];
    listPhotosMock.mockResolvedValueOnce({ ok: true, photos: reloaded });

    const { result } = renderHook(() => useFeaturedOrder());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.move(["b", "a"]));
    expect(result.current.dirty).toBe(true);

    await act(async () => {
      await result.current.save();
    });

    expect(orderPhotosMock).toHaveBeenCalledWith(["b", "a"]);
    expect(result.current.photos.map((p) => p.id)).toEqual(["b", "a"]);
    expect(result.current.dirty).toBe(false);
  });

  it("save() surfaces the error and keeps the pending order when orderPhotos fails", async () => {
    const photos = [makePhoto({ id: "a", order: 0 }), makePhoto({ id: "b", order: 1 })];
    listPhotosMock.mockResolvedValue({ ok: true, photos });
    orderPhotosMock.mockResolvedValue({ ok: false, error: "nope" });

    const { result } = renderHook(() => useFeaturedOrder());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.move(["b", "a"]));
    await act(async () => {
      await result.current.save();
    });

    expect(result.current.error).toBe("nope");
    expect(result.current.photos.map((p) => p.id)).toEqual(["b", "a"]);
    expect(result.current.dirty).toBe(true);
  });

  it("save()'s post-save refetch uses `refreshing`, not `loading`, so the list stays mounted and unchanged mid-refetch", async () => {
    const photos = [makePhoto({ id: "a", order: 0 }), makePhoto({ id: "b", order: 1 })];
    listPhotosMock.mockResolvedValueOnce({ ok: true, photos });
    orderPhotosMock.mockResolvedValue({ ok: true, count: 2 });

    let resolveRefetch!: (value: unknown) => void;
    const refetchPromise = new Promise((resolve) => {
      resolveRefetch = resolve;
    });
    listPhotosMock.mockImplementationOnce(() => refetchPromise);

    const { result } = renderHook(() => useFeaturedOrder());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.move(["b", "a"]));

    let savePromise!: Promise<unknown>;
    act(() => {
      savePromise = result.current.save();
    });

    // Post-save refetch is in flight: `refreshing` is true, `loading` must
    // never flip back to true, and the (still-pending) order stays rendered
    // instead of the list unmounting to a loading state.
    await waitFor(() => expect(result.current.refreshing).toBe(true));
    expect(result.current.loading).toBe(false);
    expect(result.current.photos.map((p) => p.id)).toEqual(["b", "a"]);

    await act(async () => {
      resolveRefetch({
        ok: true,
        photos: [makePhoto({ id: "b", order: 0 }), makePhoto({ id: "a", order: 1 })],
      });
      await savePromise;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.refreshing).toBe(false);
    expect(result.current.photos.map((p) => p.id)).toEqual(["b", "a"]);
    expect(result.current.dirty).toBe(false);
  });

  it("reset() discards the pending reorder", async () => {
    const photos = [makePhoto({ id: "a", order: 0 }), makePhoto({ id: "b", order: 1 })];
    listPhotosMock.mockResolvedValue({ ok: true, photos });
    const { result } = renderHook(() => useFeaturedOrder());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.move(["b", "a"]));
    expect(result.current.dirty).toBe(true);

    act(() => result.current.reset());

    expect(result.current.photos.map((p) => p.id)).toEqual(["a", "b"]);
    expect(result.current.dirty).toBe(false);
  });
});
