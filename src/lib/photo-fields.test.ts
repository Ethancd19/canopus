import { describe, expect, it } from "vitest";
import { pickPhotoFields } from "@/lib/photo-fields";

describe("pickPhotoFields", () => {
  it("keeps only editable fields", () => {
    const out = pickPhotoFields({
      title: "Dunes",
      featured: true,
      published: false,
      id: "hacked",
      createdAt: "2020-01-01",
      cloudinaryId: "x",
    });
    expect(out).toEqual({ title: "Dunes", featured: true, published: false });
  });

  it("returns an empty object for non-object input", () => {
    expect(pickPhotoFields(null)).toEqual({});
    expect(pickPhotoFields("str")).toEqual({});
  });

  it("drops undefined values but keeps null", () => {
    expect(pickPhotoFields({ caption: null, location: undefined })).toEqual({
      caption: null,
    });
  });
});
