// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCollectionMock = vi.fn();
const patchCollectionMock = vi.fn();
const deleteCollectionMock = vi.fn();
const setCollectionPhotosMock = vi.fn();
const addCollectionPhotosMock = vi.fn();
const removeCollectionPhotosMock = vi.fn();
vi.mock("@/lib/admin-api", () => ({
  getCollection: (...args: unknown[]) => getCollectionMock(...args),
  patchCollection: (...args: unknown[]) => patchCollectionMock(...args),
  deleteCollection: (...args: unknown[]) => deleteCollectionMock(...args),
  setCollectionPhotos: (...args: unknown[]) => setCollectionPhotosMock(...args),
  addCollectionPhotos: (...args: unknown[]) => addCollectionPhotosMock(...args),
  removeCollectionPhotos: (...args: unknown[]) => removeCollectionPhotosMock(...args),
}));

import { useCollection } from "@/components/admin/useCollection";

function makePhoto(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: `Photo ${id}`,
    slug: `photo-${id}`,
    storageKey: `photos/${id}.jpg`,
    blurDataUrl: null,
    published: true,
    featured: false,
    order: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    format: "DIGITAL",
    tags: [] as string[],
    location: null,
    caption: null,
    ...overrides,
  };
}

function makeCollectionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "col1",
    slug: "dunes",
    title: "Dunes",
    description: null,
    coverId: null,
    published: false,
    order: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeMember(photoId: string, order: number, photoOverrides: Record<string, unknown> = {}) {
  return { collectionId: "col1", photoId, order, photo: makePhoto(photoId, photoOverrides) };
}

beforeEach(() => {
  getCollectionMock.mockReset();
  patchCollectionMock.mockReset();
  deleteCollectionMock.mockReset();
  setCollectionPhotosMock.mockReset();
  addCollectionPhotosMock.mockReset();
  removeCollectionPhotosMock.mockReset();
});

