import type { ImageWidth } from "@/lib/image-request";

type Source = { storageKey: string };

/** URL for a photo at one of the allowed widths, served through the /img route. */
export function photoSrc(photo: Source, width: ImageWidth): string {
  return `/img/${photo.storageKey}?w=${width}`;
}
