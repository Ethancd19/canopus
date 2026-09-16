import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { PrismaClient, PrismaNeonHttp } = vi.hoisted(() => ({
  PrismaClient: vi.fn(function (this: {
    photo: string;
    $connect: () => unknown;
  }) {
    this.photo = "photo-delegate";
    this.$connect = vi.fn(function (this: unknown) {
      return this;
    });
  }),
  PrismaNeonHttp: vi.fn(),
}));

vi.mock("@/generated/prisma/client", () => ({ PrismaClient }));
vi.mock("@prisma/adapter-neon", () => ({ PrismaNeonHttp }));

const CONNECTION_STRING = "postgresql://user:pw@host/db";

describe("db", () => {
  beforeEach(() => {
    // The module caches the client in a module-level variable.
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", CONNECTION_STRING);
  });

  afterEach(() => {
    // @types/node marks process.env entries read-only, so the tests set them
    // through Vitest's helper; this keeps the stubs out of other test files.
    vi.unstubAllEnvs();
  });

  it("does not construct a client at import time", async () => {
    await import("@/lib/db");
    expect(PrismaClient).not.toHaveBeenCalled();
    expect(PrismaNeonHttp).not.toHaveBeenCalled();
  });

  it("constructs one client on first use and reuses it afterwards", async () => {
    const { db } = await import("@/lib/db");

    expect(db.photo).toBe("photo-delegate");
    expect(PrismaClient).toHaveBeenCalledTimes(1);
    expect(PrismaNeonHttp).toHaveBeenCalledTimes(1);
    expect(PrismaNeonHttp).toHaveBeenCalledWith(CONNECTION_STRING, {});

    expect(db.photo).toBe("photo-delegate");
    expect(PrismaClient).toHaveBeenCalledTimes(1);
    expect(PrismaNeonHttp).toHaveBeenCalledTimes(1);
  });

  it("binds methods reached through the proxy to the underlying client", async () => {
    const { db } = await import("@/lib/db");

    const received = await db.$connect();

    expect(received).toBe(PrismaClient.mock.instances[0]);
    expect(received).not.toBe(db);
  });

  it("throws a clear error when DATABASE_URL is not set", async () => {
    vi.stubEnv("DATABASE_URL", undefined);
    const { db } = await import("@/lib/db");

    expect(() => db.photo).toThrow("DATABASE_URL is not set");
    expect(PrismaClient).not.toHaveBeenCalled();
  });
});
