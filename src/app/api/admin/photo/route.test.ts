import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: { photo: { create: vi.fn() } },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { POST } from "./route";

const mockedAuth = vi.mocked(auth);
const create = vi.mocked(db.photo.create);

function req(body: unknown) {
  return new Request("http://localhost/api/admin/photo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  title: "Dunes",
  slug: "dunes",
  storageKey: "photos/0b2b8a6e-1d4f-4c1e-9b2a-3f9e8d7c6b5a.jpg",
  format: "DIGITAL",
  width: 4000,
  height: 2667,
  aspectRatio: 1.5,
};

describe("POST /api/admin/photo", () => {
  beforeEach(() => {
    mockedAuth.mockReset();
    create.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await POST(req(validBody));
    expect(res.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it("creates the photo when authenticated", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    create.mockResolvedValue({ id: "p1", ...validBody } as never);
    const res = await POST(req(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.photo.id).toBe("p1");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Dunes",
          width: 4000,
          storageKey: "photos/0b2b8a6e-1d4f-4c1e-9b2a-3f9e8d7c6b5a.jpg",
          published: true,
        }),
      }),
    );
  });

  it("returns 400 when required fields are missing", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    const res = await POST(req({ title: "no slug" }));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid format", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    const res = await POST(req({ ...validBody, format: "FILM_120" }));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid storageKey", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    const res = await POST(req({ ...validBody, storageKey: "evil" }));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});
