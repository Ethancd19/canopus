import { describe, expect, it } from "vitest";
import { parseBulkRequest, parseIdsList } from "@/lib/bulk";

describe("parseIdsList", () => {
  it("accepts a non-empty array of strings", () => {
    const result = parseIdsList({ ids: ["a", "b"] });
    expect(result).toEqual({ ok: true, value: ["a", "b"] });
  });

  it("rejects a missing ids field", () => {
    const result = parseIdsList({});
    expect(result).toEqual({ ok: false, error: "ids must be a non-empty array of strings" });
  });

  it("rejects an empty array", () => {
    const result = parseIdsList({ ids: [] });
    expect(result.ok).toBe(false);
  });

  it("rejects a non-array ids", () => {
    const result = parseIdsList({ ids: "a" });
    expect(result.ok).toBe(false);
  });

  it("rejects an array with non-string entries", () => {
    const result = parseIdsList({ ids: ["a", 1] });
    expect(result.ok).toBe(false);
  });

  it("rejects more than 500 ids", () => {
    const ids = Array.from({ length: 501 }, (_, i) => `id${i}`);
    const result = parseIdsList({ ids });
    expect(result).toEqual({ ok: false, error: "ids must not exceed 500" });
  });

  it("accepts exactly 500 ids", () => {
    const ids = Array.from({ length: 500 }, (_, i) => `id${i}`);
    const result = parseIdsList({ ids });
    expect(result.ok).toBe(true);
  });

  it("rejects a blank string id", () => {
    const result = parseIdsList({ ids: ["a", ""] });
    expect(result).toEqual({ ok: false, error: "ids must be non-empty strings" });
  });

  it("rejects a whitespace-only string id", () => {
    const result = parseIdsList({ ids: ["a", "   "] });
    expect(result).toEqual({ ok: false, error: "ids must be non-empty strings" });
  });

  it("dedupes ids, preserving first-occurrence order", () => {
    const result = parseIdsList({ ids: ["a", "b", "a", "c", "b"] });
    expect(result).toEqual({ ok: true, value: ["a", "b", "c"] });
  });

  it("checks the max against the deduped count", () => {
    const ids = Array.from({ length: 500 }, () => "same-id");
    const result = parseIdsList({ ids });
    expect(result).toEqual({ ok: true, value: ["same-id"] });
  });
});

describe("parseBulkRequest", () => {
  it("rejects a non-object body", () => {
    expect(parseBulkRequest(null)).toEqual({ ok: false, error: "ids must be a non-empty array of strings" });
    expect(parseBulkRequest("nope")).toEqual({ ok: false, error: "ids must be a non-empty array of strings" });
  });

  it("rejects a missing or empty ids array", () => {
    expect(parseBulkRequest({ action: "publish" }).ok).toBe(false);
    expect(parseBulkRequest({ ids: [], action: "publish" }).ok).toBe(false);
  });

  it("rejects more than 500 ids", () => {
    const ids = Array.from({ length: 501 }, (_, i) => `id${i}`);
    const result = parseBulkRequest({ ids, action: "publish" });
    expect(result).toEqual({ ok: false, error: "ids must not exceed 500" });
  });

  it("rejects an invalid action", () => {
    const result = parseBulkRequest({ ids: ["a"], action: "nuke" });
    expect(result).toEqual({ ok: false, error: "invalid action" });
  });

  it("rejects a missing action", () => {
    const result = parseBulkRequest({ ids: ["a"] });
    expect(result.ok).toBe(false);
  });

  it.each(["publish", "unpublish", "delete"] as const)("accepts %s with just ids", (action) => {
    const result = parseBulkRequest({ ids: ["a", "b"], action });
    expect(result).toEqual({ ok: true, value: { ids: ["a", "b"], action } });
  });

  it.each(["addToCollection", "removeFromCollection"] as const)(
    "accepts %s and ignores an unnecessary tag payload",
    (action) => {
      const result = parseBulkRequest({ ids: ["a"], action, payload: { collectionId: "c1", tag: "ignored" } });
      expect(result).toEqual({ ok: true, value: { ids: ["a"], action, collectionId: "c1" } });
    },
  );

  it.each(["addTag", "removeTag"] as const)("trims and lowercases the tag for %s", (action) => {
    const result = parseBulkRequest({ ids: ["a"], action, payload: { tag: "  Landscape  " } });
    expect(result).toEqual({ ok: true, value: { ids: ["a"], action, tag: "landscape" } });
  });

  it.each(["addTag", "removeTag"] as const)("rejects %s with a missing tag", (action) => {
    const result = parseBulkRequest({ ids: ["a"], action });
    expect(result).toEqual({ ok: false, error: "tag is required" });
  });

  it.each(["addTag", "removeTag"] as const)("rejects %s with a blank tag", (action) => {
    const result = parseBulkRequest({ ids: ["a"], action, payload: { tag: "   " } });
    expect(result).toEqual({ ok: false, error: "tag is required" });
  });

  it.each(["addToCollection", "removeFromCollection"] as const)("rejects %s with a missing collectionId", (action) => {
    const result = parseBulkRequest({ ids: ["a"], action });
    expect(result).toEqual({ ok: false, error: "collectionId is required" });
  });

  it.each(["addToCollection", "removeFromCollection"] as const)("rejects %s with a blank collectionId", (action) => {
    const result = parseBulkRequest({ ids: ["a"], action, payload: { collectionId: "   " } });
    expect(result).toEqual({ ok: false, error: "collectionId is required" });
  });
});
