import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: { photo: { updateMany: vi.fn() } },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PATCH } from "./route";

const mockedAuth = vi.mocked(auth);
const updateMany = vi.mocked(db.photo.updateMany);

function req(body: unknown) {
  return new Request("http://localhost/api/admin/photos/order", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/photos/order", () => {
  beforeEach(() => {
    mockedAuth.mockReset();
    updateMany.mockReset();
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
  });

  it("rejects unauthenticated requests", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await PATCH(req({ ids: ["a"] }));
    expect(res.status).toBe(401);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("rejects a missing ids array", async () => {
    const res = await PATCH(req({}));
    expect(res.status).toBe(400);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("rejects an empty ids array", async () => {
    const res = await PATCH(req({ ids: [] }));
    expect(res.status).toBe(400);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("rejects more than 500 ids", async () => {
    const ids = Array.from({ length: 501 }, (_, i) => `id${i}`);
    const res = await PATCH(req({ ids }));
    expect(res.status).toBe(400);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("sets order to the index of each id, in order", async () => {
    updateMany.mockResolvedValue({ count: 1 } as never);
    const res = await PATCH(req({ ids: ["c", "a", "b"] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, count: 3 });
    expect(updateMany).toHaveBeenCalledWith({ where: { id: "c" }, data: { order: 0 } });
    expect(updateMany).toHaveBeenCalledWith({ where: { id: "a" }, data: { order: 1 } });
    expect(updateMany).toHaveBeenCalledWith({ where: { id: "b" }, data: { order: 2 } });
  });

  it("only affects the listed ids", async () => {
    updateMany.mockResolvedValue({ count: 1 } as never);
    await PATCH(req({ ids: ["z"] }));
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({ where: { id: "z" }, data: { order: 0 } });
  });

  it("no-ops a missing id instead of failing the whole request", async () => {
    updateMany
      .mockResolvedValueOnce({ count: 1 } as never)
      .mockResolvedValueOnce({ count: 0 } as never)
      .mockResolvedValueOnce({ count: 1 } as never);
    const res = await PATCH(req({ ids: ["a", "missing", "b"] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, count: 2 });
  });
});
