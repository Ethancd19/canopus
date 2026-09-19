import { describe, expect, it } from "vitest";
import { pickPhotoFields } from "@/lib/photo-fields";

describe("pickPhotoFields", () => {
  it("keeps only editable fields", () => {
    const { data, invalid } = pickPhotoFields({
      title: "Dunes",
      featured: true,
      published: false,
      id: "hacked",
      createdAt: "2020-01-01",
      storageKey: "photos/x.jpg",
    });
    expect(data).toEqual({ title: "Dunes", featured: true, published: false });
    expect(invalid).toEqual([]);
  });

  it("returns an empty result for non-object input", () => {
    expect(pickPhotoFields(null)).toEqual({ data: {}, invalid: [] });
    expect(pickPhotoFields("str")).toEqual({ data: {}, invalid: [] });
  });

  it("drops undefined values but keeps null", () => {
    const { data, invalid } = pickPhotoFields({ caption: null, location: undefined });
    expect(data).toEqual({ caption: null });
    expect(invalid).toEqual([]);
  });

  it("rejects null for non-nullable fields", () => {
    const { data, invalid } = pickPhotoFields({ title: null, tags: null });
    expect(data).toEqual({});
    expect(invalid).toEqual(["title", "tags"]);
  });

  it("drops fields with the wrong type and lists them as invalid", () => {
    const { data, invalid } = pickPhotoFields({ tags: "not-an-array", order: "5", published: "yes" });
    expect(data).toEqual({});
    expect(invalid.sort()).toEqual(["order", "published", "tags"]);
  });

  it("rejects a tags array containing a non-string element", () => {
    const { data, invalid } = pickPhotoFields({ tags: ["ok", 5] });
    expect(data).toEqual({});
    expect(invalid).toEqual(["tags"]);
  });

  it("accepts a well-typed tags array, order, and booleans", () => {
    const { data, invalid } = pickPhotoFields({ tags: ["a", "b"], order: 3, published: true, featured: false });
    expect(data).toEqual({ tags: ["a", "b"], order: 3, published: true, featured: false });
    expect(invalid).toEqual([]);
  });

  it("accepts a format value in the enum and rejects others", () => {
    const ok = pickPhotoFields({ format: "FILM_35MM" });
    expect(ok.data).toEqual({ format: "FILM_35MM" });
    expect(ok.invalid).toEqual([]);

    const bad = pickPhotoFields({ format: "POLAROID" });
    expect(bad.data).toEqual({});
    expect(bad.invalid).toEqual(["format"]);
  });

  it("requires slug to equal slugify(slug) and be non-empty", () => {
    const ok = pickPhotoFields({ slug: "dunes-at-dusk" });
    expect(ok.data).toEqual({ slug: "dunes-at-dusk" });
    expect(ok.invalid).toEqual([]);

    const badCase = pickPhotoFields({ slug: "Dunes At Dusk" });
    expect(badCase.data).toEqual({});
    expect(badCase.invalid).toEqual(["slug"]);

    const empty = pickPhotoFields({ slug: "" });
    expect(empty.data).toEqual({});
    expect(empty.invalid).toEqual(["slug"]);
  });

  it("accepts null for nullable text fields", () => {
    const { data, invalid } = pickPhotoFields({ caption: null, location: null, camera: null });
    expect(data).toEqual({ caption: null, location: null, camera: null });
    expect(invalid).toEqual([]);
  });

  it("lists multiple invalid fields together", () => {
    const { invalid } = pickPhotoFields({ order: "nope", featured: "nope" });
    expect(invalid.sort()).toEqual(["featured", "order"]);
  });
});
