/** Strips ANSI colour codes so the parser works on captured wrangler output. */
const ANSI = /\[[0-9;]*m/g;

/**
 * Pulls the gzipped Worker size out of `wrangler deploy --dry-run` output,
 * which prints a line like
 * `Total Upload: 12638.00 KiB / gzip: 3379.29 KiB`.
 *
 * @returns the gzip size in KiB, or `null` when the line is absent.
 */
export function parseGzipKiB(output: string): number | null {
  const match = output.replace(ANSI, "").match(/gzip:\s*([\d.]+)\s*KiB/);
  if (!match) {
    return null;
  }
  const size = Number(match[1]);
  return Number.isFinite(size) ? size : null;
}
