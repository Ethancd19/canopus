import { describe, expect, it, vi } from "vitest";
import { extensionFor, newStorageKey, storeImage } from "@/lib/storage";

function env() {
  const output = { image: () => new Blob([new Uint8Array([1, 2, 3])]).stream(), contentType: () => "image/webp", response: () => new Response() };
  const transformer = { transform: vi.fn(), output: vi.fn().mockResolvedValue(output) };
  transformer.transform.mockReturnValue(transformer);
  return {
    PHOTOS: { put: vi.fn().mockResolvedValue({}), get: vi.fn(), head: vi.fn(), delete: vi.fn() },
    IMAGES: { input: vi.fn().mockReturnValue(transformer), info: vi.fn().mockResolvedValue({ format: "image/jpeg", fileSize: 10, width: 4000, height: 2667 }) },
    transformer,
  };
}

describe("storage helpers", () => {
  it("maps MIME types to extensions", () => {
    expect(extensionFor("image/jpeg")).toBe("jpg");
    expect(extensionFor("image/png")).toBe("png");
    expect(extensionFor("image/webp")).toBe("webp");
  });

  it("creates keys under photos/ with a uuid", () => {
    expect(newStorageKey("image/png")).toMatch(/^photos\/[0-9a-f-]{36}\.png$/);
  });

  it("stores the object, reads dimensions, and builds a blur placeholder", async () => {
    const e = env();
    const bytes = new Uint8Array([9, 9, 9]).buffer;
    const stored = await storeImage(e, bytes, "image/jpeg");
    expect(stored.storageKey).toMatch(/^photos\/.*\.jpg$/);
    expect(stored).toMatchObject({ width: 4000, height: 2667, mimeType: "image/jpeg", sizeBytes: 3 });
    expect(stored.blurDataUrl).toBe(`data:image/webp;base64,${Buffer.from([1, 2, 3]).toString("base64")}`);
    expect(e.PHOTOS.put).toHaveBeenCalledWith(stored.storageKey, bytes, { httpMetadata: { contentType: "image/jpeg" } });
    expect(e.transformer.transform).toHaveBeenCalledWith({ width: 16 });
  });

  it("rejects images whose dimensions cannot be read", async () => {
    const e = env();
    e.IMAGES.info.mockResolvedValue({ format: "image/jpeg", fileSize: 1 });
    await expect(storeImage(e, new ArrayBuffer(1), "image/jpeg")).rejects.toThrow(/dimensions/);
    expect(e.PHOTOS.put).not.toHaveBeenCalled();
  });

  it("deletes the orphaned object when the blur transform fails", async () => {
    const e = env();
    e.transformer.output.mockRejectedValue(new Error("transform failed"));
    await expect(storeImage(e, new Uint8Array([9, 9, 9]).buffer, "image/jpeg")).rejects.toThrow("transform failed");
    expect(e.PHOTOS.put).toHaveBeenCalledTimes(1);
    const storageKey = e.PHOTOS.put.mock.calls[0][0];
    expect(e.PHOTOS.delete).toHaveBeenCalledWith(storageKey);
  });
});
