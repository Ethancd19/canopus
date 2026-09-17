import { apiError, apiOk, handleRouteError } from "@/lib/api";
import { requireAdmin } from "@/lib/require-admin";
import { getEnv } from "@/lib/cloudflare";
import { isAcceptedType, MAX_UPLOAD_BYTES, storeImage } from "@/lib/storage";

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES + 1024 * 1024) {
      return apiError("file exceeds 25 MB", 413);
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return apiError("file is required", 400);
    if (!isAcceptedType(file.type)) return apiError(`unsupported type ${file.type || "(none)"}`, 415);
    if (file.size > MAX_UPLOAD_BYTES) return apiError("file exceeds 25 MB", 413);

    const stored = await storeImage(getEnv(), await file.arrayBuffer(), file.type);
    return apiOk({ ...stored, originalFilename: file.name });
  } catch (err) {
    return handleRouteError(err);
  }
}
