import { describe, expect, it, vi } from "vitest";
import { apiOk, apiError, handleRouteError } from "@/lib/api";

describe("apiOk", () => {
  it("returns 200 JSON with ok:true merged with data", async () => {
    const res = apiOk({ photo: { id: "1" } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, photo: { id: "1" } });
  });

  it("accepts a custom status", async () => {
    const res = apiOk({}, { status: 201 });
    expect(res.status).toBe(201);
  });
});

describe("apiError", () => {
  it("returns the status and ok:false with the message", async () => {
    const res = apiError("nope", 401);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: "nope" });
  });
});

describe("handleRouteError", () => {
  it("logs the error and returns a generic 500 without echoing the message", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = handleRouteError(new Error("boom"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "Something went wrong on the server" });
    expect(spy).toHaveBeenCalledWith("[api] route error:", expect.any(Error));
  });

  it("does the same for non-Error values, without leaking their content", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = handleRouteError("weird");
    expect(await res.json()).toEqual({ ok: false, error: "Something went wrong on the server" });
    expect(spy).toHaveBeenCalledWith("[api] route error:", "weird");
  });
});
