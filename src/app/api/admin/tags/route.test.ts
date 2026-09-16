import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

// vi.mock is hoisted above imports, so the mock fn must be hoisted too.
const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create };
  },
}));

import { auth } from "@/lib/auth";
import { POST } from "./route";

const mockedAuth = vi.mocked(auth);

function req(body: unknown) {
  return new Request("http://localhost/api/admin/tags", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/tags", () => {
  beforeEach(() => {
    mockedAuth.mockReset();
    create.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await POST(req({ imageUrl: "https://example.com/a.jpg" }));
    expect(res.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a non-https imageUrl", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    const res = await POST(req({ imageUrl: "ftp://example.com/a.jpg" }));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns parsed suggestions", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    create.mockResolvedValue({
      content: [
        {
          type: "text",
          text: '{"tags":["street"],"location":"Tokyo","caption":"Neon rain."}',
        },
      ],
    });
    const res = await POST(req({ imageUrl: "https://example.com/a.jpg" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      tags: ["street"],
      location: "Tokyo",
      caption: "Neon rain.",
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                type: "image",
                source: { type: "url", url: "https://example.com/a.jpg" },
              }),
            ]),
          }),
        ],
      }),
    );
  });
});
