import { db } from "@/lib/db";
import { apiError, apiOk, handleRouteError } from "@/lib/api";
import { requireAdmin } from "@/lib/require-admin";
import { parseIdsList, MAX_BULK_IDS, type ParseResult } from "@/lib/bulk";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Like `parseIdsList` in `src/lib/bulk.ts` (blank strings rejected,
 * duplicates dropped keeping first occurrence, capped at `MAX_BULK_IDS`) but
 * - unlike that helper - allows an empty array, since `PUT` uses one to
 * clear membership.
 */
function parsePutPhotoIds(body: unknown): ParseResult<string[]> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>).ids : undefined;
  if (!Array.isArray(raw) || !raw.every((item) => typeof item === "string")) {
    return { ok: false, error: "ids must be an array of strings" };
  }
  if (raw.some((id) => id.trim() === "")) {
    return { ok: false, error: "ids must be non-empty strings" };
  }
  const ids = Array.from(new Set(raw));
  if (ids.length > MAX_BULK_IDS) return { ok: false, error: `ids must not exceed ${MAX_BULK_IDS}` };
  return { ok: true, value: ids };
}

/** Clears `coverId` on the collection if it currently points at one of `removedIds`. */
async function clearCoverIfRemoved(collectionId: string, removedIds: string[]) {
  if (removedIds.length === 0) return;
  await db.collection.updateMany({
    where: { id: collectionId, coverId: { in: removedIds } },
    data: { coverId: null },
  });
}

async function findCollectionOr404(id: string) {
  return db.collection.findUnique({ where: { id }, select: { id: true } });
}

/** Filters `ids` down to photos that still exist, preserving the given order. */
async function filterExistingPhotoIds(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await db.photo.findMany({ where: { id: { in: ids } }, select: { id: true } });
  const existing = new Set(rows.map((row) => row.id));
  return ids.filter((id) => existing.has(id));
}

/** POST: add members, appended after the current max order. */
export async function POST(request: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const parsed = parseIdsList(await request.json());
    if (!parsed.ok) return apiError(parsed.error, 400);
    const { id } = await params;

    const collection = await findCollectionOr404(id);
    if (!collection) return apiError("collection not found", 404);

    const ids = await filterExistingPhotoIds(parsed.value);
    const agg = await db.collectionPhoto.aggregate({ where: { collectionId: id }, _max: { order: true } });
    const base = (agg._max.order ?? -1) + 1;
    const result = await db.collectionPhoto.createMany({
      data: ids.map((photoId, index) => ({ collectionId: id, photoId, order: base + index })),
      skipDuplicates: true,
    });
    return apiOk({ count: result.count });
  } catch (err) {
    return handleRouteError(err);
  }
}

/**
 * PUT: replace the full ordered membership with `ids` (in the given order).
 * Two steps, not atomic (PrismaNeonHttp has no transactions): members no
 * longer in `ids` are deleted, then every id in `ids` is upserted with its
 * new order. A crash between the two can leave stale rows if the delete ran
 * but an upsert did not; a retry of the same PUT is idempotent and heals it.
 */
export async function PUT(request: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const parsed = parsePutPhotoIds(await request.json());
    if (!parsed.ok) return apiError(parsed.error, 400);
    const { id } = await params;

    const collection = await findCollectionOr404(id);
    if (!collection) return apiError("collection not found", 404);

    const ids = await filterExistingPhotoIds(parsed.value);
    const existing = await db.collectionPhoto.findMany({ where: { collectionId: id }, select: { photoId: true } });
    const existingIds = existing.map((row) => row.photoId);
    const toRemove = existingIds.filter((photoId) => !ids.includes(photoId));

    if (toRemove.length > 0) {
      await db.collectionPhoto.deleteMany({ where: { collectionId: id, photoId: { in: toRemove } } });
      await clearCoverIfRemoved(id, toRemove);
    }

    await Promise.all(
      ids.map((photoId, index) =>
        db.collectionPhoto.upsert({
          where: { collectionId_photoId: { collectionId: id, photoId } },
          create: { collectionId: id, photoId, order: index },
          update: { order: index },
        }),
      ),
    );

    return apiOk({ count: ids.length });
  } catch (err) {
    return handleRouteError(err);
  }
}

/** DELETE: remove the given members. */
export async function DELETE(request: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const parsed = parseIdsList(await request.json());
    if (!parsed.ok) return apiError(parsed.error, 400);
    const { id } = await params;

    const collection = await findCollectionOr404(id);
    if (!collection) return apiError("collection not found", 404);

    const result = await db.collectionPhoto.deleteMany({
      where: { collectionId: id, photoId: { in: parsed.value } },
    });
    await clearCoverIfRemoved(id, parsed.value);
    return apiOk({ count: result.count });
  } catch (err) {
    return handleRouteError(err);
  }
}
