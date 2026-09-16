import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: { photo: { findMany: vi.fn() } },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { GET } from "./route";

const mockedAuth = vi.mocked(auth);
const findMany = vi.mocked(db.photo.findMany);

describe("GET /api/admin/photos", () => {
  beforeEach(() => {
    mockedAuth.mockReset();
    findMany.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("returns photos when authenticated", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    findMany.mockResolvedValue([{ id: "p1" }] as never);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, photos: [{ id: "p1" }] });
  });
});
