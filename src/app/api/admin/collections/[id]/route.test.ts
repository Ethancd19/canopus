import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    collection: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    collectionPhoto: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { GET, PATCH, DELETE } from "./route";

const mockedAuth = vi.mocked(auth);
const findUnique = vi.mocked(db.collection.findUnique);
const update = vi.mocked(db.collection.update);
const del = vi.mocked(db.collection.delete);
const cpFindMany = vi.mocked(db.collectionPhoto.findMany);
const cpFindUnique = vi.mocked(db.collectionPhoto.findUnique);

const params = Promise.resolve({ id: "c1" });

function patchReq(body: unknown) {
  return new Request("http://localhost/api/admin/collections/c1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/collections/[id]", () => {
  beforeEach(() => {
    mockedAuth.mockReset();
    findUnique.mockReset();
    update.mockReset();
    del.mockReset();
    cpFindMany.mockReset();
    cpFindUnique.mockReset();
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
  });

  describe("GET", () => {
    it("rejects unauthenticated requests", async () => {
      mockedAuth.mockResolvedValue(null as never);
      const res = await GET(new Request("http://localhost"), { params });
      expect(res.status).toBe(401);
      expect(findUnique).not.toHaveBeenCalled();
    });

    it("returns 404 for an unknown collection", async () => {
      findUnique.mockResolvedValue(null as never);
      const res = await GET(new Request("http://localhost"), { params });
      expect(res.status).toBe(404);
      expect(cpFindMany).not.toHaveBeenCalled();
    });

    it("returns the collection with its ordered photos", async () => {
      findUnique.mockResolvedValue({ id: "c1", title: "Dunes", cover: null } as never);
      cpFindMany.mockResolvedValue([
        { collectionId: "c1", photoId: "p1", order: 0, photo: { id: "p1" } },
        { collectionId: "c1", photoId: "p2", order: 1, photo: { id: "p2" } },
      ] as never);

      const res = await GET(new Request("http://localhost"), { params });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        ok: true,
        collection: { id: "c1", title: "Dunes", cover: null },
        photos: [
          { collectionId: "c1", photoId: "p1", order: 0, photo: { id: "p1" } },
          { collectionId: "c1", photoId: "p2", order: 1, photo: { id: "p2" } },
        ],
      });
      expect(findUnique).toHaveBeenCalledWith({ where: { id: "c1" }, include: { cover: true } });
      expect(cpFindMany).toHaveBeenCalledWith({
        where: { collectionId: "c1" },
        orderBy: { order: "asc" },
        include: { photo: true },
      });
    });
  });

  describe("PATCH", () => {
    it("rejects unauthenticated requests", async () => {
      mockedAuth.mockResolvedValue(null as never);
      const res = await PATCH(patchReq({ title: "x" }), { params });
      expect(res.status).toBe(401);
      expect(update).not.toHaveBeenCalled();
    });

    it("returns 404 for an unknown collection", async () => {
      findUnique.mockResolvedValue(null as never);
      const res = await PATCH(patchReq({ title: "x" }), { params });
      expect(res.status).toBe(404);
      expect(update).not.toHaveBeenCalled();
    });

    it("rejects a body with no editable fields", async () => {
      findUnique.mockResolvedValue({ id: "c1" } as never);
      const res = await PATCH(patchReq({ id: "evil" }), { params });
      expect(res.status).toBe(400);
      expect(update).not.toHaveBeenCalled();
    });

    it("only forwards editable fields and slugifies the slug", async () => {
      findUnique.mockResolvedValue({ id: "c1" } as never);
      update.mockResolvedValue({ id: "c1", title: "x" } as never);
      const res = await PATCH(
        patchReq({ title: "x", slug: "New Slug!", id: "evil", createdAt: "1999" }),
        { params },
      );
      expect(res.status).toBe(200);
      expect(update).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: { title: "x", slug: "new-slug" },
      });
    });

    it("trims the title before saving", async () => {
      findUnique.mockResolvedValue({ id: "c1" } as never);
      update.mockResolvedValue({ id: "c1", title: "Dunes" } as never);
      const res = await PATCH(patchReq({ title: "  Dunes  " }), { params });
      expect(res.status).toBe(200);
      expect(update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { title: "Dunes" } });
    });

    it("returns 400 for a blank title", async () => {
      findUnique.mockResolvedValue({ id: "c1" } as never);
      const res = await PATCH(patchReq({ title: "   " }), { params });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ ok: false, error: "invalid fields: title" });
      expect(update).not.toHaveBeenCalled();
    });

    it("returns 400 for a non-boolean published value", async () => {
      findUnique.mockResolvedValue({ id: "c1" } as never);
      const res = await PATCH(patchReq({ published: "yes" }), { params });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ ok: false, error: "invalid fields: published" });
      expect(update).not.toHaveBeenCalled();
    });

    it("returns 400 for a non-integer order value", async () => {
      findUnique.mockResolvedValue({ id: "c1" } as never);
      const res = await PATCH(patchReq({ order: 1.5 }), { params });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ ok: false, error: "invalid fields: order" });
      expect(update).not.toHaveBeenCalled();
    });

    it("returns 400 for a negative order value", async () => {
      findUnique.mockResolvedValue({ id: "c1" } as never);
      const res = await PATCH(patchReq({ order: -1 }), { params });
      expect(res.status).toBe(400);
      expect(update).not.toHaveBeenCalled();
    });

    it("returns 400 for a non-string, non-null description", async () => {
      findUnique.mockResolvedValue({ id: "c1" } as never);
      const res = await PATCH(patchReq({ description: 42 }), { params });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ ok: false, error: "invalid fields: description" });
      expect(update).not.toHaveBeenCalled();
    });

    it("lists every offending field in one error", async () => {
      findUnique.mockResolvedValue({ id: "c1" } as never);
      const res = await PATCH(patchReq({ published: "yes", order: -1 }), { params });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ ok: false, error: "invalid fields: published, order" });
    });

    it("returns 409 when the slug is already in use", async () => {
      findUnique.mockResolvedValue({ id: "c1" } as never);
      update.mockRejectedValue({ code: "P2002", meta: { target: ["slug"] } });
      const res = await PATCH(patchReq({ slug: "taken" }), { params });
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({ ok: false, error: "slug already in use" });
    });

    it("allows clearing coverId to null without a membership check", async () => {
      findUnique.mockResolvedValue({ id: "c1" } as never);
      update.mockResolvedValue({ id: "c1", coverId: null } as never);
      const res = await PATCH(patchReq({ coverId: null }), { params });
      expect(res.status).toBe(200);
      expect(cpFindUnique).not.toHaveBeenCalled();
      expect(update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { coverId: null } });
    });

    it("rejects a coverId that is not a member of the collection", async () => {
      findUnique.mockResolvedValue({ id: "c1" } as never);
      cpFindUnique.mockResolvedValue(null as never);
      const res = await PATCH(patchReq({ coverId: "p9" }), { params });
      expect(res.status).toBe(400);
      expect(update).not.toHaveBeenCalled();
      expect(cpFindUnique).toHaveBeenCalledWith({
        where: { collectionId_photoId: { collectionId: "c1", photoId: "p9" } },
      });
    });

    it("accepts a coverId that is a member of the collection", async () => {
      findUnique.mockResolvedValue({ id: "c1" } as never);
      cpFindUnique.mockResolvedValue({ collectionId: "c1", photoId: "p1" } as never);
      update.mockResolvedValue({ id: "c1", coverId: "p1" } as never);
      const res = await PATCH(patchReq({ coverId: "p1" }), { params });
      expect(res.status).toBe(200);
      expect(update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { coverId: "p1" } });
    });
  });

  describe("DELETE", () => {
    it("rejects unauthenticated requests", async () => {
      mockedAuth.mockResolvedValue(null as never);
      const res = await DELETE(new Request("http://localhost"), { params });
      expect(res.status).toBe(401);
      expect(del).not.toHaveBeenCalled();
    });

    it("returns 404 for an unknown collection", async () => {
      findUnique.mockResolvedValue(null as never);
      const res = await DELETE(new Request("http://localhost"), { params });
      expect(res.status).toBe(404);
      expect(del).not.toHaveBeenCalled();
    });

    it("deletes the collection when it exists", async () => {
      findUnique.mockResolvedValue({ id: "c1" } as never);
      del.mockResolvedValue({ id: "c1" } as never);
      const res = await DELETE(new Request("http://localhost"), { params });
      expect(res.status).toBe(200);
      expect(del).toHaveBeenCalledWith({ where: { id: "c1" } });
    });
  });
});
