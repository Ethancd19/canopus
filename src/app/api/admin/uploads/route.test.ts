import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
const { getEnv, storeImage } = vi.hoisted(() => ({ getEnv: vi.fn(), storeImage: vi.fn() }));
vi.mock("@/lib/cloudflare", () => ({ getEnv }));
vi.mock("@/lib/storage", async (orig) => ({ ...(await orig<typeof import("@/lib/storage")>()), storeImage }));

import { auth } from "@/lib/auth";
import { POST } from "./route";

const mockedAuth = vi.mocked(auth);

function upload(file: File | null) {
  const fd = new FormData();
  if (file) fd.append("file", file);
  return new Request("http://localhost/api/admin/uploads", { method: "POST", body: fd });
}

describe("POST /api/admin/uploads", () => {
  beforeEach(() => {
    mockedAuth.mockReset(); getEnv.mockReset(); storeImage.mockReset();
    getEnv.mockReturnValue({});
  });

  it("rejects unauthenticated requests", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await POST(upload(new File(["x"], "a.jpg", { type: "image/jpeg" })));
    expect(res.status).toBe(401);
    expect(storeImage).not.toHaveBeenCalled();
  });

  it("rejects a request whose content-length exceeds the limit before parsing the body", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "E" } } as never);
    const res = await POST(
      new Request("http://localhost/api/admin/uploads", {
        method: "POST",
        headers: { "content-length": String(30 * 1024 * 1024) },
        body: "",
      }),
    );
    expect(res.status).toBe(413);
    expect(storeImage).not.toHaveBeenCalled();
  });

  it("rejects a missing file", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "E" } } as never);
    const res = await POST(upload(null));
    expect(res.status).toBe(400);
  });

  it("rejects unsupported types", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "E" } } as never);
    const res = await POST(upload(new File(["x"], "a.gif", { type: "image/gif" })));
    expect(res.status).toBe(415);
    expect(storeImage).not.toHaveBeenCalled();
  });

  it("stores the image and returns its metadata", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "E" } } as never);
    storeImage.mockResolvedValue({ storageKey: "photos/k.jpg", width: 10, height: 5, mimeType: "image/jpeg", sizeBytes: 1, blurDataUrl: "data:x" });
    const res = await POST(upload(new File(["x"], "dunes.jpg", { type: "image/jpeg" })));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true, storageKey: "photos/k.jpg", width: 10, height: 5, mimeType: "image/jpeg", sizeBytes: 1, blurDataUrl: "data:x", originalFilename: "dunes.jpg",
    });
  });
});
