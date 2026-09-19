import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: { photo: { update: vi.fn(), delete: vi.fn() } },
}));
const { bucketDelete } = vi.hoisted(() => ({ bucketDelete: vi.fn() }));
vi.mock("@/lib/cloudflare", () => ({ getEnv: () => ({ PHOTOS: { delete: bucketDelete } }) }));

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
    bucketDelete.mockReset();
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

  it("PATCH rejects a body with invalid-typed fields, listing them by name", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    const res = await PATCH(patchReq({ published: "yes", order: "nope" }), { params });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "Invalid fields: order, published" });
    expect(update).not.toHaveBeenCalled();
  });

  it("PATCH rejects a slug that is not already slugified", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    const res = await PATCH(patchReq({ slug: "Not A Slug" }), { params });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "Invalid fields: slug" });
    expect(update).not.toHaveBeenCalled();
  });

  it("PATCH returns 409 with a friendly message when the slug is already taken", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    update.mockRejectedValue({ code: "P2002", meta: { target: ["slug"] } });
    const res = await PATCH(patchReq({ slug: "taken" }), { params });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, error: "That slug is already in use." });
  });

  it("PATCH rethrows a non-slug update error", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    update.mockRejectedValue(new Error("db down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await PATCH(patchReq({ title: "x" }), { params });
    expect(res.status).toBe(500);
    errSpy.mockRestore();
  });

  it("DELETE rejects unauthenticated requests", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await DELETE(new Request("http://localhost"), { params });
    expect(res.status).toBe(401);
    expect(del).not.toHaveBeenCalled();
  });

  it("DELETE removes the photo when authenticated", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    del.mockResolvedValue({ storageKey: "photos/k.jpg" } as never);
    const res = await DELETE(new Request("http://localhost"), { params });
    expect(res.status).toBe(200);
    expect(del).toHaveBeenCalledWith({ where: { id: "p1" } });
    expect(bucketDelete).toHaveBeenCalledWith("photos/k.jpg");
  });

  it("DELETE skips the bucket when the row has no storageKey", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    del.mockResolvedValue({ storageKey: null } as never);
    const res = await DELETE(new Request("http://localhost"), { params });
    expect(res.status).toBe(200);
    expect(bucketDelete).not.toHaveBeenCalled();
  });
});
