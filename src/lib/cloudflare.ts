import { getCloudflareContext } from "@opennextjs/cloudflare";

// Structural types for the two bindings this app uses. The official
// @cloudflare/workers-types package redefines DOM globals (fetch, Response)
// and breaks tsc for the rest of the app, so we describe only what we call.

export interface BucketObject {
  body: ReadableStream;
  size: number;
  httpEtag: string;
  httpMetadata?: { contentType?: string };
  writeHttpMetadata(headers: Headers): void;
}

export interface PhotoBucket {
  get(key: string): Promise<BucketObject | null>;
  head(key: string): Promise<{ size: number } | null>;
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | Blob,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
}

export type ImageFormat = "image/avif" | "image/webp" | "image/jpeg";

export interface ImageOutput {
  image(): ReadableStream;
  contentType(): string;
  response(): Response;
}

export interface ImageTransformer {
  transform(options: { width?: number; height?: number; fit?: string; blur?: number }): ImageTransformer;
  output(options: { format: ImageFormat; quality?: number }): Promise<ImageOutput>;
}

export interface ImageInfo {
  format: string;
  fileSize: number;
  width?: number;
  height?: number;
}

export interface ImagesApi {
  input(stream: ReadableStream): ImageTransformer;
  info(stream: ReadableStream): Promise<ImageInfo>;
}

export interface AppEnv {
  PHOTOS: PhotoBucket;
  IMAGES: ImagesApi;
}

/** Bindings declared in wrangler.jsonc. Throws early if one is missing. */
export function getEnv(): AppEnv {
  const env = getCloudflareContext().env as unknown as Partial<AppEnv>;
  for (const name of ["PHOTOS", "IMAGES"] as const) {
    if (!env[name]) throw new Error(`Cloudflare binding ${name} is not configured`);
  }
  return env as AppEnv;
}

/** `ctx.waitUntil` for work that should outlive the response (edge cache writes). */
export function getWaitUntil(): (promise: Promise<unknown>) => void {
  const { ctx } = getCloudflareContext();
  return (promise) => ctx.waitUntil(promise);
}

/** The Workers edge cache, or null outside workerd (next dev, tests). */
export function getEdgeCache(): Cache | null {
  const c = (globalThis as { caches?: { default?: Cache } }).caches;
  return c && c.default ? c.default : null;
}
