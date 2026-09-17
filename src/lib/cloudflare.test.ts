import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCloudflareContext } = vi.hoisted(() => ({ getCloudflareContext: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext }));

import { getEdgeCache, getEnv, getWaitUntil } from "@/lib/cloudflare";

describe("cloudflare helpers", () => {
  beforeEach(() => getCloudflareContext.mockReset());

  it("getEnv returns the bindings from the Cloudflare context", () => {
    const env = { PHOTOS: {}, IMAGES: {} };
    getCloudflareContext.mockReturnValue({ env, ctx: { waitUntil: vi.fn() } });
    expect(getEnv()).toBe(env);
  });

  it("getEnv throws a clear error when a binding is missing", () => {
    getCloudflareContext.mockReturnValue({ env: { PHOTOS: {} }, ctx: {} });
    expect(() => getEnv()).toThrow(/IMAGES/);
  });

  it("getWaitUntil forwards to ctx.waitUntil", () => {
    const waitUntil = vi.fn();
    getCloudflareContext.mockReturnValue({ env: {}, ctx: { waitUntil } });
    const p = Promise.resolve();
    getWaitUntil()(p);
    expect(waitUntil).toHaveBeenCalledWith(p);
  });

  it("getEdgeCache returns null when the Cache API is absent", () => {
    expect(getEdgeCache()).toBeNull();
  });
});
