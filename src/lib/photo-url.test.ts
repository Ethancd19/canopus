import { afterEach, describe, expect, it, vi } from "vitest";
import { photoSrc } from "@/lib/photo-url";

describe("photoSrc", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the image route when a storageKey exists", () => {
    expect(photoSrc({ storageKey: "photos/a.jpg", cloudinaryId: "old" }, 960)).toBe("/img/photos/a.jpg?w=960");
  });

  it("falls back to Cloudinary while storageKey is null", () => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "demo");
    expect(photoSrc({ storageKey: null, cloudinaryId: "canopus/x" }, 1920)).toBe(
      "https://res.cloudinary.com/demo/image/upload/w_1920,q_auto,f_auto/canopus/x",
    );
  });

  it("returns an empty string when neither source exists", () => {
    expect(photoSrc({ storageKey: null, cloudinaryId: null }, 320)).toBe("");
  });
});
