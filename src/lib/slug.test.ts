import { describe, expect, it } from "vitest";
import { isSlugConflict, slugify, titleFromFilename, uniqueSlug } from "@/lib/slug";

describe("titleFromFilename", () => {
  it("strips the extension and replaces separators with spaces", () => {
    expect(titleFromFilename("IMG_0042-dunes at dusk.JPG")).toBe("IMG 0042 dunes at dusk");
  });

  it("handles filenames with no separators", () => {
    expect(titleFromFilename("sunset.png")).toBe("sunset");
  });

  it("returns 'Untitled' when the filename has no title left after stripping the extension", () => {
    expect(titleFromFilename(".jpg")).toBe("Untitled");
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Dunes at Dusk!")).toBe("dunes-at-dusk");
  });

  it("collapses repeated non-alphanumeric runs and trims edges", () => {
    expect(slugify("  Multiple   Spaces -- and -- dashes!! ")).toBe("multiple-spaces-and-dashes");
  });

  it("returns 'untitled' when nothing alphanumeric survives (emoji/CJK-only input)", () => {
    expect(slugify("🙂")).toBe("untitled");
  });
});

describe("uniqueSlug", () => {
  it("returns the base slug when it does not exist", async () => {
    const exists = async () => false;
    expect(await uniqueSlug("dunes", exists)).toBe("dunes");
  });

  it("appends -2, -3, ... until an available slug is found", async () => {
    const taken = new Set(["dunes", "dunes-2", "dunes-3"]);
    const exists = async (slug: string) => taken.has(slug);
    expect(await uniqueSlug("dunes", exists)).toBe("dunes-4");
  });

  it("gives up after 50 tries", async () => {
    const exists = async () => true;
    await expect(uniqueSlug("dunes", exists)).rejects.toThrow();
  });
});

describe("isSlugConflict", () => {
  it("is true for a P2002 error whose target includes slug", () => {
    expect(isSlugConflict({ code: "P2002", meta: { target: ["slug"] } })).toBe(true);
    expect(isSlugConflict({ code: "P2002", meta: { target: ["title", "slug"] } })).toBe(true);
  });

  it("is false for a P2002 error on a different column", () => {
    expect(isSlugConflict({ code: "P2002", meta: { target: ["storageKey"] } })).toBe(false);
  });

  it("is false for a non-P2002 error, or a non-object value", () => {
    expect(isSlugConflict(new Error("db down"))).toBe(false);
    expect(isSlugConflict({ code: "P2025" })).toBe(false);
    expect(isSlugConflict(null)).toBe(false);
    expect(isSlugConflict("nope")).toBe(false);
  });
});
