import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin-fetch", () => ({ adminFetch: vi.fn() }));

import { adminFetch } from "@/lib/admin-fetch";
import { deletePhoto, listPhotos, patchPhoto, tagPhoto, uploadPhoto } from "@/lib/admin-api";

const mockedFetch = vi.mocked(adminFetch);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("admin-api", () => {
  it("uploadPhoto posts a multipart form with the file and text fields", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ ok: true, photo: { id: "1" } }));
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });

    const result = await uploadPhoto(file, { camera: "Leica", force: "1" });

    expect(result).toEqual({ ok: true, photo: { id: "1" } });
    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("/api/admin/uploads");
    expect(init?.method).toBe("POST");
    const form = init?.body as FormData;
    expect(form.get("file")).toBeInstanceOf(File);
    expect(form.get("camera")).toBe("Leica");
    expect(form.get("force")).toBe("1");
  });

  it("uploadPhoto surfaces a 409 duplicate body", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ ok: false, error: "already uploaded as A", existingId: "abc" }, 409));
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });

    const result = await uploadPhoto(file);

    expect(result).toEqual({ ok: false, error: "already uploaded as A", existingId: "abc" });
  });

  it("patchPhoto sends a JSON PATCH to the photo id", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ ok: true, photo: { id: "1", published: true } }));

    const result = await patchPhoto("1", { published: true });

    expect(result).toEqual({ ok: true, photo: { id: "1", published: true } });
    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("/api/admin/photo/1");
    expect(init?.method).toBe("PATCH");
    expect(init?.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(JSON.parse(init?.body as string)).toEqual({ published: true });
  });

  it("deletePhoto sends a DELETE to the photo id", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ ok: true }));

    const result = await deletePhoto("1");

    expect(result).toEqual({ ok: true });
    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("/api/admin/photo/1");
    expect(init?.method).toBe("DELETE");
  });

  it("tagPhoto posts the storage key", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ ok: true, tags: ["landscape"], location: "", caption: "" }));

    const result = await tagPhoto("key-1");

    expect(result).toEqual({ ok: true, tags: ["landscape"], location: "", caption: "" });
    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("/api/admin/tags");
    expect(JSON.parse(init?.body as string)).toEqual({ storageKey: "key-1" });
  });

  it("listPhotos fetches the photo list", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ ok: true, photos: [] }));

    const result = await listPhotos();

    expect(result).toEqual({ ok: true, photos: [] });
    expect(mockedFetch).toHaveBeenCalledWith("/api/admin/photos");
  });
});
