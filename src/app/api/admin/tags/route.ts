import Anthropic from "@anthropic-ai/sdk";
import { apiError, apiOk, handleRouteError } from "@/lib/api";
import { requireAdmin } from "@/lib/require-admin";
import { getTaggingModel, parseTagResponse, TAGGING_PROMPT } from "@/lib/tagging";
import { getEnv } from "@/lib/cloudflare";
import { KEY_PATTERN } from "@/lib/image-request";

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = (await request.json()) as { imageUrl?: unknown; storageKey?: unknown };
    let imageBlock: Anthropic.ImageBlockParam;
    if (typeof body.storageKey === "string" && KEY_PATTERN.test(body.storageKey)) {
      const env = getEnv();
      const object = await env.PHOTOS.get(body.storageKey);
      if (!object) return apiError("photo not found in storage", 404);
      const out = await env.IMAGES.input(object.body).transform({ width: 1280 }).output({ format: "image/jpeg", quality: 80 });
      const data = Buffer.from(await new Response(out.image()).arrayBuffer()).toString("base64");
      imageBlock = { type: "image", source: { type: "base64", media_type: "image/jpeg", data } };
    } else if (isHttpsUrl(body.imageUrl)) {
      imageBlock = { type: "image", source: { type: "url", url: body.imageUrl } };
    } else {
      return apiError("storageKey or an https imageUrl is required", 400);
    }

    const client = new Anthropic();
    const response = await client.messages.create({
      model: getTaggingModel(),
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            imageBlock,
            { type: "text", text: TAGGING_PROMPT },
          ],
        },
      ],
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
    const suggestion = parseTagResponse(text);
    return apiOk(suggestion);
  } catch (err) {
    return handleRouteError(err);
  }
}
