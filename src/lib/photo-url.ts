import type { ImageWidth } from "@/lib/image-request";

type Source = { storageKey: string | null; cloudinaryId: string | null };

/**
 * URL for a photo at one of the allowed widths. Prefers R2 via the /img route;
 * falls back to Cloudinary for rows that have not been migrated yet.
 */
export function photoSrc(photo: Source, width: ImageWidth): string {
  if (photo.storageKey) return `/img/${photo.storageKey}?w=${width}`;
  if (photo.cloudinaryId) {
    const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    return `https://res.cloudinary.com/${cloud}/image/upload/w_${width},q_auto,f_auto/${photo.cloudinaryId}`;
  }
  return "";
}
