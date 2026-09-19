import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin-fetch", () => ({ adminFetch: vi.fn() }));

import { adminFetch } from "@/lib/admin-fetch";
import {
  addCollectionPhotos,
  bulkPhotos,
  createCollection,
  deleteCollection,
  deletePhoto,
  getCollection,
  listCollections,
  listPhotos,
  orderPhotos,
  patchCollection,
  patchPhoto,
  removeCollectionPhotos,
  setCollectionPhotos,
  tagPhoto,
  uploadPhoto,
} from "@/lib/admin-api";

const mockedFetch = vi.mocked(adminFetch);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("admin-api", () => {
  it("uploadPhoto posts a multipart form with the file and text fields", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ ok: true, photo: { id: "1" } }));
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });

    const result = await uploadPhoto(file, { camera: "Leica", force: "1" });

    expect(result).toEqual({ ok: true, photo: { id: "1" } });
    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("/api/admin/uploads");
    expect(init?.method).toBe("POST");
    const form = init?.body as FormData;
    expect(form.get("file")).toBeInstanceOf(File);
    expect(form.get("camera")).toBe("Leica");
    expect(form.get("force")).toBe("1");
  });

  it("uploadPhoto surfaces a 409 duplicate body", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ ok: false, error: "already uploaded as A", existingId: "abc" }, 409));
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });

    const result = await uploadPhoto(file);

    expect(result).toEqual({ ok: false, error: "already uploaded as A", existingId: "abc" });
  });

  it("patchPhoto sends a JSON PATCH to the photo id", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ ok: true, photo: { id: "1", published: true } }));

    const result = await patchPhoto("1", { published: true });

    expect(result).toEqual({ ok: true, photo: { id: "1", published: true } });
    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("/api/admin/photo/1");
    expect(init?.method).toBe("PATCH");
    expect(init?.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(JSON.parse(init?.body as string)).toEqual({ published: true });
  });

  it("deletePhoto sends a DELETE to the photo id", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ ok: true }));

    const result = await deletePhoto("1");

    expect(result).toEqual({ ok: true });
    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("/api/admin/photo/1");
    expect(init?.method).toBe("DELETE");
  });

  it("tagPhoto posts the storage key", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ ok: true, tags: ["landscape"], location: "", caption: "" }));

    const result = await tagPhoto("key-1");

    expect(result).toEqual({ ok: true, tags: ["landscape"], location: "", caption: "" });
    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("/api/admin/tags");
    expect(JSON.parse(init?.body as string)).toEqual({ storageKey: "key-1" });
  });

  it("listPhotos fetches the photo list", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ ok: true, photos: [] }));

    const result = await listPhotos();

    expect(result).toEqual({ ok: true, photos: [] });
    expect(mockedFetch).toHaveBeenCalledWith("/api/admin/photos");
  });

  it("bulkPhotos posts ids and action without a payload", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ ok: true, count: 2 }));

    const result = await bulkPhotos(["a", "b"], "publish");

    expect(result).toEqual({ ok: true, count: 2 });
    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("/api/admin/photos/bulk");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(JSON.parse(init?.body as string)).toEqual({ ids: ["a", "b"], action: "publish" });
  });

  it("bulkPhotos includes the payload when given", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ ok: true, count: 1 }));

    const result = await bulkPhotos(["a"], "addTag", { tag: "dunes" });

    expect(result).toEqual({ ok: true, count: 1 });
    const [, init] = mockedFetch.mock.calls[0];
    expect(JSON.parse(init?.body as string)).toEqual({
      ids: ["a"],
      action: "addTag",
      payload: { tag: "dunes" },
    });
  });

  it("orderPhotos sends a PATCH with the id order", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ ok: true, count: 3 }));

    const result = await orderPhotos(["c", "a", "b"]);

    expect(result).toEqual({ ok: true, count: 3 });
    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("/api/admin/photos/order");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(init?.body as string)).toEqual({ ids: ["c", "a", "b"] });
  });

  it("listCollections fetches the collection list", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ ok: true, collections: [] }));

    const result = await listCollections();

    expect(result).toEqual({ ok: true, collections: [] });
    expect(mockedFetch).toHaveBeenCalledWith("/api/admin/collections");
  });

  it("createCollection posts the title and description", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ ok: true, collection: { id: "c1" } }));

    const result = await createCollection({ title: "Dunes", description: "Sand" });

    expect(result).toEqual({ ok: true, collection: { id: "c1" } });
    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("/api/admin/collections");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ title: "Dunes", description: "Sand" });
  });

  it("getCollection fetches the collection by id", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ ok: true, collection: { id: "c1" }, photos: [] }));

    const result = await getCollection("c1");

    expect(result).toEqual({ ok: true, collection: { id: "c1" }, photos: [] });
    expect(mockedFetch).toHaveBeenCalledWith("/api/admin/collections/c1");
  });

  it("patchCollection sends a JSON PATCH to the collection id", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ ok: true, collection: { id: "c1", published: true } }));

    const result = await patchCollection("c1", { published: true });

    expect(result).toEqual({ ok: true, collection: { id: "c1", published: true } });
    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("/api/admin/collections/c1");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(init?.body as string)).toEqual({ published: true });
  });

  it("deleteCollection sends a DELETE to the collection id", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ ok: true }));

    const result = await deleteCollection("c1");

    expect(result).toEqual({ ok: true });
    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("/api/admin/collections/c1");
    expect(init?.method).toBe("DELETE");
  });

  it("setCollectionPhotos sends a PUT with the ordered ids", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ ok: true, count: 2 }));

    const result = await setCollectionPhotos("c1", ["p2", "p1"]);

    expect(result).toEqual({ ok: true, count: 2 });
    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("/api/admin/collections/c1/photos");
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(init?.body as string)).toEqual({ ids: ["p2", "p1"] });
  });

  it("addCollectionPhotos sends a POST with the ids", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ ok: true, count: 1 }));

    const result = await addCollectionPhotos("c1", ["p1"]);

    expect(result).toEqual({ ok: true, count: 1 });
    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("/api/admin/collections/c1/photos");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ ids: ["p1"] });
  });

  it("removeCollectionPhotos sends a DELETE with the ids", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ ok: true, count: 1 }));

    const result = await removeCollectionPhotos("c1", ["p1"]);

    expect(result).toEqual({ ok: true, count: 1 });
    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("/api/admin/collections/c1/photos");
    expect(init?.method).toBe("DELETE");
    expect(JSON.parse(init?.body as string)).toEqual({ ids: ["p1"] });
  });
});
