import { db } from "@/lib/db";
import { apiError, apiOk, handleRouteError } from "@/lib/api";
import { requireAdmin } from "@/lib/require-admin";
import { parseIdsList } from "@/lib/bulk";

export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const parsed = parseIdsList(await request.json());
    if (!parsed.ok) return apiError(parsed.error, 400);
    const ids = parsed.value;
    const results = await Promise.all(
      ids.map((id, index) => db.photo.updateMany({ where: { id }, data: { order: index } })),
    );
    const count = results.reduce((sum, r) => sum + r.count, 0);
    return apiOk({ count });
  } catch (err) {
    return handleRouteError(err);
  }
}
