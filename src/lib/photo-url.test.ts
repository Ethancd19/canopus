import { describe, expect, it } from "vitest";
import { photoSrc } from "@/lib/photo-url";

describe("photoSrc", () => {
  it("builds the image route URL for the given storageKey and width", () => {
    expect(photoSrc({ storageKey: "photos/a.jpg" }, 960)).toBe("/img/photos/a.jpg?w=960");
  });

  it("supports every allowed width", () => {
    expect(photoSrc({ storageKey: "photos/a.jpg" }, 1920)).toBe("/img/photos/a.jpg?w=1920");
  });
});
