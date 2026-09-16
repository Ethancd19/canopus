import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/require-admin";

const mockedAuth = vi.mocked(auth);

describe("requireAdmin", () => {
  beforeEach(() => mockedAuth.mockReset());

  it("returns a 401 response when there is no session", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await requireAdmin();
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
    expect(await res!.json()).toEqual({ ok: false, error: "unauthorized" });
  });

  it("returns null when a session exists", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    expect(await requireAdmin()).toBeNull();
  });
});
