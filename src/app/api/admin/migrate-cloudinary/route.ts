import { db } from "@/lib/db";
import { apiOk, handleRouteError } from "@/lib/api";
import { requireAdmin } from "@/lib/require-admin";
import { getEnv } from "@/lib/cloudflare";
import { isAcceptedType, storeImage } from "@/lib/storage";

function originalUrl(cloudinaryId: string) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  return `https://res.cloudinary.com/${cloud}/image/upload/${cloudinaryId}`;
}

/** Copies every photo that still lives only on Cloudinary into R2. Safe to re-run. */
export async function POST(_request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const env = getEnv();
    const pending = await db.photo.findMany({
      where: { storageKey: null, cloudinaryId: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { id: true, cloudinaryId: true },
      take: 5,
    });

    const migrated: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const photo of pending) {
      try {
        const res = await fetch(originalUrl(photo.cloudinaryId!));
        if (!res.ok) throw new Error(`Cloudinary responded ${res.status}`);
        const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim();
        if (!isAcceptedType(mime)) throw new Error(`unsupported type ${mime || "(none)"}`);
        const stored = await storeImage(env, await res.arrayBuffer(), mime);
        await db.photo.update({
          where: { id: photo.id },
          data: {
            storageKey: stored.storageKey,
            width: stored.width,
            height: stored.height,
            aspectRatio: stored.width / stored.height,
            mimeType: stored.mimeType,
            sizeBytes: stored.sizeBytes,
            blurDataUrl: stored.blurDataUrl,
          },
        });
        migrated.push(photo.id);
      } catch (err) {
        failed.push({ id: photo.id, error: err instanceof Error ? err.message : String(err) });
      }
    }

    const pendingAfter = await db.photo.count({ where: { storageKey: null, cloudinaryId: { not: null } } });
    return apiOk({ migrated, failed, remaining: pendingAfter - failed.length });
  } catch (err) {
    return handleRouteError(err);
  }
}
