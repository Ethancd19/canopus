import { afterEach, describe, expect, it } from "vitest";
import { getTaggingModel, parseTagResponse, TAG_OPTIONS } from "@/lib/tagging";

describe("parseTagResponse", () => {
  it("parses clean JSON", () => {
    const out = parseTagResponse(
      '{"tags":["landscape","golden hour"],"location":"Iceland","caption":"Wind over black sand."}',
    );
    expect(out).toEqual({
      tags: ["landscape", "golden hour"],
      location: "Iceland",
      caption: "Wind over black sand.",
    });
  });

  it("strips markdown fences", () => {
    const out = parseTagResponse('```json\n{"tags":["astro"],"location":"","caption":"Stars."}\n```');
    expect(out.tags).toEqual(["astro"]);
  });

  it("drops tags outside the allowed list and lowercases the rest", () => {
    const out = parseTagResponse('{"tags":["Landscape","unicorns"],"location":"","caption":"x"}');
    expect(out.tags).toEqual(["landscape"]);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseTagResponse("not json")).toThrow();
  });

  it("throws when tags is not an array", () => {
    expect(() => parseTagResponse('{"tags":"landscape","location":"","caption":"x"}')).toThrow();
  });

  it("exposes at least the original tag options", () => {
    expect(TAG_OPTIONS).toContain("landscape");
    expect(TAG_OPTIONS).toContain("black and white");
  });
});

describe("getTaggingModel", () => {
  const original = process.env.ANTHROPIC_MODEL;
  afterEach(() => {
    if (original === undefined) delete process.env.ANTHROPIC_MODEL;
    else process.env.ANTHROPIC_MODEL = original;
  });

  it("defaults to claude-opus-5", () => {
    delete process.env.ANTHROPIC_MODEL;
    expect(getTaggingModel()).toBe("claude-opus-5");
  });

  it("honours ANTHROPIC_MODEL", () => {
    process.env.ANTHROPIC_MODEL = "claude-haiku-4-5";
    expect(getTaggingModel()).toBe("claude-haiku-4-5");
  });
});
