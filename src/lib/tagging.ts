export const TAG_OPTIONS = [
  "landscape",
  "astro",
  "architecture",
  "sports",
  "underwater",
  "street",
  "portrait",
  "nature",
  "urban",
  "abstract",
  "golden hour",
  "blue hour",
  "long exposure",
  "black and white",
  "aerial",
  "macro",
] as const;

export type TagSuggestion = {
  tags: string[];
  location: string;
  caption: string;
};

export const TAGGING_PROMPT = `Analyse this photograph and respond with JSON only, no markdown:
{
  "tags": ["tag1", "tag2"],
  "location": "location if identifiable, empty string if not",
  "caption": "one evocative sentence describing the image"
}

For tags, choose from: ${TAG_OPTIONS.join(", ")}.
Pick 2-4 that genuinely apply. Be precise, not generous.`;

const DEFAULT_MODEL = "claude-opus-5";

export function getTaggingModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

export function parseTagResponse(text: string): TagSuggestion {
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed: unknown = JSON.parse(clean);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("tag response is not an object");
  }
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.tags)) {
    throw new Error("tag response has no tags array");
  }
  const allowed = new Set<string>(TAG_OPTIONS);
  const tags = obj.tags
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => allowed.has(t));
  return {
    tags,
    location: typeof obj.location === "string" ? obj.location : "",
    caption: typeof obj.caption === "string" ? obj.caption : "",
  };
}
