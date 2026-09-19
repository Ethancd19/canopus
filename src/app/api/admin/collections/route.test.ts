import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    collection: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { GET, POST } from "./route";

const mockedAuth = vi.mocked(auth);
const findMany = vi.mocked(db.collection.findMany);
const findUnique = vi.mocked(db.collection.findUnique);
const aggregate = vi.mocked(db.collection.aggregate);
const create = vi.mocked(db.collection.create);

function postReq(body: unknown) {
  return new Request("http://localhost/api/admin/collections", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/collections", () => {
  beforeEach(() => {
    mockedAuth.mockReset();
    findMany.mockReset();
    findUnique.mockReset();
    aggregate.mockReset();
    create.mockReset();
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    aggregate.mockResolvedValue({ _max: { order: null } } as never);
  });

  describe("GET", () => {
    it("rejects unauthenticated requests", async () => {
      mockedAuth.mockResolvedValue(null as never);
      const res = await GET();
      expect(res.status).toBe(401);
      expect(findMany).not.toHaveBeenCalled();
    });

    it("lists collections ordered by order, with cover and photo count", async () => {
      findMany.mockResolvedValue([
        { id: "c1", title: "Dunes", cover: null, _count: { photos: 3 } },
      ] as never);
      const res = await GET();
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        ok: true,
        collections: [{ id: "c1", title: "Dunes", cover: null, _count: { photos: 3 } }],
      });
      expect(findMany).toHaveBeenCalledWith({
        orderBy: { order: "asc" },
        include: { cover: true, _count: { select: { photos: true } } },
      });
    });
  });

  describe("POST", () => {
    it("rejects unauthenticated requests", async () => {
      mockedAuth.mockResolvedValue(null as never);
      const res = await POST(postReq({ title: "Dunes" }));
      expect(res.status).toBe(401);
      expect(create).not.toHaveBeenCalled();
    });

    it("rejects a missing title", async () => {
      const res = await POST(postReq({}));
      expect(res.status).toBe(400);
      expect(create).not.toHaveBeenCalled();
    });

    it("rejects a blank title", async () => {
      const res = await POST(postReq({ title: "   " }));
      expect(res.status).toBe(400);
      expect(create).not.toHaveBeenCalled();
    });

    it("creates a collection with a unique slug, order 0, and published false", async () => {
      findUnique.mockResolvedValue(null as never);
      create.mockResolvedValue({ id: "c1", title: "Dune Trip", slug: "dune-trip", published: false } as never);

      const res = await POST(postReq({ title: "Dune Trip", description: "Sand everywhere" }));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        ok: true,
        collection: { id: "c1", title: "Dune Trip", slug: "dune-trip", published: false },
      });
      expect(create).toHaveBeenCalledWith({
        data: { title: "Dune Trip", description: "Sand everywhere", slug: "dune-trip", published: false, order: 0 },
      });
    });

    it("appends a numeric suffix when the base slug is taken", async () => {
      findUnique.mockResolvedValueOnce({ id: "existing" } as never).mockResolvedValueOnce(null as never);
      create.mockResolvedValue({ id: "c2", title: "Dunes", slug: "dunes-2", published: false } as never);

      const res = await POST(postReq({ title: "Dunes" }));

      expect(res.status).toBe(200);
      expect(create).toHaveBeenCalledWith({
        data: { title: "Dunes", description: undefined, slug: "dunes-2", published: false, order: 0 },
      });
    });

    it("assigns order = max + 1 when other collections already exist", async () => {
      findUnique.mockResolvedValue(null as never);
      aggregate.mockResolvedValue({ _max: { order: 4 } } as never);
      create.mockResolvedValue({ id: "c3", title: "Dunes", slug: "dunes", published: false } as never);

      await POST(postReq({ title: "Dunes" }));

      expect(aggregate).toHaveBeenCalledWith({ _max: { order: true } });
      expect(create).toHaveBeenCalledWith({
        data: { title: "Dunes", description: undefined, slug: "dunes", published: false, order: 5 },
      });
    });

    it("retries once with a time-suffixed slug on a P2002 slug conflict", async () => {
      findUnique.mockResolvedValue(null as never);
      create
        .mockRejectedValueOnce({ code: "P2002", meta: { target: ["slug"] } })
        .mockResolvedValueOnce({ id: "c4", title: "Dunes", slug: "dunes-abcd", published: false } as never);

      const res = await POST(postReq({ title: "Dunes" }));

      expect(res.status).toBe(200);
      expect(create).toHaveBeenCalledTimes(2);
      const secondCallData = create.mock.calls[1][0].data as { slug: string };
      expect(secondCallData.slug).toMatch(/^dunes-/);
      expect(secondCallData.slug).not.toBe("dunes");
    });

    it("rethrows a create error that is not a slug conflict", async () => {
      findUnique.mockResolvedValue(null as never);
      create.mockRejectedValue(new Error("db down"));
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const res = await POST(postReq({ title: "Dunes" }));

      expect(res.status).toBe(500);
      expect(create).toHaveBeenCalledTimes(1);
      errSpy.mockRestore();
    });
  });
});
