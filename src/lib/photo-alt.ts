import type { Photo } from "@/types/photo";

type AltSource = Pick<Photo, "caption" | "location" | "format">;

const FORMAT_WORDS: Record<Photo["format"], string> = {
  DIGITAL: "Digital",
  FILM_35MM: "35mm film",
  FILM_120MM: "120 film",
};

/**
 * Accessible description for a public photo. Titles are admin-only (many are
 * camera filenames or personal notes), so this uses the caption, then the
 * location, then a generic line that names the format.
 */
export function photoAlt(photo: AltSource): string {
  const caption = photo.caption?.trim();
  if (caption) return caption;
  const location = photo.location?.trim();
  if (location) return location;
  return `${FORMAT_WORDS[photo.format]} photograph by Ethan Duval`;
}
