import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

// vi.mock is hoisted above imports, so the mock fn must be hoisted too.
const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create };
  },
}));

const { bucketGet, imagesInput, transformer } = vi.hoisted(() => {
  const output = { image: () => new Blob([new Uint8Array([7, 7, 7])]).stream(), contentType: () => "image/jpeg", response: () => new Response() };
  const transformer = { transform: vi.fn(), output: vi.fn().mockResolvedValue(output) };
  transformer.transform.mockReturnValue(transformer);
  return {
    bucketGet: vi.fn(),
    imagesInput: vi.fn().mockReturnValue(transformer),
    transformer,
  };
});
vi.mock("@/lib/cloudflare", () => ({
  getEnv: () => ({ PHOTOS: { get: bucketGet }, IMAGES: { input: imagesInput } }),
}));

import { auth } from "@/lib/auth";
import { POST } from "./route";

const mockedAuth = vi.mocked(auth);

function req(body: unknown) {
  return new Request("http://localhost/api/admin/tags", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const storageKey = "photos/0b2b8a6e-1d4f-4c1e-9b2a-3f9e8d7c6b5a.jpg";

describe("POST /api/admin/tags", () => {
  beforeEach(() => {
    mockedAuth.mockReset();
    create.mockReset();
    bucketGet.mockReset();
    imagesInput.mockClear();
    transformer.transform.mockClear();
    transformer.output.mockClear();
  });

  it("rejects unauthenticated requests", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await POST(req({ storageKey }));
    expect(res.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a request without a storageKey", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects an invalid storageKey", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    const res = await POST(req({ storageKey: "evil" }));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("reads a photo from R2 and sends it as a base64 image block", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    bucketGet.mockResolvedValue({ body: new Blob([new Uint8Array([1, 2, 3])]).stream() });
    create.mockResolvedValue({
      content: [{ type: "text", text: '{"tags":["street"],"location":"Tokyo","caption":"Neon rain."}' }],
    });
    const res = await POST(req({ storageKey }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      tags: ["street"],
      location: "Tokyo",
      caption: "Neon rain.",
    });
    expect(bucketGet).toHaveBeenCalledWith(storageKey);
    expect(imagesInput).toHaveBeenCalled();
    expect(transformer.transform).toHaveBeenCalledWith({ width: 1280 });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                type: "image",
                source: expect.objectContaining({ type: "base64", media_type: "image/jpeg" }),
              }),
            ]),
          }),
        ],
      }),
    );
  });

  it("returns 404 when the storageKey is not found in R2", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    bucketGet.mockResolvedValue(null);
    const res = await POST(req({ storageKey }));
    expect(res.status).toBe(404);
    expect(create).not.toHaveBeenCalled();
  });
});
