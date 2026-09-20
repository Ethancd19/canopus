import { describe, it, expect } from "vitest";
import imageLoader, { snapWidth } from "@/lib/image-loader";

describe("snapWidth", () => {
  it("returns the smallest allowed width at or above the request", () => {
    expect(snapWidth(1)).toBe(320);
    expect(snapWidth(320)).toBe(320);
    expect(snapWidth(321)).toBe(640);
    expect(snapWidth(1000)).toBe(1280);
  });
  it("caps at the largest allowed width", () => {
    expect(snapWidth(4000)).toBe(2560);
  });
});

describe("imageLoader", () => {
  it("builds an /img URL with a snapped width and ignores quality", () => {
    expect(imageLoader({ src: "photos/abc.jpg", width: 700, quality: 50 })).toBe("/img/photos/abc.jpg?w=960");
  });
});
