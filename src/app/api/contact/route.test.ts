import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock is hoisted above imports, so the mock fn must be hoisted too.
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/contact", () => {
  beforeEach(() => {
    send.mockReset();
  });

  it("returns 400 when a required field is missing and does not send", async () => {
    const res = await POST(req({ name: "Ethan", message: "hi" }));
    expect(res.status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it("returns 200 on success and escapes HTML in the message", async () => {
    send.mockResolvedValue({});
    const res = await POST(
      req({
        name: "Ethan",
        email: "ethan@example.com",
        subject: "Hi",
        message: "<b>",
      }),
    );
    expect(res.status).toBe(200);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("&lt;b&gt;"),
      }),
    );
  });

  it("returns 500 with a generic error when send rejects", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    send.mockRejectedValue(new Error("boom"));
    const res = await POST(
      req({
        name: "Ethan",
        email: "ethan@example.com",
        message: "hi",
      }),
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      ok: false,
      error: "Failed to send message",
    });
  });
});
