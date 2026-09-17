import type { ImageFormat } from "@/lib/cloudflare";

export const IMAGE_WIDTHS = [320, 640, 960, 1280, 1920, 2560] as const;
export type ImageWidth = (typeof IMAGE_WIDTHS)[number];

export const IMAGE_QUALITY = 80;

export const KEY_PATTERN = /^photos\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

export type ParsedImageRequest = {
  key: string;
  width: ImageWidth;
  quality: number;
  format: ImageFormat;
};

export function pickFormat(accept: string | null): ImageFormat {
  const a = accept ?? "";
  if (a.includes("image/avif")) return "image/avif";
  if (a.includes("image/webp")) return "image/webp";
  return "image/jpeg";
}

export function parseImageRequest(
  url: URL,
  accept: string | null,
): ParsedImageRequest | { error: string; status: 400 } {
  let key: string;
  try {
    key = decodeURIComponent(url.pathname.replace(/^\/img\//, ""));
  } catch {
    return { error: "invalid image key", status: 400 };
  }
  if (!KEY_PATTERN.test(key)) return { error: "invalid image key", status: 400 };

  const width = Number(url.searchParams.get("w"));
  if (!(IMAGE_WIDTHS as readonly number[]).includes(width)) {
    return { error: `w must be one of ${IMAGE_WIDTHS.join(", ")}`, status: 400 };
  }

  return { key, width: width as ImageWidth, quality: IMAGE_QUALITY, format: pickFormat(accept) };
}
