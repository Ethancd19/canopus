import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
const { getEnv, storeImage, findMany, update, count } = vi.hoisted(() => ({
  getEnv: vi.fn(), storeImage: vi.fn(), findMany: vi.fn(), update: vi.fn(), count: vi.fn(),
}));
vi.mock("@/lib/cloudflare", () => ({ getEnv }));
vi.mock("@/lib/storage", async (orig) => ({ ...(await orig<typeof import("@/lib/storage")>()), storeImage }));
vi.mock("@/lib/db", () => ({ db: { photo: { findMany, update, count } } }));

import { auth } from "@/lib/auth";
import { POST } from "./route";

const mockedAuth = vi.mocked(auth);

describe("POST /api/admin/migrate-cloudinary", () => {
  beforeEach(() => {
    mockedAuth.mockReset(); getEnv.mockReset(); storeImage.mockReset(); findMany.mockReset(); update.mockReset(); count.mockReset();
    getEnv.mockReturnValue({});
    count.mockResolvedValue(0);
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "demo");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("rejects unauthenticated requests", async () => {
    mockedAuth.mockResolvedValue(null as never);
    expect((await POST(new Request("http://x", { method: "POST" }))).status).toBe(401);
  });

  it("copies each unmigrated photo into storage and updates the row", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "E" } } as never);
    findMany.mockResolvedValue([{ id: "p1", cloudinaryId: "canopus/a" }, { id: "p2", cloudinaryId: "canopus/b" }]);
    vi.mocked(fetch).mockImplementation(async () => new Response(new Uint8Array([1]), { status: 200, headers: { "content-type": "image/jpeg" } }));
    storeImage.mockResolvedValue({ storageKey: "photos/k.jpg", width: 1, height: 1, mimeType: "image/jpeg", sizeBytes: 1, blurDataUrl: "d" });
    update.mockResolvedValue({});
    count.mockResolvedValue(3);
    const res = await POST(new Request("http://x", { method: "POST" }));
    expect(await res.json()).toEqual({ ok: true, migrated: ["p1", "p2"], failed: [], remaining: 3 });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
    expect(fetch).toHaveBeenCalledWith("https://res.cloudinary.com/demo/image/upload/canopus/a");
    expect(update).toHaveBeenCalledWith({ where: { id: "p1" }, data: { storageKey: "photos/k.jpg", width: 1, height: 1, aspectRatio: 1, mimeType: "image/jpeg", sizeBytes: 1, blurDataUrl: "d" } });
  });

  it("records failures and keeps going", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "E" } } as never);
    findMany.mockResolvedValue([{ id: "p1", cloudinaryId: "canopus/a" }, { id: "p2", cloudinaryId: "canopus/b" }]);
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("nope", { status: 404 }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1]), { status: 200, headers: { "content-type": "image/jpeg" } }));
    storeImage.mockResolvedValue({ storageKey: "photos/k.jpg", width: 1, height: 1, mimeType: "image/jpeg", sizeBytes: 1, blurDataUrl: "d" });
    update.mockResolvedValue({});
    count.mockResolvedValue(1);
    const body = await (await POST(new Request("http://x", { method: "POST" }))).json();
    expect(body.migrated).toEqual(["p2"]);
    expect(body.failed).toEqual([{ id: "p1", error: "Cloudinary responded 404" }]);
    expect(body.remaining).toBe(0);
  });
});
