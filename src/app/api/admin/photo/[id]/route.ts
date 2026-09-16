import { db } from "@/lib/db";
import { apiError, apiOk, handleRouteError } from "@/lib/api";
import { requireAdmin } from "@/lib/require-admin";
import { pickPhotoFields } from "@/lib/photo-fields";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const data = pickPhotoFields(await request.json());
    if (Object.keys(data).length === 0) return apiError("no editable fields in body", 400);
    const photo = await db.photo.update({
      where: { id },
      data: data as Parameters<typeof db.photo.update>[0]["data"],
    });
    return apiOk({ photo });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    await db.photo.delete({ where: { id } });
    return apiOk({});
  } catch (err) {
    return handleRouteError(err);
  }
}
