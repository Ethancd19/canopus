// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listCollectionsMock = vi.fn();
const createCollectionMock = vi.fn();
vi.mock("@/lib/admin-api", () => ({
  listCollections: (...args: unknown[]) => listCollectionsMock(...args),
  createCollection: (...args: unknown[]) => createCollectionMock(...args),
}));

import { useCollections } from "@/components/admin/useCollections";

function makeCollection(overrides: Record<string, unknown> = {}) {
  return {
    id: "c1",
    slug: "dunes",
    title: "Dunes",
    description: null,
    coverId: null,
    cover: null,
    published: false,
    order: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    _count: { photos: 3 },
    ...overrides,
  };
}

beforeEach(() => {
  listCollectionsMock.mockReset();
  createCollectionMock.mockReset();
});

describe("useCollections", () => {
  it("loads collections", async () => {
    const collections = [makeCollection({ id: "a" }), makeCollection({ id: "b" })];
    listCollectionsMock.mockResolvedValue({ ok: true, collections });
    const { result } = renderHook(() => useCollections());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.collections.map((c) => c.id)).toEqual(["a", "b"]);
    expect(result.current.error).toBeNull();
  });

  it("sets error to the server message when listCollections fails", async () => {
    listCollectionsMock.mockResolvedValue({ ok: false, error: "network blip" });
    const { result } = renderHook(() => useCollections());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("network blip");
    expect(result.current.collections).toEqual([]);
  });

  it("create() succeeds and reloads the list", async () => {
    listCollectionsMock.mockResolvedValueOnce({ ok: true, collections: [] });
    const { result } = renderHook(() => useCollections());
    await waitFor(() => expect(result.current.loading).toBe(false));

    createCollectionMock.mockResolvedValue({ ok: true, collection: makeCollection({ id: "new" }) });
    listCollectionsMock.mockResolvedValueOnce({ ok: true, collections: [makeCollection({ id: "new" })] });

    let createResult!: Awaited<ReturnType<typeof result.current.create>>;
    await act(async () => {
      createResult = await result.current.create("New set");
    });

    expect(createCollectionMock).toHaveBeenCalledWith({ title: "New set" });
    expect(createResult.ok).toBe(true);
    expect(result.current.collections.map((c) => c.id)).toEqual(["new"]);
  });

  it("create() surfaces the error and leaves the list unchanged on failure", async () => {
    const collections = [makeCollection({ id: "a" })];
    listCollectionsMock.mockResolvedValue({ ok: true, collections });
    const { result } = renderHook(() => useCollections());
    await waitFor(() => expect(result.current.loading).toBe(false));

    createCollectionMock.mockResolvedValue({ ok: false, error: "title required" });

    let createResult!: Awaited<ReturnType<typeof result.current.create>>;
    await act(async () => {
      createResult = await result.current.create("");
    });

    expect(createResult).toEqual({ ok: false, error: "title required" });
    expect(result.current.collections.map((c) => c.id)).toEqual(["a"]);
  });
});
