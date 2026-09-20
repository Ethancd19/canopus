import { describe, it, expect } from "vitest";
import { distributeMasonry } from "@/lib/masonry";

const photo = (aspectRatio: number) => ({ aspectRatio });

describe("distributeMasonry", () => {
  it("places equal-height items one per column in order", () => {
    const items = [photo(1.5), photo(1.5), photo(1.5)];
    const cols = distributeMasonry(items, 3);
    expect(cols).toEqual([
      [{ item: items[0], index: 0 }],
      [{ item: items[1], index: 1 }],
      [{ item: items[2], index: 2 }],
    ]);
  });

  it("keeps a tall item alone until the other column's running height overtakes it", () => {
    // aspect 0.5 -> height 2; aspect 1.5 -> height 1/1.5 = 0.6666...
    // col0 after item0: 2 + 0.02 = 2.02
    // col1 after item1: 0.6667 + 0.02 = 0.6867
    // col1 after item2: 0.6867 + 0.6867 = 1.3733 (still < col0's 2.02, so item3 also goes to col1)
    const items = [photo(0.5), photo(1.5), photo(1.5), photo(1.5)];
    const cols = distributeMasonry(items, 2);
    expect(cols).toEqual([
      [{ item: items[0], index: 0 }],
      [
        { item: items[1], index: 1 },
        { item: items[2], index: 2 },
        { item: items[3], index: 3 },
      ],
    ]);
  });

  it("treats columns < 1 as a single column", () => {
    const items = [photo(1.5), photo(0.5), photo(1)];
    const cols = distributeMasonry(items, 0);
    expect(cols).toEqual([
      [
        { item: items[0], index: 0 },
        { item: items[1], index: 1 },
        { item: items[2], index: 2 },
      ],
    ]);
  });

  it("preserves each item's original index regardless of which column it lands in", () => {
    const items = [photo(0.5), photo(2), photo(1.5), photo(0.8), photo(3)];
    const cols = distributeMasonry(items, 3);
    const flatIndexes = cols.flat().map((entry) => entry.index).sort((a, b) => a - b);
    expect(flatIndexes).toEqual([0, 1, 2, 3, 4]);
    cols.flat().forEach((entry) => {
      expect(entry.item).toBe(items[entry.index]);
    });
  });

  it("falls back to a height of 1 when aspectRatio is not a finite positive number", () => {
    const items = [photo(Number.NaN), photo(1)];
    const cols = distributeMasonry(items, 2);
    // Both have height 1 -> first goes to column 0 (tie -> lowest index), second to column 1.
    expect(cols).toEqual([
      [{ item: items[0], index: 0 }],
      [{ item: items[1], index: 1 }],
    ]);
  });
});
