export const PHOTO_EDITABLE_FIELDS = [
  "title",
  "slug",
  "format",
  "tags",
  "featured",
  "order",
  "caption",
  "location",
  "takenAt",
  "camera",
  "lens",
  "focalLength",
  "aperture",
  "shutterSpeed",
  "iso",
  "filmStock",
  "filmFormat",
] as const;

export type PhotoEditableField = (typeof PHOTO_EDITABLE_FIELDS)[number];

export function pickPhotoFields(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") return {};
  const src = body as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of PHOTO_EDITABLE_FIELDS) {
    if (key in src && src[key] !== undefined) out[key] = src[key];
  }
  return out;
}
