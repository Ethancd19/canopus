import type { AppEnv } from "@/lib/cloudflare";

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AcceptedType = (typeof ACCEPTED_TYPES)[number];
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export type StoredImage = {
  storageKey: string;
  width: number;
  height: number;
  mimeType: string;
  sizeBytes: number;
  blurDataUrl: string;
};

export function isAcceptedType(mime: string): mime is AcceptedType {
  return (ACCEPTED_TYPES as readonly string[]).includes(mime);
}

export function extensionFor(mime: string): "jpg" | "png" | "webp" {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export function newStorageKey(mime: string): string {
  return `photos/${crypto.randomUUID()}.${extensionFor(mime)}`;
}

export function streamOf(bytes: ArrayBuffer): ReadableStream {
  return new Blob([bytes]).stream();
}

async function readAll(stream: ReadableStream): Promise<Uint8Array> {
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Reads dimensions, writes the original to R2, and returns a 16 px blur placeholder. */
export async function storeImage(env: AppEnv, bytes: ArrayBuffer, mime: string): Promise<StoredImage> {
  const info = await env.IMAGES.info(streamOf(bytes));
  if (!info.width || !info.height) throw new Error("could not read image dimensions");

  const storageKey = newStorageKey(mime);
  await env.PHOTOS.put(storageKey, bytes, { httpMetadata: { contentType: mime } });

  let blurDataUrl: string;
  try {
    const tiny = await env.IMAGES.input(streamOf(bytes))
      .transform({ width: 16 })
      .output({ format: "image/webp", quality: 50 });
    const blur = await readAll(tiny.image());
    blurDataUrl = `data:image/webp;base64,${Buffer.from(blur).toString("base64")}`;
  } catch (err) {
    try {
      await env.PHOTOS.delete(storageKey);
    } catch {
      // best effort: nothing more we can do if the orphan cleanup itself fails
    }
    throw err;
  }

  return { storageKey, width: info.width, height: info.height, mimeType: mime, sizeBytes: bytes.byteLength, blurDataUrl };
}
