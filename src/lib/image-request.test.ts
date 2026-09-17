import { describe, expect, it } from "vitest";
import { IMAGE_WIDTHS, parseImageRequest, pickFormat } from "@/lib/image-request";

const KEY = "photos/0b2b8a6e-1d4f-4c1e-9b2a-3f9e8d7c6b5a.jpg";

describe("pickFormat", () => {
  it("prefers avif, then webp, then jpeg", () => {
    expect(pickFormat("image/avif,image/webp,*/*")).toBe("image/avif");
    expect(pickFormat("image/webp,*/*")).toBe("image/webp");
    expect(pickFormat("*/*")).toBe("image/jpeg");
    expect(pickFormat(null)).toBe("image/jpeg");
  });
});

describe("parseImageRequest", () => {
  it("ignores q and always uses 80", () => {
    const r = parseImageRequest(new URL(`https://x/img/${KEY}?w=960&q=95`), "image/webp");
    expect(r).toEqual({ key: KEY, width: 960, quality: 80, format: "image/webp" });
  });

  it("defaults quality to 80", () => {
    const r = parseImageRequest(new URL(`https://x/img/${KEY}?w=320`), null);
    expect(r).toMatchObject({ quality: 80, format: "image/jpeg" });
  });

  it("rejects a width outside the allowlist", () => {
    expect(parseImageRequest(new URL(`https://x/img/${KEY}?w=1000`), null)).toEqual({
      error: `w must be one of ${IMAGE_WIDTHS.join(", ")}`,
      status: 400,
    });
  });

  it("rejects a missing width", () => {
    expect(parseImageRequest(new URL(`https://x/img/${KEY}`), null)).toMatchObject({ status: 400 });
  });

  it("rejects keys outside photos/<uuid>.<ext>", () => {
    expect(parseImageRequest(new URL("https://x/img/../secret?w=320"), null)).toMatchObject({ status: 400 });
    expect(parseImageRequest(new URL("https://x/img/photos/evil.exe?w=320"), null)).toMatchObject({ status: 400 });
  });

  it("rejects malformed percent-encoding instead of throwing", () => {
    expect(() =>
      parseImageRequest(new URL("https://x/img/photos/%zz.jpg?w=320"), null),
    ).not.toThrow();
    expect(parseImageRequest(new URL("https://x/img/photos/%zz.jpg?w=320"), null)).toEqual({
      error: "invalid image key",
      status: 400,
    });
  });
});
