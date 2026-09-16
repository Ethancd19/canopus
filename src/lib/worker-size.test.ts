import { describe, expect, it } from "vitest";
import { parseGzipKiB } from "@/lib/worker-size";

const ESC = "";

describe("parseGzipKiB", () => {
  it("parses the gzip figure from wrangler's upload line", () => {
    expect(parseGzipKiB("Total Upload: 12638.00 KiB / gzip: 3379.29 KiB")).toBe(
      3379.29,
    );
  });

  it("parses the line when wrangler colours its output", () => {
    const coloured = `Total Upload: ${ESC}[33m58481.68 KiB / gzip: 18985.86 KiB${ESC}[39m`;

    expect(parseGzipKiB(coloured)).toBe(18985.86);
  });

  it("finds the line among surrounding wrangler output", () => {
    const output = [
      "wrangler 4.133.0",
      "Read 36 files from the assets directory",
      "Total Upload: 12638.00 KiB / gzip: 3379.29 KiB",
      "--dry-run: exiting now.",
    ].join("\n");

    expect(parseGzipKiB(output)).toBe(3379.29);
  });

  it("returns null when the line is absent", () => {
    expect(parseGzipKiB("[ERROR] Something went wrong")).toBeNull();
    expect(parseGzipKiB("")).toBeNull();
  });
});