describe("useCollection", () => {
  it("loads the collection and its ordered members", async () => {
    getCollectionMock.mockResolvedValue({
      ok: true,
      collection: makeCollectionRow(),
      photos: [makeMember("p1", 0), makeMember("p2", 1)],
    });
    const { result } = renderHook(() => useCollection("col1"));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.collection?.title).toBe("Dunes");
    expect(result.current.members.map((m) => m.photoId)).toEqual(["p1", "p2"]);
    expect(result.current.notFound).toBe(false);
    expect(result.current.dirty).toBe(false);
  });

  it("sets notFound when the API returns the not-found error", async () => {
    getCollectionMock.mockResolvedValue({ ok: false, error: "collection not found" });
    const { result } = renderHook(() => useCollection("missing"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notFound).toBe(true);
    expect(result.current.collection).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("sets a generic error for a non-404 failure", async () => {
    getCollectionMock.mockResolvedValue({ ok: false, error: "server exploded" });
    const { result } = renderHook(() => useCollection("col1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notFound).toBe(false);
    expect(result.current.error).toBe("server exploded");
  });

  it("marks dirty after setField changes a field", async () => {
    getCollectionMock.mockResolvedValue({ ok: true, collection: makeCollectionRow(), photos: [] });
    const { result } = renderHook(() => useCollection("col1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.dirty).toBe(false);
    act(() => result.current.setField({ title: "New title" }));
    expect(result.current.dirty).toBe(true);
    expect(result.current.collection?.title).toBe("New title");
  });

  it("save() PATCHes only the changed fields and skips setCollectionPhotos when order is unchanged", async () => {
    getCollectionMock.mockResolvedValueOnce({
      ok: true,
      collection: makeCollectionRow(),
      photos: [makeMember("p1", 0)],
    });
    const { result } = renderHook(() => useCollection("col1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setField({ title: "New title" }));

    patchCollectionMock.mockResolvedValue({ ok: true, collection: makeCollectionRow({ title: "New title" }) });
    getCollectionMock.mockResolvedValueOnce({
      ok: true,
      collection: makeCollectionRow({ title: "New title" }),
      photos: [makeMember("p1", 0)],
    });

    await act(async () => {
      await result.current.save();
    });

    expect(patchCollectionMock).toHaveBeenCalledWith("col1", { title: "New title" });
    expect(setCollectionPhotosMock).not.toHaveBeenCalled();
    expect(result.current.dirty).toBe(false);
  });

  it("save() calls setCollectionPhotos when the member order changed", async () => {
    getCollectionMock.mockResolvedValueOnce({
      ok: true,
      collection: makeCollectionRow(),
      photos: [makeMember("p1", 0), makeMember("p2", 1)],
    });
    const { result } = renderHook(() => useCollection("col1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.move(["p2", "p1"]));
    expect(result.current.dirty).toBe(true);

    setCollectionPhotosMock.mockResolvedValue({ ok: true, count: 2 });
    // save() refetches *before* PUTting (to merge in any server-side
    // membership change) - the server still has the pre-reorder order here,
    // since nothing else touched it.
    getCollectionMock.mockResolvedValueOnce({
      ok: true,
      collection: makeCollectionRow(),
      photos: [makeMember("p1", 0), makeMember("p2", 1)],
    });

    await act(async () => {
      await result.current.save();
    });

    expect(patchCollectionMock).not.toHaveBeenCalled();
    expect(setCollectionPhotosMock).toHaveBeenCalledWith("col1", ["p2", "p1"]);
    expect(result.current.members.map((m) => m.photoId)).toEqual(["p2", "p1"]);
    expect(result.current.dirty).toBe(false);
  });

  it("save() refetches before PUTting so a member added elsewhere since mount isn't dropped", async () => {
    getCollectionMock.mockResolvedValueOnce({
      ok: true,
      collection: makeCollectionRow(),
      photos: [makeMember("p1", 0), makeMember("p2", 1)],
    });
    const { result } = renderHook(() => useCollection("col1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Reorder locally - this is what makes save() need to PUT at all.
    act(() => result.current.move(["p2", "p1"]));
    expect(result.current.dirty).toBe(true);

    setCollectionPhotosMock.mockResolvedValue({ ok: true, count: 3 });
    // Meanwhile, a bulk "Add to collection" from the Library added p3 on
    // the server - this hook doesn't know about it until save()'s refetch.
    getCollectionMock.mockResolvedValueOnce({
      ok: true,
      collection: makeCollectionRow(),
      photos: [makeMember("p1", 0), makeMember("p2", 1), makeMember("p3", 2)],
    });

    await act(async () => {
      await result.current.save();
    });

    // The PUT includes p3, appended at the end - not just the stale local
    // ["p2", "p1"], which would have silently removed it.
    expect(setCollectionPhotosMock).toHaveBeenCalledWith("col1", ["p2", "p1", "p3"]);
    expect(result.current.members.map((m) => m.photoId)).toEqual(["p2", "p1", "p3"]);
    expect(result.current.dirty).toBe(false);
  });

  it("save() refetches and merges (not full-replaces) when the field patch succeeds but the order PUT fails", async () => {
    getCollectionMock.mockResolvedValueOnce({
      ok: true,
      collection: makeCollectionRow({ title: "Dunes" }),
      photos: [makeMember("p1", 0), makeMember("p2", 1)],
    });
    const { result } = renderHook(() => useCollection("col1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setField({ title: "New title" }));
    act(() => result.current.move(["p2", "p1"]));
    expect(result.current.dirty).toBe(true);

    patchCollectionMock.mockResolvedValue({ ok: true, collection: makeCollectionRow({ title: "New title" }) });
    // The refetch after the successful patch sees the server's new title,
    // but membership hasn't changed (the PUT hasn't happened yet).
    getCollectionMock.mockResolvedValueOnce({
      ok: true,
      collection: makeCollectionRow({ title: "New title" }),
      photos: [makeMember("p1", 0), makeMember("p2", 1)],
    });
    setCollectionPhotosMock.mockResolvedValue({ ok: false, error: "network error" });

    const result_ = await act(async () => result.current.save());

    expect(result_).toEqual({ ok: false, error: "network error" });
    // The title patch landed - baseline (and therefore Reset) must reflect
    // it, not the stale pre-save "Dunes", even though the overall save()
    // failed.
    expect(result.current.collection?.title).toBe("New title");
    // Only the still-unsaved order remains dirty.
    expect(result.current.dirty).toBe(true);
    act(() => result.current.reset());
    expect(result.current.collection?.title).toBe("New title");
    expect(result.current.members.map((m) => m.photoId)).toEqual(["p1", "p2"]);
  });

  it("save() keeps a server-added member visible when the order PUT fails", async () => {
    getCollectionMock.mockResolvedValueOnce({
      ok: true,
      collection: makeCollectionRow(),
      photos: [makeMember("p1", 0), makeMember("p2", 1)],
    });
    const { result } = renderHook(() => useCollection("col1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.move(["p2", "p1"]));
    // p3 was added elsewhere; the refetch inside save() sees it.
    getCollectionMock.mockResolvedValueOnce({
      ok: true,
      collection: makeCollectionRow(),
      photos: [makeMember("p1", 0), makeMember("p2", 1), makeMember("p3", 2)],
    });
    setCollectionPhotosMock.mockResolvedValue({ ok: false, error: "network error" });

    await act(async () => {
      await result.current.save();
    });

    expect(setCollectionPhotosMock).toHaveBeenCalledWith("col1", ["p2", "p1", "p3"]);
    // The failed PUT must not hide p3: the rendered list is the merged order,
    // still dirty against the server's [p1, p2, p3].
    expect(result.current.members.map((m) => m.photoId)).toEqual(["p2", "p1", "p3"]);
    expect(result.current.dirty).toBe(true);
    expect(result.current.error).toBe("network error");
  });

  it("removePhoto clears the cover when the removed photo was the current cover", async () => {
    getCollectionMock.mockResolvedValueOnce({
      ok: true,
      collection: makeCollectionRow({ coverId: "p1" }),
      photos: [makeMember("p1", 0), makeMember("p2", 1)],
    });
    const { result } = renderHook(() => useCollection("col1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.collection?.coverId).toBe("p1");

    removeCollectionPhotosMock.mockResolvedValue({ ok: true, count: 1 });
    patchCollectionMock.mockResolvedValue({ ok: true, collection: makeCollectionRow({ coverId: null }) });
    getCollectionMock.mockResolvedValueOnce({
      ok: true,
      collection: makeCollectionRow({ coverId: null }),
      photos: [makeMember("p2", 0)],
    });

    await act(async () => {
      await result.current.removePhoto("p1");
    });

    expect(removeCollectionPhotosMock).toHaveBeenCalledWith("col1", ["p1"]);
    expect(patchCollectionMock).toHaveBeenCalledWith("col1", { coverId: null });
    expect(result.current.members.map((m) => m.photoId)).toEqual(["p2"]);
    expect(result.current.collection?.coverId).toBeNull();
  });

  it("removePhoto does not touch the cover when removing a non-cover photo", async () => {
    getCollectionMock.mockResolvedValueOnce({
      ok: true,
      collection: makeCollectionRow({ coverId: "p1" }),
      photos: [makeMember("p1", 0), makeMember("p2", 1)],
    });
    const { result } = renderHook(() => useCollection("col1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    removeCollectionPhotosMock.mockResolvedValue({ ok: true, count: 1 });
    getCollectionMock.mockResolvedValueOnce({
      ok: true,
      collection: makeCollectionRow({ coverId: "p1" }),
      photos: [makeMember("p1", 0)],
    });

    await act(async () => {
      await result.current.removePhoto("p2");
    });

    expect(removeCollectionPhotosMock).toHaveBeenCalledWith("col1", ["p2"]);
    expect(patchCollectionMock).not.toHaveBeenCalled();
  });

  it("removePhoto's refetch preserves an unsaved title edit instead of discarding it", async () => {
    getCollectionMock.mockResolvedValueOnce({
      ok: true,
      collection: makeCollectionRow(),
      photos: [makeMember("p1", 0), makeMember("p2", 1)],
    });
    const { result } = renderHook(() => useCollection("col1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setField({ title: "Edited title" }));
    expect(result.current.dirty).toBe(true);

    removeCollectionPhotosMock.mockResolvedValue({ ok: true, count: 1 });
    // The server still has the old title - it was never saved.
    getCollectionMock.mockResolvedValueOnce({
      ok: true,
      collection: makeCollectionRow(),
      photos: [makeMember("p1", 0)],
    });

    await act(async () => {
      await result.current.removePhoto("p2");
    });

    expect(result.current.members.map((m) => m.photoId)).toEqual(["p1"]);
    expect(result.current.collection?.title).toBe("Edited title");
    expect(result.current.dirty).toBe(true);
  });

  it("addPhotos' refetch preserves an unsaved title edit instead of discarding it", async () => {
    getCollectionMock.mockResolvedValueOnce({
      ok: true,
      collection: makeCollectionRow(),
      photos: [makeMember("p1", 0)],
    });
    const { result } = renderHook(() => useCollection("col1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setField({ title: "Edited title" }));
    expect(result.current.dirty).toBe(true);

    addCollectionPhotosMock.mockResolvedValue({ ok: true, count: 1 });
    // The server still has the old title - it was never saved.
    getCollectionMock.mockResolvedValueOnce({
      ok: true,
      collection: makeCollectionRow(),
      photos: [makeMember("p1", 0), makeMember("p2", 1)],
    });

    await act(async () => {
      await result.current.addPhotos(["p2"]);
    });

    expect(result.current.members.map((m) => m.photoId)).toEqual(["p1", "p2"]);
    expect(result.current.collection?.title).toBe("Edited title");
    expect(result.current.dirty).toBe(true);
  });

  it("save() fully replaces the draft with the server's values, clearing dirty", async () => {
    getCollectionMock.mockResolvedValueOnce({
      ok: true,
      collection: makeCollectionRow(),
      photos: [makeMember("p1", 0)],
    });
    const { result } = renderHook(() => useCollection("col1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setField({ title: "New title" }));
    expect(result.current.dirty).toBe(true);

    patchCollectionMock.mockResolvedValue({ ok: true, collection: makeCollectionRow({ title: "New title" }) });
    getCollectionMock.mockResolvedValueOnce({
      ok: true,
      collection: makeCollectionRow({ title: "New title" }),
      photos: [makeMember("p1", 0)],
    });

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.collection?.title).toBe("New title");
    expect(result.current.dirty).toBe(false);
  });

  it("member order merge keeps the dragged relative order and appends newly added members", async () => {
    getCollectionMock.mockResolvedValueOnce({
      ok: true,
      collection: makeCollectionRow(),
      photos: [makeMember("p1", 0), makeMember("p2", 1)],
    });
    const { result } = renderHook(() => useCollection("col1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.move(["p2", "p1"]));
    expect(result.current.dirty).toBe(true);

    addCollectionPhotosMock.mockResolvedValue({ ok: true, count: 1 });
    // Server appends the new member after the *pre-reorder* members, as
    // `POST .../photos` does (order isn't persisted client-side yet).
    getCollectionMock.mockResolvedValueOnce({
      ok: true,
      collection: makeCollectionRow(),
      photos: [makeMember("p1", 0), makeMember("p2", 1), makeMember("p3", 2)],
    });

    await act(async () => {
      await result.current.addPhotos(["p3"]);
    });

    expect(result.current.members.map((m) => m.photoId)).toEqual(["p2", "p1", "p3"]);
  });
});
