// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const compressMock = vi.fn(async (file: File) => file);
vi.mock("browser-image-compression", () => ({
  default: (file: File) => compressMock(file),
}));

const exifParseMock = vi.fn(async () => ({}));
vi.mock("exifr", () => ({
  default: { parse: () => exifParseMock() },
}));

const uploadPhotoMock = vi.fn();
const patchPhotoMock = vi.fn();
const deletePhotoMock = vi.fn();
const tagPhotoMock = vi.fn();
const listPhotosMock = vi.fn();
vi.mock("@/lib/admin-api", () => ({
  uploadPhoto: (...args: unknown[]) => uploadPhotoMock(...args),
  patchPhoto: (...args: unknown[]) => patchPhotoMock(...args),
  deletePhoto: (...args: unknown[]) => deletePhotoMock(...args),
  tagPhoto: (...args: unknown[]) => tagPhotoMock(...args),
  listPhotos: (...args: unknown[]) => listPhotosMock(...args),
}));

import { useUploadQueue } from "@/components/admin/useUploadQueue";

function makeFile(name: string) {
  return new File(["x"], name, { type: "image/jpeg" });
}

function makePhoto(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    title: "A",
    slug: "a",
    storageKey: "key-a",
    published: false,
    tags: [] as string[],
    caption: null,
    location: null,
    format: "DIGITAL",
    featured: false,
    ...overrides,
  };
}

beforeEach(() => {
  (globalThis.URL as unknown as { createObjectURL: () => string }).createObjectURL = vi.fn(() => "blob:mock");
  (globalThis.URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = vi.fn();
  tagPhotoMock.mockResolvedValue({ ok: true, tags: [], location: "", caption: "" });
  listPhotosMock.mockReset();
  listPhotosMock.mockResolvedValue({ ok: true, photos: [] });
});

describe("useUploadQueue tag suggestions", () => {
  it("starts with the default TAG_OPTIONS before the fetch resolves", () => {
    listPhotosMock.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useUploadQueue());
    expect(result.current.tagSuggestions).toContain("landscape");
  });

  it("merges tags from listPhotos() into TAG_OPTIONS, deduped and sorted case-insensitively", async () => {
    listPhotosMock.mockResolvedValue({
      ok: true,
      photos: [
        makePhoto({ tags: ["Zebra", "landscape"] }),
        makePhoto({ tags: ["apple", "zebra"] }),
      ],
    });
    const { result } = renderHook(() => useUploadQueue());

    await waitFor(() => {
      expect(result.current.tagSuggestions).toContain("apple");
    });

    const suggestions = result.current.tagSuggestions;
    expect(suggestions.filter((t) => t.toLowerCase() === "zebra")).toHaveLength(1);
    expect(suggestions.filter((t) => t.toLowerCase() === "landscape")).toHaveLength(1);
    const sorted = [...suggestions].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    expect(suggestions).toEqual(sorted);
  });

  it("keeps the default suggestions when listPhotos() fails", async () => {
    listPhotosMock.mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useUploadQueue());

    await waitFor(() => {
      expect(listPhotosMock).toHaveBeenCalled();
    });
    expect(result.current.tagSuggestions).toContain("landscape");
  });

  it("keeps the default suggestions when listPhotos() reports ok: false", async () => {
    listPhotosMock.mockResolvedValue({ ok: false, error: "nope" });
    const { result } = renderHook(() => useUploadQueue());

    await waitFor(() => {
      expect(listPhotosMock).toHaveBeenCalled();
    });
    expect(result.current.tagSuggestions).toEqual(expect.arrayContaining(["landscape"]));
  });
});

