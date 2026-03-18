import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "url", url: imageUrl },
            },
            {
              type: "text",
              text: `Analyse this photograph and respond with JSON only, no markdown:
{
  "tags": ["tag1", "tag2"],
  "location": "location if identifiable, empty string if not",
  "caption": "one evocative sentence describing the image"
}

For tags, choose from: landscape, astro, architecture, sports, underwater, street, portrait, nature, urban, abstract, golden hour, blue hour, long exposure, black and white, aerial, macro.
Pick 2-4 that genuinely apply. Be precise, not generous.`,
            },
          ],
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const clean = text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(clean);

    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
