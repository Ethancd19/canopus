import { getEdgeCache, getEnv, getWaitUntil } from "@/lib/cloudflare";
import { parseImageRequest, pickFormat } from "@/lib/image-request";

export const dynamic = "force-dynamic";

const IMMUTABLE = "public, max-age=31536000, immutable";
const NEGATIVE_CACHE = "public, max-age=60";

function error(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain", "cache-control": NEGATIVE_CACHE },
  });
}

function cachePut(cache: Cache | null, key: Request, response: Response) {
  if (cache) getWaitUntil()(cache.put(key, response.clone()).catch(() => {}));
}

// Any object under photos/ is servable by key regardless of `published`; keys
// are unguessable UUIDs and the admin never exposes unpublished keys. Revisit
// if unpublished must be truly private.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = parseImageRequest(url, request.headers.get("accept"));
  const cache = getEdgeCache();

  if ("error" in parsed) {
    // No parsed key/width/format exists for a malformed request, so fall back
    // to the raw path plus the negotiated format for the cache key.
    const format = pickFormat(request.headers.get("accept"));
    const key = new Request(`${url.origin}${url.pathname}?w=${url.searchParams.get("w") ?? ""}&f=${format}`);
    const response = error(parsed.error, parsed.status);
    cachePut(cache, key, response);
    return response;
  }

  // The edge cache ignores Vary for lookups, so the negotiated format is
  // folded into the key; other query params (e.g. the removed `q`) are
  // dropped so they can't fragment the cache.
  const key = new Request(`${url.origin}/img/${parsed.key}?w=${parsed.width}&f=${parsed.format}`);
  if (cache) {
    const hit = await cache.match(key);
    if (hit) return hit;
  }

  try {
    const env = getEnv();
    const object = await env.PHOTOS.get(parsed.key);
    if (!object) {
      const response = error("not found", 404);
      cachePut(cache, key, response);
      return response;
    }

    const output = await env.IMAGES.input(object.body)
      .transform({ width: parsed.width })
      .output({ format: parsed.format, quality: parsed.quality });

    const response = new Response(output.image(), {
      status: 200,
      headers: {
        "content-type": parsed.format,
        "cache-control": IMMUTABLE,
        vary: "Accept",
      },
    });

    cachePut(cache, key, response);
    return response;
  } catch (err) {
    console.error("[img] failed to serve", parsed.key, err);
    return error("image unavailable", 502);
  }
}
