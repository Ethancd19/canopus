import { db } from "@/lib/db";
import { apiError, apiOk, handleRouteError } from "@/lib/api";
import { requireAdmin } from "@/lib/require-admin";
import { getEnv } from "@/lib/cloudflare";
import { parseBulkRequest } from "@/lib/bulk";

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const parsed = parseBulkRequest(await request.json());
    if (!parsed.ok) return apiError(parsed.error, 400);
    const { ids, action, tag, collectionId } = parsed.value;

    switch (action) {
      case "publish":
      case "unpublish": {
        const result = await db.photo.updateMany({
          where: { id: { in: ids } },
          data: { published: action === "publish" },
        });
        return apiOk({ count: result.count });
      }

      case "addTag":
      case "removeTag": {
        const rows = await db.photo.findMany({
          where: { id: { in: ids } },
          select: { id: true, tags: true },
        });
        await Promise.all(
          rows.map((row) => {
            const tags =
              action === "addTag"
                ? Array.from(new Set([...row.tags, tag as string]))
                : row.tags.filter((t) => t !== tag);
            return db.photo.update({ where: { id: row.id }, data: { tags } });
          }),
        );
        return apiOk({ count: rows.length });
      }

      case "delete": {
        const rows = await db.photo.findMany({
          where: { id: { in: ids } },
          select: { id: true, storageKey: true },
        });
        const delResult = await db.photo.deleteMany({ where: { id: { in: ids } } });
        const env = getEnv();
        await Promise.all(
          rows.map(async (row) => {
            if (!row.storageKey) return;
            try {
              await env.PHOTOS.delete(row.storageKey);
            } catch (err) {
              console.error(`[photos/bulk] row ${row.id} deleted but object ${row.storageKey} was not:`, err);
            }
          }),
        );
        return apiOk({ count: delResult.count });
      }

      case "addToCollection": {
        const collection = await db.collection.findUnique({
          where: { id: collectionId as string },
          select: { id: true },
        });
        if (!collection) return apiError("collection not found", 404);

        const existing = await db.photo.findMany({
          where: { id: { in: ids } },
          select: { id: true },
        });
        const existingIds = existing.map((p) => p.id);

        const agg = await db.collectionPhoto.aggregate({
          where: { collectionId: collectionId as string },
          _max: { order: true },
        });
        const base = (agg._max.order ?? -1) + 1;
        const result = await db.collectionPhoto.createMany({
          data: existingIds.map((photoId, index) => ({
            collectionId: collectionId as string,
            photoId,
            order: base + index,
          })),
          skipDuplicates: true,
        });
        return apiOk({ count: result.count });
      }

      case "removeFromCollection": {
        const result = await db.collectionPhoto.deleteMany({
          where: { collectionId: collectionId as string, photoId: { in: ids } },
        });
        // A removed photo may have been the collection's cover - don't leave
        // `coverId` pointing at a photo that's no longer a member.
        await db.collection.updateMany({
          where: { id: collectionId as string, coverId: { in: ids } },
          data: { coverId: null },
        });
        return apiOk({ count: result.count });
      }
    }
  } catch (err) {
    return handleRouteError(err);
  }
}
