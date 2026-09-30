import { describe, it, expect } from "vitest";
import { photoAlt } from "@/lib/photo-alt";

const base = { title: " Europe 23 1407", caption: null, location: null, format: "DIGITAL" } as const;

describe("photoAlt", () => {
  it("never uses the title", () => {
    expect(photoAlt(base)).not.toContain("Europe");
  });
  it("prefers the caption, then the location", () => {
    expect(photoAlt({ ...base, caption: " A quiet lake. ", location: "Seattle" })).toBe("A quiet lake.");
    expect(photoAlt({ ...base, caption: "   ", location: " Seattle " })).toBe("Seattle");
  });
  it("falls back to a generic description that names the format", () => {
    expect(photoAlt(base)).toBe("Digital photograph by Ethan Duval");
    expect(photoAlt({ ...base, format: "FILM_35MM" })).toBe("35mm film photograph by Ethan Duval");
    expect(photoAlt({ ...base, format: "FILM_120MM" })).toBe("120 film photograph by Ethan Duval");
  });
});