describe("useUploadQueue", () => {
  it("adds files as queued items", () => {
    uploadPhotoMock.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useUploadQueue());

    act(() => {
      result.current.add([makeFile("a.jpg"), makeFile("b.jpg")]);
    });

    expect(result.current.items.map((i) => i.file.name)).toEqual(["a.jpg", "b.jpg"]);
    expect(result.current.items.every((i) => i.status === "queued")).toBe(true);
  });

  it("processes at most 3 items concurrently, leaving the rest queued", async () => {
    uploadPhotoMock.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useUploadQueue());

    act(() => {
      result.current.add([1, 2, 3, 4, 5].map((n) => makeFile(`f${n}.jpg`)));
    });

    await waitFor(() => {
      const active = result.current.items.filter((i) => i.status !== "queued");
      expect(active).toHaveLength(3);
    });

    const stillQueued = result.current.items.filter((i) => i.status === "queued");
    expect(stillQueued).toHaveLength(2);
  });

  it("marks an item duplicate on a 409-style response", async () => {
    uploadPhotoMock.mockResolvedValue({ ok: false, error: "already uploaded as A", existingId: "existing-1" });
    const { result } = renderHook(() => useUploadQueue());

    act(() => {
      result.current.add([makeFile("dup.jpg")]);
    });

    await waitFor(() => {
      expect(result.current.items[0].status).toBe("duplicate");
    });
    expect(result.current.items[0].existingId).toBe("existing-1");
  });

  it("marks an item ready after a successful upload and tagging pass", async () => {
    const photo = makePhoto();
    uploadPhotoMock.mockResolvedValue({ ok: true, photo });
    const { result } = renderHook(() => useUploadQueue());

    act(() => {
      result.current.add([makeFile("ok.jpg")]);
    });

    await waitFor(() => {
      expect(result.current.items[0].status).toBe("ready");
    });
    expect(result.current.items[0].photo).toEqual(photo);
    expect(tagPhotoMock).toHaveBeenCalledWith("key-a");
  });

  it("only patches empty fields with AI tagging suggestions", async () => {
    const photo = makePhoto({ tags: [], caption: null, location: "Known place" });
    uploadPhotoMock.mockResolvedValue({ ok: true, photo });
    tagPhotoMock.mockResolvedValue({ ok: true, tags: ["landscape"], location: "Suggested place", caption: "A view" });
    const patched = { ...photo, tags: ["landscape"], caption: "A view" };
    patchPhotoMock.mockResolvedValue({ ok: true, photo: patched });
    const { result } = renderHook(() => useUploadQueue());

    act(() => {
      result.current.add([makeFile("ok.jpg")]);
    });

    await waitFor(() => {
      expect(result.current.items[0].status).toBe("ready");
    });
    expect(patchPhotoMock).toHaveBeenCalledWith("p1", { tags: ["landscape"], caption: "A view" });
    expect(result.current.items[0].photo).toEqual(patched);
  });

  it("publish PATCHes { published: true }", async () => {
    const photo = makePhoto();
    uploadPhotoMock.mockResolvedValue({ ok: true, photo });
    patchPhotoMock.mockResolvedValue({ ok: true, photo: { ...photo, published: true } });
    const { result } = renderHook(() => useUploadQueue());

    act(() => {
      result.current.add([makeFile("ok.jpg")]);
    });
    await waitFor(() => expect(result.current.items[0].status).toBe("ready"));

    await act(async () => {
      await result.current.publish(result.current.items[0].localId);
    });

    expect(patchPhotoMock).toHaveBeenCalledWith("p1", { published: true });
    expect(result.current.items[0].status).toBe("published");
  });

  it("remove calls deletePhoto when the item already has a row", async () => {
    const photo = makePhoto();
    uploadPhotoMock.mockResolvedValue({ ok: true, photo });
    deletePhotoMock.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useUploadQueue());

    act(() => {
      result.current.add([makeFile("ok.jpg")]);
    });
    await waitFor(() => expect(result.current.items[0].status).toBe("ready"));

    await act(async () => {
      await result.current.remove(result.current.items[0].localId);
    });

    expect(deletePhotoMock).toHaveBeenCalledWith("p1");
    expect(result.current.items).toHaveLength(0);
  });

  it("remove keeps the item and sets an error when deletePhoto reports failure", async () => {
    const photo = makePhoto();
    uploadPhotoMock.mockResolvedValue({ ok: true, photo });
    deletePhotoMock.mockResolvedValue({ ok: false, error: "locked" });
    const { result } = renderHook(() => useUploadQueue());

    act(() => {
      result.current.add([makeFile("ok.jpg")]);
    });
    await waitFor(() => expect(result.current.items[0].status).toBe("ready"));

    await act(async () => {
      await result.current.remove(result.current.items[0].localId);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].error).toBe("Couldn't remove: locked");
  });

  it("clears the saved-flash timer on unmount", async () => {
    const photo = makePhoto();
    uploadPhotoMock.mockResolvedValue({ ok: true, photo });
    patchPhotoMock.mockResolvedValue({ ok: true, photo: { ...photo, title: "New" } });
    const { result, unmount } = renderHook(() => useUploadQueue());

    act(() => {
      result.current.add([makeFile("ok.jpg")]);
    });
    await waitFor(() => expect(result.current.items[0].status).toBe("ready"));

    await act(async () => {
      await result.current.updatePhoto(result.current.items[0].localId, { title: "New" });
    });
    expect(result.current.items[0].saved).toBe(true);

    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it("remove does not call deletePhoto when the item has no row yet", async () => {
    uploadPhotoMock.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useUploadQueue());

    act(() => {
      result.current.add([makeFile("pending.jpg")]);
    });

    await act(async () => {
      await result.current.remove(result.current.items[0].localId);
    });

    expect(deletePhotoMock).not.toHaveBeenCalled();
    expect(result.current.items).toHaveLength(0);
  });

  it("revokes any remaining preview URLs on unmount", () => {
    uploadPhotoMock.mockReturnValue(new Promise(() => {}));
    const { result, unmount } = renderHook(() => useUploadQueue());

    act(() => {
      result.current.add([makeFile("pending.jpg")]);
    });
    const previewUrl = result.current.items[0].previewUrl;

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(previewUrl);
  });
});
