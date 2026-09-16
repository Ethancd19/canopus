import { db } from "@/lib/db";
import { apiOk, handleRouteError } from "@/lib/api";
import { requireAdmin } from "@/lib/require-admin";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const photos = await db.photo.findMany({ orderBy: { createdAt: "desc" } });
    return apiOk({ photos });
  } catch (err) {
    return handleRouteError(err);
  }
}
