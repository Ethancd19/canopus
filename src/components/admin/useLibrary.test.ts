// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listPhotosMock = vi.fn();
const patchPhotoMock = vi.fn();
const deletePhotoMock = vi.fn();
const bulkPhotosMock = vi.fn();
vi.mock("@/lib/admin-api", () => ({
  listPhotos: (...args: unknown[]) => listPhotosMock(...args),
  patchPhoto: (...args: unknown[]) => patchPhotoMock(...args),
  deletePhoto: (...args: unknown[]) => deletePhotoMock(...args),
  bulkPhotos: (...args: unknown[]) => bulkPhotosMock(...args),
}));

import { useLibrary } from "@/components/admin/useLibrary";

function makePhoto(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    title: "Dunes at dawn",
    slug: "dunes-at-dawn",
    storageKey: "photos/a.jpg",
    blurDataUrl: null,
    published: false,
    featured: false,
    format: "DIGITAL",
    tags: [] as string[],
    location: null,
    caption: null,
    ...overrides,
  };
}

beforeEach(() => {
  listPhotosMock.mockReset();
  patchPhotoMock.mockReset();
  deletePhotoMock.mockReset();
  bulkPhotosMock.mockReset();
  window.localStorage.clear();
});

describe("useLibrary", () => {
  it("loads photos from listPhotos on mount", async () => {
    const photos = [makePhoto({ id: "p1" }), makePhoto({ id: "p2" })];
    listPhotosMock.mockResolvedValue({ ok: true, photos });
    const { result } = renderHook(() => useLibrary());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.photos).toEqual(photos);
    expect(result.current.filtered).toEqual(photos);
    expect(result.current.error).toBeNull();
  });

  it("sets error to the server message when listPhotos fails", async () => {
    listPhotosMock.mockResolvedValue({ ok: false, error: "network blip" });
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("network blip");
    expect(result.current.photos).toEqual([]);
  });

  it("falls back to a generic message when listPhotos fails without one", async () => {
    listPhotosMock.mockResolvedValue({ ok: false, error: "" });
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Couldn't load photos.");
  });

  it("reload() clears a previous error and re-fetches", async () => {
    listPhotosMock.mockResolvedValueOnce({ ok: false, error: "network blip" });
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("network blip");

    const photos = [makePhoto({ id: "p1" })];
    listPhotosMock.mockResolvedValueOnce({ ok: true, photos });
    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.photos).toEqual(photos);
  });

  it("filters by state: drafts, published, featured, untagged", async () => {
    const photos = [
      makePhoto({ id: "draft", published: false }),
      makePhoto({ id: "published", published: true, tags: ["landscape"] }),
      makePhoto({ id: "featured", published: true, featured: true, tags: ["landscape"] }),
      makePhoto({ id: "untagged", published: true, tags: [] }),
      makePhoto({ id: "tagged", published: true, tags: ["landscape"] }),
    ];
    listPhotosMock.mockResolvedValue({ ok: true, photos });
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setState("drafts"));
    expect(result.current.filtered.map((p) => p.id)).toEqual(["draft"]);

    act(() => result.current.setState("published"));
    expect(result.current.filtered.map((p) => p.id)).toEqual([
      "published",
      "featured",
      "untagged",
      "tagged",
    ]);

    act(() => result.current.setState("featured"));
    expect(result.current.filtered.map((p) => p.id)).toEqual(["featured"]);

    act(() => result.current.setState("untagged"));
    expect(result.current.filtered.map((p) => p.id)).toEqual(["draft", "untagged"]);

    act(() => result.current.setState("all"));
    expect(result.current.filtered).toHaveLength(5);
  });

  it("filters by format", async () => {
    const photos = [
      makePhoto({ id: "d", format: "DIGITAL" }),
      makePhoto({ id: "f35", format: "FILM_35MM" }),
      makePhoto({ id: "f120", format: "FILM_120MM" }),
    ];
    listPhotosMock.mockResolvedValue({ ok: true, photos });
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setFormat("FILM_35MM"));
    expect(result.current.filtered.map((p) => p.id)).toEqual(["f35"]);
  });

  it("filters by search across title, tags, and location", async () => {
    const photos = [
      makePhoto({ id: "a", title: "Dunes at dawn", tags: [], location: null }),
      makePhoto({ id: "b", title: "Harbor lights", tags: ["golden hour"], location: "Lisbon" }),
    ];
    listPhotosMock.mockResolvedValue({ ok: true, photos });
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSearch("dunes"));
    expect(result.current.filtered.map((p) => p.id)).toEqual(["a"]);

    act(() => result.current.setSearch("lisbon"));
    expect(result.current.filtered.map((p) => p.id)).toEqual(["b"]);

    act(() => result.current.setSearch("golden"));
    expect(result.current.filtered.map((p) => p.id)).toEqual(["b"]);
  });

  it("optimistically applies update() and keeps the server photo on success", async () => {
    const photo = makePhoto({ id: "p1", title: "Old title" });
    listPhotosMock.mockResolvedValue({ ok: true, photos: [photo] });
    const saved = { ...photo, title: "New title" };
    patchPhotoMock.mockResolvedValue({ ok: true, photo: saved });
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let updatePromise!: Promise<unknown>;
    act(() => {
      updatePromise = result.current.update("p1", { title: "New title" });
    });
    // Optimistic update applied synchronously.
    expect(result.current.photos[0].title).toBe("New title");

    await act(async () => {
      await updatePromise;
    });
    expect(result.current.photos[0]).toEqual(saved);
    expect(patchPhotoMock).toHaveBeenCalledWith("p1", { title: "New title" });
  });

  it("rolls back only the affected row when the PATCH fails, preserving a concurrent edit to another row", async () => {
    const photoA = makePhoto({ id: "p1", title: "Old title" });
    const photoB = makePhoto({ id: "p2", title: "Other title" });
    listPhotosMock.mockResolvedValue({ ok: true, photos: [photoA, photoB] });

    let resolveP1!: (value: unknown) => void;
    const p1Patch = new Promise((resolve) => {
      resolveP1 = resolve;
    });
    patchPhotoMock.mockImplementation((id: string, partial: Record<string, unknown>) => {
      if (id === "p1") return p1Patch;
      return Promise.resolve({ ok: true, photo: { ...photoB, ...partial } });
    });

    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let updateP1!: Promise<unknown>;
    act(() => {
      updateP1 = result.current.update("p1", { title: "New title" });
    });
    expect(result.current.photos.find((p) => p.id === "p1")?.title).toBe("New title");

    // A concurrent edit to a different row completes while p1's PATCH is
    // still in flight.
    await act(async () => {
      await result.current.update("p2", { title: "Updated other title" });
    });
    expect(result.current.photos.find((p) => p.id === "p2")?.title).toBe("Updated other title");

    // Now p1's PATCH fails - a whole-array rollback would also clobber p2's
    // already-applied edit above; a by-id rollback must not.
    await act(async () => {
      resolveP1({ ok: false, error: "nope" });
      await updateP1;
    });

    expect(result.current.photos.find((p) => p.id === "p1")?.title).toBe("Old title");
    expect(result.current.photos.find((p) => p.id === "p2")?.title).toBe("Updated other title");
  });

  it("togglePublished and toggleFeatured flip the boolean via update", async () => {
    const photo = makePhoto({ id: "p1", published: false, featured: false });
    listPhotosMock.mockResolvedValue({ ok: true, photos: [photo] });
    patchPhotoMock.mockImplementation(async (id: string, partial: Record<string, unknown>) => ({
      ok: true,
      photo: { ...photo, ...partial },
    }));
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.togglePublished("p1");
    });
    expect(patchPhotoMock).toHaveBeenCalledWith("p1", { published: true });

    await act(async () => {
      await result.current.toggleFeatured("p1");
    });
    expect(patchPhotoMock).toHaveBeenCalledWith("p1", { featured: true });
  });

  it("remove() calls deletePhoto and drops the row on success", async () => {
    const photos = [makePhoto({ id: "p1" }), makePhoto({ id: "p2" })];
    listPhotosMock.mockResolvedValue({ ok: true, photos });
    deletePhotoMock.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.remove("p1");
    });

    expect(deletePhotoMock).toHaveBeenCalledWith("p1");
    expect(result.current.photos.map((p) => p.id)).toEqual(["p2"]);
  });

  it("restores the row when remove() fails", async () => {
    const photos = [makePhoto({ id: "p1" })];
    listPhotosMock.mockResolvedValue({ ok: true, photos });
    deletePhotoMock.mockResolvedValue({ ok: false, error: "nope" });
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.remove("p1");
    });

    expect(result.current.photos.map((p) => p.id)).toEqual(["p1"]);
  });

  it("defaults view to grid and persists changes to localStorage", async () => {
    listPhotosMock.mockResolvedValue({ ok: true, photos: [] });
    const { result } = renderHook(() => useLibrary());
    expect(result.current.view).toBe("grid");

    act(() => result.current.setView("list"));
    expect(result.current.view).toBe("list");
    expect(window.localStorage.getItem("canopus.admin.view")).toBe("list");
  });

  it("reads a persisted view from localStorage on mount", async () => {
    window.localStorage.setItem("canopus.admin.view", "list");
    listPhotosMock.mockResolvedValue({ ok: true, photos: [] });
    const { result } = renderHook(() => useLibrary());
    expect(result.current.view).toBe("list");
  });

  it("derives allTags from loaded photos merged with TAG_OPTIONS", async () => {
    const photos = [makePhoto({ id: "p1", tags: ["custom-tag"] })];
    listPhotosMock.mockResolvedValue({ ok: true, photos });
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.allTags).toContain("custom-tag");
    expect(result.current.allTags).toContain("landscape");
  });

  describe("selection", () => {
    async function setupFive() {
      const photos = [
        makePhoto({ id: "a" }),
        makePhoto({ id: "b" }),
        makePhoto({ id: "c" }),
        makePhoto({ id: "d" }),
        makePhoto({ id: "e" }),
      ];
      listPhotosMock.mockResolvedValue({ ok: true, photos });
      const { result } = renderHook(() => useLibrary());
      await waitFor(() => expect(result.current.loading).toBe(false));
      return result;
    }

    it("toggleSelected adds and removes an id", async () => {
      const result = await setupFive();

      act(() => result.current.toggleSelected("b"));
      expect(result.current.selected).toEqual(new Set(["b"]));

      act(() => result.current.toggleSelected("b"));
      expect(result.current.selected).toEqual(new Set());
    });

    it("shift-range selects every id between the anchor and the target in filtered order", async () => {
      const result = await setupFive();

      act(() => result.current.toggleSelected("b"));
      act(() => result.current.toggleSelected("d", { range: true }));

      expect(result.current.selected).toEqual(new Set(["b", "c", "d"]));
    });

    it("shift-range works regardless of direction (target before the anchor)", async () => {
      const result = await setupFive();

      act(() => result.current.toggleSelected("d"));
      act(() => result.current.toggleSelected("b", { range: true }));

      expect(result.current.selected).toEqual(new Set(["b", "c", "d"]));
    });

    it("selectAllFiltered selects every currently filtered id", async () => {
      const result = await setupFive();

      act(() => result.current.selectAllFiltered());
      expect(result.current.selected).toEqual(new Set(["a", "b", "c", "d", "e"]));
    });

    it("clearSelection empties the selection", async () => {
      const result = await setupFive();

      act(() => result.current.selectAllFiltered());
      act(() => result.current.clearSelection());
      expect(result.current.selected).toEqual(new Set());
    });

    it("bulk() calls bulkPhotos with the selected ids, reloads, clears selection, and sets a success message", async () => {
      const result = await setupFive();
      act(() => {
        result.current.toggleSelected("a");
        result.current.toggleSelected("c");
      });
      const epochBefore = result.current.selectionEpoch;
      bulkPhotosMock.mockResolvedValue({ ok: true, count: 2 });
      listPhotosMock.mockResolvedValue({
        ok: true,
        photos: [makePhoto({ id: "a", published: true }), makePhoto({ id: "c", published: true })],
      });

      let bulkResult!: { ok: boolean; count?: number; error?: string };
      await act(async () => {
        bulkResult = await result.current.bulk("publish");
      });

      expect(bulkPhotosMock).toHaveBeenCalledWith(["a", "c"], "publish", undefined);
      expect(bulkResult).toEqual({ ok: true, count: 2 });
      expect(result.current.selected).toEqual(new Set());
      expect(listPhotosMock).toHaveBeenCalledTimes(2); // initial load + reload
      expect(result.current.bulkMessage).toEqual({ tone: "ok", text: "Published 2 photos" });
      expect(result.current.selectionEpoch).toBe(epochBefore + 1);
    });

    it("bulk() passes payload through and surfaces an error without clearing selection or bumping the epoch", async () => {
      const result = await setupFive();
      act(() => result.current.toggleSelected("a"));
      const epochBefore = result.current.selectionEpoch;
      bulkPhotosMock.mockResolvedValue({ ok: false, error: "server exploded" });

      let bulkResult!: { ok: boolean; count?: number; error?: string };
      await act(async () => {
        bulkResult = await result.current.bulk("addTag", { tag: "golden hour" });
      });

      expect(bulkPhotosMock).toHaveBeenCalledWith(["a"], "addTag", { tag: "golden hour" });
      expect(bulkResult).toEqual({ ok: false, error: "server exploded" });
      expect(result.current.selected).toEqual(new Set(["a"]));
      expect(result.current.bulkMessage).toEqual({ tone: "error", text: "Couldn't add tag: server exploded" });
      expect(result.current.selectionEpoch).toBe(epochBefore);
    });

    it("clearBulkMessage clears the message", async () => {
      const result = await setupFive();
      act(() => result.current.toggleSelected("a"));
      bulkPhotosMock.mockResolvedValue({ ok: false, error: "nope" });
      await act(async () => {
        await result.current.bulk("publish");
      });
      expect(result.current.bulkMessage).not.toBeNull();

      act(() => result.current.clearBulkMessage());
      expect(result.current.bulkMessage).toBeNull();
    });

    it("toggleSelected clears any existing bulk message", async () => {
      const result = await setupFive();
      act(() => result.current.toggleSelected("a"));
      bulkPhotosMock.mockResolvedValue({ ok: false, error: "nope" });
      await act(async () => {
        await result.current.bulk("publish");
      });
      expect(result.current.bulkMessage).not.toBeNull();

      act(() => result.current.toggleSelected("b"));
      expect(result.current.bulkMessage).toBeNull();
    });

    it("remove() prunes the deleted id out of the selection", async () => {
      const result = await setupFive();
      act(() => {
        result.current.toggleSelected("a");
        result.current.toggleSelected("b");
      });
      deletePhotoMock.mockResolvedValue({ ok: true });

      await act(async () => {
        await result.current.remove("a");
      });

      expect(result.current.selected).toEqual(new Set(["b"]));
    });

    it("reload() prunes selected ids that are no longer present in the loaded photos", async () => {
      const result = await setupFive();
      act(() => {
        result.current.toggleSelected("a");
        result.current.toggleSelected("b");
      });

      listPhotosMock.mockResolvedValue({ ok: true, photos: [makePhoto({ id: "b" })] });
      await act(async () => {
        await result.current.reload();
      });

      expect(result.current.selected).toEqual(new Set(["b"]));
    });
  });
});
