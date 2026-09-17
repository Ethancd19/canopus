import { beforeEach, describe, expect, it, vi } from "vitest";

const { getEnv, getEdgeCache, getWaitUntil } = vi.hoisted(() => ({
  getEnv: vi.fn(),
  getEdgeCache: vi.fn(),
  getWaitUntil: vi.fn(),
}));
vi.mock("@/lib/cloudflare", () => ({ getEnv, getEdgeCache, getWaitUntil }));

import { GET } from "./route";

const KEY = "photos/0b2b8a6e-1d4f-4c1e-9b2a-3f9e8d7c6b5a.jpg";

function req(qs: string, accept = "image/webp") {
  return new Request(`https://x/img/${KEY}${qs}`, { headers: { accept } });
}

function bindings(objectExists = true) {
  const output = { image: () => new Blob(["img"]).stream(), contentType: () => "image/webp", response: () => new Response("img") };
  const transformer = { transform: vi.fn(), output: vi.fn().mockResolvedValue(output) };
  transformer.transform.mockReturnValue(transformer);
  const IMAGES = { input: vi.fn().mockReturnValue(transformer), info: vi.fn() };
  const PHOTOS = {
    get: vi.fn().mockResolvedValue(
      objectExists ? { body: new Blob(["raw"]).stream(), size: 3, httpEtag: '"e"', writeHttpMetadata: vi.fn() } : null,
    ),
    head: vi.fn(), put: vi.fn(), delete: vi.fn(),
  };
  getEnv.mockReturnValue({ PHOTOS, IMAGES });
  return { PHOTOS, IMAGES, transformer };
}

describe("GET /img/[...key]", () => {
  beforeEach(() => {
    getEnv.mockReset(); getEdgeCache.mockReset(); getWaitUntil.mockReset();
    getEdgeCache.mockReturnValue(null);
    getWaitUntil.mockReturnValue(() => {});
  });

  it("returns 400 for a disallowed width without touching the bucket", async () => {
    const { PHOTOS } = bindings();
    const res = await GET(req("?w=999"));
    expect(res.status).toBe(400);
    expect(PHOTOS.get).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed percent-encoding without touching the bucket", async () => {
    const { PHOTOS } = bindings();
    const res = await GET(new Request("https://x/img/photos/%zz.jpg?w=320", { headers: { accept: "image/webp" } }));
    expect(res.status).toBe(400);
    expect(PHOTOS.get).not.toHaveBeenCalled();
  });

  it("returns 404 when the object is missing", async () => {
    bindings(false);
    const res = await GET(req("?w=320"));
    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toContain("max-age=60");
  });

  it("caches a 404 response when a cache is present", async () => {
    bindings(false);
    const cache = { match: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined) };
    getEdgeCache.mockReturnValue(cache as unknown as Cache);
    const waitUntil = vi.fn((p: Promise<unknown>) => p);
    getWaitUntil.mockReturnValue(waitUntil);
    const res = await GET(req("?w=320"));
    expect(res.status).toBe(404);
    expect(cache.put).toHaveBeenCalledTimes(1);
  });

  it("resizes, negotiates the format, and sets immutable caching", async () => {
    const { IMAGES, transformer } = bindings();
    const res = await GET(req("?w=960&q=70", "image/avif,image/webp"));
    expect(res.status).toBe(200);
    expect(IMAGES.input).toHaveBeenCalledTimes(1);
    expect(transformer.transform).toHaveBeenCalledWith({ width: 960 });
    expect(transformer.output).toHaveBeenCalledWith({ format: "image/avif", quality: 80 });
    expect(res.headers.get("content-type")).toBe("image/avif");
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(res.headers.get("vary")).toBe("Accept");
  });

  it("returns 502 without caching when the bucket/transform step throws", async () => {
    const { PHOTOS } = bindings();
    PHOTOS.get.mockRejectedValue(new Error("boom"));
    const cache = { match: vi.fn().mockResolvedValue(undefined), put: vi.fn() };
    getEdgeCache.mockReturnValue(cache as unknown as Cache);
    const res = await GET(req("?w=320"));
    expect(res.status).toBe(502);
    expect(cache.put).not.toHaveBeenCalled();
  });

  it("serves from the edge cache when present", async () => {
    bindings();
    const cached = new Response("cached", { headers: { "content-type": "image/webp" } });
    const cache = { match: vi.fn().mockResolvedValue(cached), put: vi.fn() };
    getEdgeCache.mockReturnValue(cache as unknown as Cache);
    const res = await GET(req("?w=320"));
    expect(await res.text()).toBe("cached");
    expect(getEnv).not.toHaveBeenCalled();
  });

  it("stores a fresh response in the edge cache via waitUntil", async () => {
    bindings();
    const cache = { match: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined) };
    getEdgeCache.mockReturnValue(cache as unknown as Cache);
    const waitUntil = vi.fn();
    getWaitUntil.mockReturnValue(waitUntil);
    const res = await GET(req("?w=320"));
    expect(res.status).toBe(200);
    expect(cache.put).toHaveBeenCalledTimes(1);
    expect(waitUntil).toHaveBeenCalledTimes(1);
    const [putKey] = cache.put.mock.calls[0];
    expect((putKey as Request).url).toBe(`https://x/img/${KEY}?w=320&f=image/webp`);
  });
});
