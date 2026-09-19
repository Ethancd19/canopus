/**
 * Pure validation for the `/api/admin/photos/bulk` and `/api/admin/photos/order`
 * request bodies. Kept free of `db`/`fetch` so it can be unit tested directly.
 */

export const MAX_BULK_IDS = 500;

export const BULK_ACTIONS = [
  "publish",
  "unpublish",
  "delete",
  "addTag",
  "removeTag",
  "addToCollection",
  "removeFromCollection",
] as const;

export type BulkAction = (typeof BULK_ACTIONS)[number];

export type ParsedBulkRequest = {
  ids: string[];
  action: BulkAction;
  tag?: string;
  collectionId?: string;
};

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/** Validates the shared `{ ids: string[] }` shape used by both bulk endpoints. */
export function parseIdsList(body: unknown, max: number = MAX_BULK_IDS): ParseResult<string[]> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>).ids : undefined;
  if (!isStringArray(raw) || raw.length === 0) {
    return { ok: false, error: "ids must be a non-empty array of strings" };
  }
  if (raw.some((id) => id.trim() === "")) {
    return { ok: false, error: "ids must be non-empty strings" };
  }
  // Dedupe while preserving first-occurrence order (Set insertion order).
  const ids = Array.from(new Set(raw));
  if (ids.length > max) return { ok: false, error: `ids must not exceed ${max}` };
  return { ok: true, value: ids };
}

function isBulkAction(value: unknown): value is BulkAction {
  return typeof value === "string" && (BULK_ACTIONS as readonly string[]).includes(value);
}

/** Validates the full bulk-action request body. */
export function parseBulkRequest(body: unknown): ParseResult<ParsedBulkRequest> {
  const idsResult = parseIdsList(body);
  if (!idsResult.ok) return idsResult;

  const action = typeof body === "object" && body !== null ? (body as Record<string, unknown>).action : undefined;
  if (!isBulkAction(action)) return { ok: false, error: "invalid action" };

  const payload =
    typeof body === "object" && body !== null
      ? ((body as Record<string, unknown>).payload as Record<string, unknown> | undefined)
      : undefined;

  const value: ParsedBulkRequest = { ids: idsResult.value, action };

  if (action === "addTag" || action === "removeTag") {
    const rawTag = payload?.tag;
    const tag = typeof rawTag === "string" ? rawTag.trim().toLowerCase() : "";
    if (!tag) return { ok: false, error: "tag is required" };
    value.tag = tag;
  }

  if (action === "addToCollection" || action === "removeFromCollection") {
    const rawId = payload?.collectionId;
    const collectionId = typeof rawId === "string" ? rawId.trim() : "";
    if (!collectionId) return { ok: false, error: "collectionId is required" };
    value.collectionId = collectionId;
  }

  return { ok: true, value };
}
