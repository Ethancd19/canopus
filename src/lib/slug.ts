/** Turns a filename into a human title: strips the extension, swaps `-`/`_` for spaces. */
export function titleFromFilename(filename: string): string {
  const title = filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").trim();
  return title || "Untitled";
}

/** Lowercases and hyphenates a string, collapsing separators and trimming the edges. */
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "untitled";
}

/** True for a Prisma unique-constraint violation on the `slug` column. */
export function isSlugConflict(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: unknown; meta?: { target?: unknown } };
  return e.code === "P2002" && Array.isArray(e.meta?.target) && e.meta.target.includes("slug");
}

const MAX_ATTEMPTS = 50;

/**
 * Finds a slug that `exists` reports as free, trying `base`, then `base-2`,
 * `base-3`, ... up to `MAX_ATTEMPTS` candidates before giving up.
 */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    if (!(await exists(candidate))) return candidate;
  }
  throw new Error(`could not find a unique slug for "${base}" after ${MAX_ATTEMPTS} tries`);
}
