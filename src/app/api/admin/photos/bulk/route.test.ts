import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    photo: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
    collection: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    collectionPhoto: {
      aggregate: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));
const { bucketDelete } = vi.hoisted(() => ({ bucketDelete: vi.fn() }));
vi.mock("@/lib/cloudflare", () => ({ getEnv: () => ({ PHOTOS: { delete: bucketDelete } }) }));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { POST } from "./route";

const mockedAuth = vi.mocked(auth);
const updateMany = vi.mocked(db.photo.updateMany);
const findMany = vi.mocked(db.photo.findMany);
const deleteMany = vi.mocked(db.photo.deleteMany);
const update = vi.mocked(db.photo.update);
const collectionFindUnique = vi.mocked(db.collection.findUnique);
const collectionUpdateMany = vi.mocked(db.collection.updateMany);
const aggregate = vi.mocked(db.collectionPhoto.aggregate);
const createMany = vi.mocked(db.collectionPhoto.createMany);
const cpDeleteMany = vi.mocked(db.collectionPhoto.deleteMany);

function req(body: unknown) {
  return new Request("http://localhost/api/admin/photos/bulk", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/photos/bulk", () => {
  beforeEach(() => {
    mockedAuth.mockReset();
    updateMany.mockReset();
    findMany.mockReset();
    deleteMany.mockReset();
    update.mockReset();
    collectionFindUnique.mockReset();
    collectionUpdateMany.mockReset();
    aggregate.mockReset();
    createMany.mockReset();
    cpDeleteMany.mockReset();
    bucketDelete.mockReset();
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
  });

  it("rejects unauthenticated requests", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await POST(req({ ids: ["a"], action: "publish" }));
    expect(res.status).toBe(401);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body", async () => {
    const res = await POST(req({ ids: [], action: "publish" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid action", async () => {
    const res = await POST(req({ ids: ["a"], action: "nuke" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when addTag is missing a tag", async () => {
    const res = await POST(req({ ids: ["a"], action: "addTag" }));
    expect(res.status).toBe(400);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("returns 400 when addToCollection is missing a collectionId", async () => {
    const res = await POST(req({ ids: ["a"], action: "addToCollection" }));
    expect(res.status).toBe(400);
    expect(createMany).not.toHaveBeenCalled();
  });

  it("publish sets published true via updateMany", async () => {
    updateMany.mockResolvedValue({ count: 2 } as never);
    const res = await POST(req({ ids: ["a", "b"], action: "publish" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, count: 2 });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["a", "b"] } },
      data: { published: true },
    });
  });

  it("unpublish sets published false via updateMany", async () => {
    updateMany.mockResolvedValue({ count: 1 } as never);
    const res = await POST(req({ ids: ["a"], action: "unpublish" }));
    expect(res.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["a"] } },
      data: { published: false },
    });
  });

  it("addTag loads rows, dedupes, and updates each", async () => {
    findMany.mockResolvedValue([
      { id: "a", tags: ["dune"] },
      { id: "b", tags: ["dune", "sand"] },
    ] as never);
    update.mockResolvedValue({} as never);
    const res = await POST(req({ ids: ["a", "b"], action: "addTag", payload: { tag: " Sand " } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, count: 2 });
    expect(findMany).toHaveBeenCalledWith({
      where: { id: { in: ["a", "b"] } },
      select: { id: true, tags: true },
    });
    expect(update).toHaveBeenCalledWith({ where: { id: "a" }, data: { tags: ["dune", "sand"] } });
    expect(update).toHaveBeenCalledWith({ where: { id: "b" }, data: { tags: ["dune", "sand"] } });
  });

  it("removeTag loads rows and strips the tag from each", async () => {
    findMany.mockResolvedValue([
      { id: "a", tags: ["dune", "sand"] },
      { id: "b", tags: ["sand"] },
    ] as never);
    update.mockResolvedValue({} as never);
    const res = await POST(req({ ids: ["a", "b"], action: "removeTag", payload: { tag: "sand" } }));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ where: { id: "a" }, data: { tags: ["dune"] } });
    expect(update).toHaveBeenCalledWith({ where: { id: "b" }, data: { tags: [] } });
  });

  it("delete loads rows, deletes them, and best-effort deletes their objects", async () => {
    findMany.mockResolvedValue([
      { id: "a", storageKey: "photos/a.jpg" },
      { id: "b", storageKey: null },
    ] as never);
    deleteMany.mockResolvedValue({ count: 2 } as never);
    const res = await POST(req({ ids: ["a", "b"], action: "delete" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, count: 2 });
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["a", "b"] } } });
    expect(bucketDelete).toHaveBeenCalledTimes(1);
    expect(bucketDelete).toHaveBeenCalledWith("photos/a.jpg");
  });

  it("delete reports deleteMany's count, not the number of rows loaded", async () => {
    findMany.mockResolvedValue([
      { id: "a", storageKey: "photos/a.jpg" },
      { id: "b", storageKey: "photos/b.jpg" },
    ] as never);
    deleteMany.mockResolvedValue({ count: 1 } as never); // one row vanished between findMany and deleteMany
    const res = await POST(req({ ids: ["a", "b"], action: "delete" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, count: 1 });
  });

  it("delete logs but does not fail when a bucket delete rejects", async () => {
    findMany.mockResolvedValue([{ id: "a", storageKey: "photos/a.jpg" }] as never);
    deleteMany.mockResolvedValue({ count: 1 } as never);
    bucketDelete.mockRejectedValue(new Error("R2 down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(req({ ids: ["a"], action: "delete" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, count: 1 });
    errSpy.mockRestore();
  });

  it("addToCollection creates rows ordered after the current max, skipping duplicates", async () => {
    collectionFindUnique.mockResolvedValue({ id: "c1" } as never);
    findMany.mockResolvedValue([{ id: "a" }, { id: "b" }] as never);
    aggregate.mockResolvedValue({ _max: { order: 4 } } as never);
    createMany.mockResolvedValue({ count: 2 } as never);
    const res = await POST(req({ ids: ["a", "b"], action: "addToCollection", payload: { collectionId: "c1" } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, count: 2 });
    expect(collectionFindUnique).toHaveBeenCalledWith({ where: { id: "c1" }, select: { id: true } });
    expect(findMany).toHaveBeenCalledWith({ where: { id: { in: ["a", "b"] } }, select: { id: true } });
    expect(aggregate).toHaveBeenCalledWith({ where: { collectionId: "c1" }, _max: { order: true } });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        { collectionId: "c1", photoId: "a", order: 5 },
        { collectionId: "c1", photoId: "b", order: 6 },
      ],
      skipDuplicates: true,
    });
  });

  it("addToCollection starts at order 0 for an empty collection", async () => {
    collectionFindUnique.mockResolvedValue({ id: "c1" } as never);
    findMany.mockResolvedValue([{ id: "a" }] as never);
    aggregate.mockResolvedValue({ _max: { order: null } } as never);
    createMany.mockResolvedValue({ count: 1 } as never);
    await POST(req({ ids: ["a"], action: "addToCollection", payload: { collectionId: "c1" } }));
    expect(createMany).toHaveBeenCalledWith({
      data: [{ collectionId: "c1", photoId: "a", order: 0 }],
      skipDuplicates: true,
    });
  });

  it("addToCollection returns 404 when the collection does not exist", async () => {
    collectionFindUnique.mockResolvedValue(null);
    const res = await POST(req({ ids: ["a"], action: "addToCollection", payload: { collectionId: "missing" } }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, error: "collection not found" });
    expect(findMany).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });

  it("addToCollection skips a stale photo id that no longer exists", async () => {
    collectionFindUnique.mockResolvedValue({ id: "c1" } as never);
    findMany.mockResolvedValue([{ id: "a" }] as never); // "gone" is not returned
    aggregate.mockResolvedValue({ _max: { order: null } } as never);
    createMany.mockResolvedValue({ count: 1 } as never);
    const res = await POST(req({ ids: ["a", "gone"], action: "addToCollection", payload: { collectionId: "c1" } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, count: 1 });
    expect(createMany).toHaveBeenCalledWith({
      data: [{ collectionId: "c1", photoId: "a", order: 0 }],
      skipDuplicates: true,
    });
  });

  it("removeFromCollection deletes matching join rows", async () => {
    cpDeleteMany.mockResolvedValue({ count: 2 } as never);
    collectionUpdateMany.mockResolvedValue({ count: 0 } as never);
    const res = await POST(req({ ids: ["a", "b"], action: "removeFromCollection", payload: { collectionId: "c1" } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, count: 2 });
    expect(cpDeleteMany).toHaveBeenCalledWith({
      where: { collectionId: "c1", photoId: { in: ["a", "b"] } },
    });
  });

  it("removeFromCollection clears the collection's cover if it was one of the removed photos", async () => {
    cpDeleteMany.mockResolvedValue({ count: 2 } as never);
    collectionUpdateMany.mockResolvedValue({ count: 1 } as never);
    const res = await POST(req({ ids: ["a", "b"], action: "removeFromCollection", payload: { collectionId: "c1" } }));
    expect(res.status).toBe(200);
    expect(collectionUpdateMany).toHaveBeenCalledWith({
      where: { id: "c1", coverId: { in: ["a", "b"] } },
      data: { coverId: null },
    });
  });
});
