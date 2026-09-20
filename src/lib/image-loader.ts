"use client";

import { IMAGE_WIDTHS, type ImageWidth } from "@/lib/image-request";

/** Smallest served width that is at least `width`; the largest when none is. */
export function snapWidth(width: number): ImageWidth {
  for (const w of IMAGE_WIDTHS) if (w >= width) return w;
  return IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
}

/**
 * next/image loader. `src` is the photo's storageKey (e.g. "photos/<uuid>.jpg").
 * Quality is fixed server-side at 80, so it is ignored here on purpose.
 */
export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  return `/img/${src}?w=${snapWidth(width)}`;
}
