import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    collection: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    photo: {
      findMany: vi.fn(),
    },
    collectionPhoto: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { POST, PUT, DELETE } from "./route";

const mockedAuth = vi.mocked(auth);
const collectionFindUnique = vi.mocked(db.collection.findUnique);
const collectionUpdateMany = vi.mocked(db.collection.updateMany);
const photoFindMany = vi.mocked(db.photo.findMany);
const cpFindMany = vi.mocked(db.collectionPhoto.findMany);
const aggregate = vi.mocked(db.collectionPhoto.aggregate);
const createMany = vi.mocked(db.collectionPhoto.createMany);
const deleteMany = vi.mocked(db.collectionPhoto.deleteMany);
const upsert = vi.mocked(db.collectionPhoto.upsert);

const params = Promise.resolve({ id: "c1" });

function req(method: string, body: unknown) {
  return new Request("http://localhost/api/admin/collections/c1/photos", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/collections/[id]/photos", () => {
  beforeEach(() => {
    mockedAuth.mockReset();
    collectionFindUnique.mockReset();
    collectionUpdateMany.mockReset();
    photoFindMany.mockReset();
    cpFindMany.mockReset();
    aggregate.mockReset();
    createMany.mockReset();
    deleteMany.mockReset();
    upsert.mockReset();
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    collectionFindUnique.mockResolvedValue({ id: "c1" } as never);
    collectionUpdateMany.mockResolvedValue({ count: 0 } as never);
  });

  describe("POST (add members)", () => {
    it("rejects unauthenticated requests", async () => {
      mockedAuth.mockResolvedValue(null as never);
      const res = await POST(req("POST", { ids: ["p1"] }), { params });
      expect(res.status).toBe(401);
      expect(createMany).not.toHaveBeenCalled();
    });

    it("returns 400 when ids is not an array of strings", async () => {
      const res = await POST(req("POST", { ids: "p1" }), { params });
      expect(res.status).toBe(400);
      expect(createMany).not.toHaveBeenCalled();
    });

    it("returns 404 for an unknown collection", async () => {
      collectionFindUnique.mockResolvedValue(null as never);
      const res = await POST(req("POST", { ids: ["p1"] }), { params });
      expect(res.status).toBe(404);
      expect(createMany).not.toHaveBeenCalled();
    });

    it("appends new members after the current max order, skipping duplicates", async () => {
      photoFindMany.mockResolvedValue([{ id: "p1" }, { id: "p2" }] as never);
      aggregate.mockResolvedValue({ _max: { order: 2 } } as never);
      createMany.mockResolvedValue({ count: 2 } as never);
      const res = await POST(req("POST", { ids: ["p1", "p2"] }), { params });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, count: 2 });
      expect(photoFindMany).toHaveBeenCalledWith({ where: { id: { in: ["p1", "p2"] } }, select: { id: true } });
      expect(aggregate).toHaveBeenCalledWith({ where: { collectionId: "c1" }, _max: { order: true } });
      expect(createMany).toHaveBeenCalledWith({
        data: [
          { collectionId: "c1", photoId: "p1", order: 3 },
          { collectionId: "c1", photoId: "p2", order: 4 },
        ],
        skipDuplicates: true,
      });
    });

    it("starts at order 0 for an empty collection", async () => {
      photoFindMany.mockResolvedValue([{ id: "p1" }] as never);
      aggregate.mockResolvedValue({ _max: { order: null } } as never);
      createMany.mockResolvedValue({ count: 1 } as never);
      await POST(req("POST", { ids: ["p1"] }), { params });
      expect(createMany).toHaveBeenCalledWith({
        data: [{ collectionId: "c1", photoId: "p1", order: 0 }],
        skipDuplicates: true,
      });
    });

    it("skips a stale id that no longer matches a photo", async () => {
      photoFindMany.mockResolvedValue([{ id: "p1" }] as never);
      aggregate.mockResolvedValue({ _max: { order: null } } as never);
      createMany.mockResolvedValue({ count: 1 } as never);
      const res = await POST(req("POST", { ids: ["p1", "stale"] }), { params });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, count: 1 });
      expect(createMany).toHaveBeenCalledWith({
        data: [{ collectionId: "c1", photoId: "p1", order: 0 }],
        skipDuplicates: true,
      });
    });

    it("collapses duplicate ids to a single membership, keeping first occurrence order", async () => {
      photoFindMany.mockResolvedValue([{ id: "p1" }, { id: "p2" }] as never);
      aggregate.mockResolvedValue({ _max: { order: null } } as never);
      createMany.mockResolvedValue({ count: 2 } as never);
      await POST(req("POST", { ids: ["p1", "p2", "p1"] }), { params });
      expect(photoFindMany).toHaveBeenCalledWith({ where: { id: { in: ["p1", "p2"] } }, select: { id: true } });
      expect(createMany).toHaveBeenCalledWith({
        data: [
          { collectionId: "c1", photoId: "p1", order: 0 },
          { collectionId: "c1", photoId: "p2", order: 1 },
        ],
        skipDuplicates: true,
      });
    });

    it("returns 400 for a blank id", async () => {
      const res = await POST(req("POST", { ids: ["p1", "  "] }), { params });
      expect(res.status).toBe(400);
      expect(photoFindMany).not.toHaveBeenCalled();
    });

    it("returns 400 when ids exceeds the 500 cap", async () => {
      const ids = Array.from({ length: 501 }, (_, i) => `p${i}`);
      const res = await POST(req("POST", { ids }), { params });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ ok: false, error: "ids must not exceed 500" });
      expect(photoFindMany).not.toHaveBeenCalled();
    });
  });

  describe("PUT (replace membership)", () => {
    it("rejects unauthenticated requests", async () => {
      mockedAuth.mockResolvedValue(null as never);
      const res = await PUT(req("PUT", { ids: ["p1"] }), { params });
      expect(res.status).toBe(401);
      expect(upsert).not.toHaveBeenCalled();
    });

    it("returns 404 for an unknown collection", async () => {
      collectionFindUnique.mockResolvedValue(null as never);
      const res = await PUT(req("PUT", { ids: ["p1"] }), { params });
      expect(res.status).toBe(404);
      expect(upsert).not.toHaveBeenCalled();
    });

    it("returns 400 when ids is not an array of strings", async () => {
      const res = await PUT(req("PUT", { ids: [1, 2] }), { params });
      expect(res.status).toBe(400);
      expect(upsert).not.toHaveBeenCalled();
    });

    it("deletes members not in the new list and upserts order for the rest", async () => {
      photoFindMany.mockResolvedValue([{ id: "p1" }, { id: "p2" }] as never);
      cpFindMany.mockResolvedValue([{ photoId: "old1" }, { photoId: "p1" }] as never);
      deleteMany.mockResolvedValue({ count: 1 } as never);
      upsert.mockResolvedValue({} as never);

      const res = await PUT(req("PUT", { ids: ["p1", "p2"] }), { params });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, count: 2 });
      expect(photoFindMany).toHaveBeenCalledWith({ where: { id: { in: ["p1", "p2"] } }, select: { id: true } });
      expect(cpFindMany).toHaveBeenCalledWith({ where: { collectionId: "c1" }, select: { photoId: true } });
      expect(deleteMany).toHaveBeenCalledWith({
        where: { collectionId: "c1", photoId: { in: ["old1"] } },
      });
      expect(upsert).toHaveBeenCalledWith({
        where: { collectionId_photoId: { collectionId: "c1", photoId: "p1" } },
        create: { collectionId: "c1", photoId: "p1", order: 0 },
        update: { order: 0 },
      });
      expect(upsert).toHaveBeenCalledWith({
        where: { collectionId_photoId: { collectionId: "c1", photoId: "p2" } },
        create: { collectionId: "c1", photoId: "p2", order: 1 },
        update: { order: 1 },
      });
    });

    it("skips deleteMany when nothing needs removing", async () => {
      photoFindMany.mockResolvedValue([{ id: "p1" }] as never);
      cpFindMany.mockResolvedValue([{ photoId: "p1" }] as never);
      upsert.mockResolvedValue({} as never);
      const res = await PUT(req("PUT", { ids: ["p1"] }), { params });
      expect(res.status).toBe(200);
      expect(deleteMany).not.toHaveBeenCalled();
    });

    it("clears all membership when ids is empty", async () => {
      cpFindMany.mockResolvedValue([{ photoId: "p1" }, { photoId: "p2" }] as never);
      deleteMany.mockResolvedValue({ count: 2 } as never);
      const res = await PUT(req("PUT", { ids: [] }), { params });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, count: 0 });
      expect(photoFindMany).not.toHaveBeenCalled();
      expect(deleteMany).toHaveBeenCalledWith({
        where: { collectionId: "c1", photoId: { in: ["p1", "p2"] } },
      });
      expect(upsert).not.toHaveBeenCalled();
    });

    it("skips a stale id that no longer matches a photo", async () => {
      photoFindMany.mockResolvedValue([{ id: "p1" }] as never);
      cpFindMany.mockResolvedValue([] as never);
      upsert.mockResolvedValue({} as never);

      const res = await PUT(req("PUT", { ids: ["p1", "stale"] }), { params });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, count: 1 });
      expect(deleteMany).not.toHaveBeenCalled();
      expect(upsert).toHaveBeenCalledTimes(1);
      expect(upsert).toHaveBeenCalledWith({
        where: { collectionId_photoId: { collectionId: "c1", photoId: "p1" } },
        create: { collectionId: "c1", photoId: "p1", order: 0 },
        update: { order: 0 },
      });
    });

    it("collapses duplicate ids to a single membership, keeping first occurrence order", async () => {
      photoFindMany.mockResolvedValue([{ id: "p1" }, { id: "p2" }] as never);
      cpFindMany.mockResolvedValue([] as never);
      upsert.mockResolvedValue({} as never);

      const res = await PUT(req("PUT", { ids: ["p1", "p2", "p1"] }), { params });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, count: 2 });
      expect(photoFindMany).toHaveBeenCalledWith({ where: { id: { in: ["p1", "p2"] } }, select: { id: true } });
      expect(upsert).toHaveBeenCalledTimes(2);
    });

    it("returns 400 when ids exceeds the 500 cap", async () => {
      const ids = Array.from({ length: 501 }, (_, i) => `p${i}`);
      const res = await PUT(req("PUT", { ids }), { params });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ ok: false, error: "ids must not exceed 500" });
      expect(photoFindMany).not.toHaveBeenCalled();
    });

    it("clears the collection's cover when the replacement omits it", async () => {
      photoFindMany.mockResolvedValue([{ id: "p2" }] as never);
      cpFindMany.mockResolvedValue([{ photoId: "p1" }, { photoId: "p2" }] as never);
      deleteMany.mockResolvedValue({ count: 1 } as never);
      upsert.mockResolvedValue({} as never);

      const res = await PUT(req("PUT", { ids: ["p2"] }), { params });

      expect(res.status).toBe(200);
      expect(deleteMany).toHaveBeenCalledWith({ where: { collectionId: "c1", photoId: { in: ["p1"] } } });
      expect(collectionUpdateMany).toHaveBeenCalledWith({
        where: { id: "c1", coverId: { in: ["p1"] } },
        data: { coverId: null },
      });
    });

    it("does not touch the cover when nothing is removed", async () => {
      photoFindMany.mockResolvedValue([{ id: "p1" }] as never);
      cpFindMany.mockResolvedValue([{ photoId: "p1" }] as never);
      upsert.mockResolvedValue({} as never);

      const res = await PUT(req("PUT", { ids: ["p1"] }), { params });

      expect(res.status).toBe(200);
      expect(collectionUpdateMany).not.toHaveBeenCalled();
    });
  });

  describe("DELETE (remove members)", () => {
    it("rejects unauthenticated requests", async () => {
      mockedAuth.mockResolvedValue(null as never);
      const res = await DELETE(req("DELETE", { ids: ["p1"] }), { params });
      expect(res.status).toBe(401);
      expect(deleteMany).not.toHaveBeenCalled();
    });

    it("returns 404 for an unknown collection", async () => {
      collectionFindUnique.mockResolvedValue(null as never);
      const res = await DELETE(req("DELETE", { ids: ["p1"] }), { params });
      expect(res.status).toBe(404);
      expect(deleteMany).not.toHaveBeenCalled();
    });

    it("returns 400 when ids is not an array of strings", async () => {
      const res = await DELETE(req("DELETE", { ids: [null] }), { params });
      expect(res.status).toBe(400);
      expect(deleteMany).not.toHaveBeenCalled();
    });

    it("removes the given members", async () => {
      deleteMany.mockResolvedValue({ count: 2 } as never);
      const res = await DELETE(req("DELETE", { ids: ["p1", "p2"] }), { params });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, count: 2 });
      expect(deleteMany).toHaveBeenCalledWith({
        where: { collectionId: "c1", photoId: { in: ["p1", "p2"] } },
      });
    });

    it("dedupes ids before removing", async () => {
      deleteMany.mockResolvedValue({ count: 1 } as never);
      await DELETE(req("DELETE", { ids: ["p1", "p1"] }), { params });
      expect(deleteMany).toHaveBeenCalledWith({
        where: { collectionId: "c1", photoId: { in: ["p1"] } },
      });
    });

    it("returns 400 when ids exceeds the 500 cap", async () => {
      const ids = Array.from({ length: 501 }, (_, i) => `p${i}`);
      const res = await DELETE(req("DELETE", { ids }), { params });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ ok: false, error: "ids must not exceed 500" });
      expect(deleteMany).not.toHaveBeenCalled();
    });

    it("clears the collection's cover when the removed photo was the cover", async () => {
      deleteMany.mockResolvedValue({ count: 1 } as never);
      const res = await DELETE(req("DELETE", { ids: ["p1"] }), { params });
      expect(res.status).toBe(200);
      expect(collectionUpdateMany).toHaveBeenCalledWith({
        where: { id: "c1", coverId: { in: ["p1"] } },
        data: { coverId: null },
      });
    });
  });
});
