import { Format } from "@/generated/prisma/enums";
import { slugify } from "@/lib/slug";

export const PHOTO_EDITABLE_FIELDS = [
  "title",
  "slug",
  "format",
  "tags",
  "featured",
  "order",
  "published",
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

/** A typed, partial view of the fields the PATCH route may write to a `Photo` row. */
export type PhotoPatchData = Partial<{
  title: string;
  slug: string;
  format: Format;
  tags: string[];
  featured: boolean;
  order: number;
  published: boolean;
  caption: string | null;
  location: string | null;
  takenAt: string | null;
  camera: string | null;
  lens: string | null;
  focalLength: string | null;
  aperture: string | null;
  shutterSpeed: string | null;
  iso: string | null;
  filmStock: string | null;
  filmFormat: string | null;
}>;

const FORMAT_VALUES = new Set<string>(Object.values(Format));

type Validator = (value: unknown) => boolean;

/** Accepts `null` or a `string` - every optional text column on `Photo`. */
const nullableString: Validator = (v) => v === null || typeof v === "string";

/** Per-field shape checks for the allowlisted PATCH fields (slug's `slugify` equality is checked separately below). */
const FIELD_VALIDATORS: Record<PhotoEditableField, Validator> = {
  title: (v) => typeof v === "string",
  slug: (v) => typeof v === "string",
  format: (v) => typeof v === "string" && FORMAT_VALUES.has(v),
  tags: (v) => Array.isArray(v) && v.every((t) => typeof t === "string"),
  featured: (v) => typeof v === "boolean",
  order: (v) => typeof v === "number" && Number.isFinite(v),
  published: (v) => typeof v === "boolean",
  caption: nullableString,
  location: nullableString,
  takenAt: nullableString,
  camera: nullableString,
  lens: nullableString,
  focalLength: nullableString,
  aperture: nullableString,
  shutterSpeed: nullableString,
  iso: nullableString,
  filmStock: nullableString,
  filmFormat: nullableString,
};

/**
 * Picks the allowlisted, editable fields out of a PATCH body. Fields with the
 * wrong shape are dropped and reported in `invalid` instead of being
 * silently coerced or passed through to Prisma. `slug`, once type-checked,
 * must also equal `slugify(slug)` and be non-empty.
 */
export function pickPhotoFields(body: unknown): { data: PhotoPatchData; invalid: string[] } {
  if (!body || typeof body !== "object") return { data: {}, invalid: [] };
  const src = body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  const invalid: string[] = [];

  for (const key of PHOTO_EDITABLE_FIELDS) {
    if (!(key in src) || src[key] === undefined) continue;
    const value = src[key];
    if (!FIELD_VALIDATORS[key](value)) {
      invalid.push(key);
      continue;
    }
    data[key] = value;
  }

  if (typeof data.slug === "string" && (data.slug === "" || data.slug !== slugify(data.slug))) {
    delete data.slug;
    invalid.push("slug");
  }

  return { data: data as PhotoPatchData, invalid };
}
