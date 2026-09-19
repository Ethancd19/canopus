import { db } from "@/lib/db";
import { apiError, apiOk, handleRouteError } from "@/lib/api";
import { requireAdmin } from "@/lib/require-admin";
import { isSlugConflict, slugify } from "@/lib/slug";

type Ctx = { params: Promise<{ id: string }> };

const COLLECTION_EDITABLE_FIELDS = ["title", "slug", "description", "published", "coverId", "order"] as const;

function pickCollectionFields(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") return {};
  const src = body as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of COLLECTION_EDITABLE_FIELDS) {
    if (key in src && src[key] !== undefined) out[key] = src[key];
  }
  if (typeof out.title === "string") out.title = out.title.trim();
  if (typeof out.slug === "string") out.slug = slugify(out.slug);
  return out;
}

/** Per-field type/shape checks for the allowlisted PATCH fields (slug is normalized in `pickCollectionFields` instead). */
const COLLECTION_FIELD_VALIDATORS: Record<string, (value: unknown) => boolean> = {
  title: (v) => typeof v === "string" && v.length > 0 && v.length <= 200,
  description: (v) => v === null || typeof v === "string",
  published: (v) => typeof v === "boolean",
  order: (v) => typeof v === "number" && Number.isInteger(v) && v >= 0,
  coverId: (v) => v === null || typeof v === "string",
};

/** Returns the names of any allowlisted fields present in `data` whose value has the wrong shape. */
function invalidCollectionFields(data: Record<string, unknown>): string[] {
  return Object.keys(data).filter((key) => {
    const validator = COLLECTION_FIELD_VALIDATORS[key];
    return validator && !validator(data[key]);
  });
}

export async function GET(_request: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const collection = await db.collection.findUnique({ where: { id }, include: { cover: true } });
    if (!collection) return apiError("collection not found", 404);
    const photos = await db.collectionPhoto.findMany({
      where: { collectionId: id },
      orderBy: { order: "asc" },
      include: { photo: true },
    });
    return apiOk({ collection, photos });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const existing = await db.collection.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return apiError("collection not found", 404);

    const data = pickCollectionFields(await request.json());
    if (Object.keys(data).length === 0) return apiError("no editable fields in body", 400);

    const invalidFields = invalidCollectionFields(data);
    if (invalidFields.length > 0) return apiError(`invalid fields: ${invalidFields.join(", ")}`, 400);

    if (data.coverId !== undefined && data.coverId !== null) {
      const member = await db.collectionPhoto.findUnique({
        where: { collectionId_photoId: { collectionId: id, photoId: data.coverId as string } },
      });
      if (!member) return apiError("coverId must be a member of the collection", 400);
    }

    try {
      const collection = await db.collection.update({
        where: { id },
        data: data as Parameters<typeof db.collection.update>[0]["data"],
      });
      return apiOk({ collection });
    } catch (err) {
      if (isSlugConflict(err)) return apiError("slug already in use", 409);
      throw err;
    }
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const existing = await db.collection.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return apiError("collection not found", 404);
    await db.collection.delete({ where: { id } });
    return apiOk({});
  } catch (err) {
    return handleRouteError(err);
  }
}
