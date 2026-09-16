import { describe, expect, it } from "vitest";
import { hashPassword, verifyAdminPassword } from "@/lib/password";

describe("password", () => {
  it("verifies a password against its own hash", async () => {
    const hash = await hashPassword("correct horse");
    expect(hash).not.toBe("correct horse");
    expect(await verifyAdminPassword("correct horse", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct horse");
    expect(await verifyAdminPassword("battery staple", hash)).toBe(false);
  });

  it("returns false when the hash is missing or empty", async () => {
    expect(await verifyAdminPassword("anything", undefined)).toBe(false);
    expect(await verifyAdminPassword("anything", "")).toBe(false);
  });

  it("returns false for an empty candidate", async () => {
    const hash = await hashPassword("correct horse");
    expect(await verifyAdminPassword("", hash)).toBe(false);
  });
}, 30_000);
