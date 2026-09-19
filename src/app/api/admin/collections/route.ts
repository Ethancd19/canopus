import { db } from "@/lib/db";
import { apiError, apiOk, handleRouteError } from "@/lib/api";
import { requireAdmin } from "@/lib/require-admin";
import { isSlugConflict, slugify, uniqueSlug } from "@/lib/slug";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const collections = await db.collection.findMany({
      orderBy: { order: "asc" },
      include: { cover: true, _count: { select: { photos: true } } },
    });
    return apiOk({ collections });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = (await request.json()) as { title?: unknown; description?: unknown };
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return apiError("title is required", 400);
    const description = typeof body.description === "string" ? body.description : undefined;

    const slugExists = async (candidate: string) => {
      const match = await db.collection.findUnique({ where: { slug: candidate }, select: { id: true } });
      return match !== null;
    };
    const slug = await uniqueSlug(slugify(title), slugExists);

    const agg = await db.collection.aggregate({ _max: { order: true } });
    const order = (agg._max.order ?? -1) + 1;

    const data = { title, description, slug, published: false, order };
    let collection;
    try {
      collection = await db.collection.create({ data });
    } catch (createErr) {
      if (!isSlugConflict(createErr)) throw createErr;
      // Another create claimed this slug between our uniqueness check and
      // the insert (both ran concurrently). Retry once with a slug that
      // folds in the current time, which can't realistically collide.
      const retrySlug = await uniqueSlug(`${slug}-${Date.now().toString(36).slice(-4)}`, slugExists);
      collection = await db.collection.create({ data: { ...data, slug: retrySlug } });
    }
    return apiOk({ collection });
  } catch (err) {
    return handleRouteError(err);
  }
}
