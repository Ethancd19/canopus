import { db } from "@/lib/db";
import { apiError, apiOk, handleRouteError } from "@/lib/api";
import { requireAdmin } from "@/lib/require-admin";

const REQUIRED = ["title", "slug", "cloudinaryId", "format", "width", "height", "aspectRatio"] as const;
const VALID_FORMATS = ["DIGITAL", "FILM_35MM", "FILM_120MM"] as const;

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const missing = REQUIRED.filter(
      (k) => body[k] === undefined || body[k] === null || body[k] === "",
    );
    if (missing.length > 0) {
      return apiError(`missing required fields: ${missing.join(", ")}`, 400);
    }
    if (!VALID_FORMATS.includes(body.format as (typeof VALID_FORMATS)[number])) {
      return apiError("invalid format", 400);
    }

    const photo = await db.photo.create({
      data: {
        title: String(body.title),
        slug: String(body.slug),
        cloudinaryId: String(body.cloudinaryId),
        format: body.format as (typeof VALID_FORMATS)[number],
        width: Number(body.width),
        height: Number(body.height),
        aspectRatio: Number(body.aspectRatio),
        tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
        featured: Boolean(body.featured ?? false),
        location: (body.location as string | null) ?? null,
        caption: (body.caption as string | null) ?? null,
        camera: (body.camera as string | null) ?? null,
        lens: (body.lens as string | null) ?? null,
        focalLength: (body.focalLength as string | null) ?? null,
        aperture: (body.aperture as string | null) ?? null,
        shutterSpeed: (body.shutterSpeed as string | null) ?? null,
        iso: (body.iso as string | null) ?? null,
        filmStock: (body.filmStock as string | null) ?? null,
        filmFormat: (body.filmFormat as string | null) ?? null,
      },
    });

    return apiOk({ photo });
  } catch (err) {
    return handleRouteError(err);
  }
}
