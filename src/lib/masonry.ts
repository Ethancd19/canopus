/** A constant gap unit added to a column's running height after each item, so columns
 * with more items don't win ties purely on having zero inter-item gap accounted for. */
const GAP_UNIT = 0.02;

/**
 * Distributes items into `columns` equal-width masonry columns by greedily placing each
 * item (in input order) into the column with the smallest running height so far. Ties go
 * to the lowest column index. A tile's relative height is `1 / aspectRatio` (columns are
 * equal width), falling back to `1` when `aspectRatio` isn't a finite positive number.
 *
 * Pure function: does not touch the DOM or any layout measurement.
 */
export function distributeMasonry<T extends { aspectRatio: number }>(
  items: T[],
  columns: number,
): { item: T; index: number }[][] {
  const cols = Math.max(1, columns);
  const heights = new Array<number>(cols).fill(0);
  const result: { item: T; index: number }[][] = Array.from({ length: cols }, () => []);

  items.forEach((item, index) => {
    let target = 0;
    for (let c = 1; c < cols; c++) {
      if (heights[c] < heights[target]) target = c;
    }
    result[target].push({ item, index });
    const ar = item.aspectRatio;
    const height = Number.isFinite(ar) && ar > 0 ? 1 / ar : 1;
    heights[target] += height + GAP_UNIT;
  });

  return result;
}
