import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-guard";

const mockedAuth = vi.mocked(auth);

describe("requireAdminPage", () => {
  beforeEach(() => mockedAuth.mockReset());

  it("redirects to the login page without a session", async () => {
    mockedAuth.mockResolvedValue(null as never);
    await expect(requireAdminPage()).rejects.toThrow("REDIRECT:/admin/login");
    expect(redirect).toHaveBeenCalledWith("/admin/login");
  });

  it("resolves quietly with a session", async () => {
    mockedAuth.mockResolvedValue({ user: { name: "Ethan" } } as never);
    await expect(requireAdminPage()).resolves.toBeUndefined();
  });
});
