import { NextResponse } from "next/server";
import { apiError, apiOk, handleRouteError } from "@/lib/api";
import { requireAdmin } from "@/lib/require-admin";
import { getEnv } from "@/lib/cloudflare";
import { isAcceptedType, MAX_UPLOAD_BYTES, storeImage } from "@/lib/storage";
import { db } from "@/lib/db";
import { slugify, titleFromFilename, uniqueSlug } from "@/lib/slug";

const VALID_FORMATS = ["DIGITAL", "FILM_35MM", "FILM_120MM"] as const;
type PhotoFormat = (typeof VALID_FORMATS)[number];

const EXIF_TEXT_FIELDS = ["camera", "lens", "focalLength", "aperture", "shutterSpeed", "iso", "takenAt"] as const;

function textField(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  return typeof value === "string" && value !== "" ? value : undefined;
}

/** True for a Prisma unique-constraint violation on the `slug` column. */
function isSlugConflict(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: unknown; meta?: { target?: unknown } };
  return e.code === "P2002" && Array.isArray(e.meta?.target) && e.meta.target.includes("slug");
}

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

    // Keys on the compressed file the browser sends (filename + size), not a
    // content hash - the same source image re-encoded differently (e.g. a
    // second export at a different quality) can slip through undetected.
    const force = textField(form, "force") === "1";
    if (!force) {
      const existing = await db.photo.findFirst({
        where: { originalFilename: file.name, sizeBytes: file.size },
        select: { id: true, title: true },
      });
      if (existing) {
        return NextResponse.json(
          { ok: false, error: `already uploaded as ${existing.title}`, existingId: existing.id },
          { status: 409 },
        );
      }
    }

    const stored = await storeImage(getEnv(), await file.arrayBuffer(), file.type);

    try {
      const title = titleFromFilename(file.name);
      const slugExists = async (candidate: string) => {
        const match = await db.photo.findUnique({ where: { slug: candidate }, select: { id: true } });
        return match !== null;
      };
      const slug = await uniqueSlug(slugify(title), slugExists);

      const requestedFormat = textField(form, "format");
      const format: PhotoFormat = (VALID_FORMATS as readonly string[]).includes(requestedFormat ?? "")
        ? (requestedFormat as PhotoFormat)
        : "DIGITAL";

      const exif: Record<string, string> = {};
      for (const key of EXIF_TEXT_FIELDS) {
        const value = textField(form, key);
        if (value !== undefined) exif[key] = value;
      }

      const data = {
        title,
        slug,
        storageKey: stored.storageKey,
        width: stored.width,
        height: stored.height,
        aspectRatio: stored.width / stored.height,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        blurDataUrl: stored.blurDataUrl,
        originalFilename: file.name,
        format,
        published: false,
        tags: [],
        ...exif,
      };

      let photo;
      try {
        photo = await db.photo.create({ data });
      } catch (createErr) {
        if (!isSlugConflict(createErr)) throw createErr;
        // Another upload claimed this slug between our uniqueness check and
        // the insert (both ran concurrently). Retry once with a slug that
        // folds in the current time, which can't realistically collide.
        const retrySlug = await uniqueSlug(`${slug}-${Date.now().toString(36).slice(-4)}`, slugExists);
        photo = await db.photo.create({ data: { ...data, slug: retrySlug } });
      }

      return apiOk({ photo });
    } catch (err) {
      try {
        await getEnv().PHOTOS.delete(stored.storageKey);
      } catch {
        // best effort: the row create already failed, nothing more we can do
      }
      throw err;
    }
  } catch (err) {
    return handleRouteError(err);
  }
}
