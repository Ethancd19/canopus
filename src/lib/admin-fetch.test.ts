import { describe, expect, it, vi } from "vitest";
import { adminFetch } from "@/lib/admin-fetch";

describe("adminFetch", () => {
  it("returns a non-401 response unchanged", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));

    const res = await adminFetch("/api/admin/photos");

    expect(res.status).toBe(200);
  });

  it("redirects to /admin/login on 401", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 401 }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = { location: { href: "" } } as never;

    void adminFetch("/api/admin/photos");
    await Promise.resolve();
    await Promise.resolve();

    expect(window.location.href).toBe("/admin/login");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).window;
  });
});
