import Anthropic from "@anthropic-ai/sdk";
import { apiError, apiOk, handleRouteError } from "@/lib/api";
import { requireAdmin } from "@/lib/require-admin";
import { getTaggingModel, parseTagResponse, TAGGING_PROMPT } from "@/lib/tagging";

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
    const { imageUrl } = (await request.json()) as { imageUrl?: unknown };
    if (!isHttpsUrl(imageUrl)) {
      return apiError("imageUrl must be an https URL", 400);
    }

    const client = new Anthropic();
    const response = await client.messages.create({
      model: getTaggingModel(),
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: imageUrl } },
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
