import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: { photo: { update: vi.fn(), delete: vi.fn() } },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PATCH, DELETE } from "./route";

const mockedAuth = vi.mocked(auth);
const update = vi.mocked(db.photo.update);
const del = vi.mocked(db.photo.delete);
const params = Promise.resolve({ id: "p1" });

function patchReq(body: unknown) {
  return new Request("http://localhost/api/admin/photo/p1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/photo/[id]", () => {
  beforeEach(() => {
    mockedAuth.mockReset();
    update.mockReset();
    del.mockReset();
  });

  it("PATCH rejects unauthenticated requests", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await PATCH(patchReq({ title: "x" }), { params });
    expect(res.status).toBe(401);
    expect(update).not.toHaveBeenCalled();
  });

  it("PATCH only forwards editable fields", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    update.mockResolvedValue({ id: "p1", title: "x" } as never);
    const res = await PATCH(
      patchReq({ title: "x", id: "evil", createdAt: "1999" }),
      { params },
    );
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { title: "x" },
    });
  });

  it("PATCH rejects a body with no editable fields", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    const res = await PATCH(patchReq({ id: "evil" }), { params });
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("DELETE rejects unauthenticated requests", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await DELETE(new Request("http://localhost"), { params });
    expect(res.status).toBe(401);
    expect(del).not.toHaveBeenCalled();
  });

  it("DELETE removes the photo when authenticated", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    del.mockResolvedValue({} as never);
    const res = await DELETE(new Request("http://localhost"), { params });
    expect(res.status).toBe(200);
    expect(del).toHaveBeenCalledWith({ where: { id: "p1" } });
  });
});
