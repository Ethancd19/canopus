import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
const { getEnv, storeImage } = vi.hoisted(() => ({ getEnv: vi.fn(), storeImage: vi.fn() }));
vi.mock("@/lib/cloudflare", () => ({ getEnv }));
vi.mock("@/lib/storage", async (orig) => ({ ...(await orig<typeof import("@/lib/storage")>()), storeImage }));

const { findFirst, findUnique, create } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: { photo: { findFirst, findUnique, create } } }));

import { auth } from "@/lib/auth";
import { POST } from "./route";

const mockedAuth = vi.mocked(auth);

const bucketDelete = vi.fn();

function upload(fields: Record<string, string | Blob | File> = {}) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.append(key, value);
  return new Request("http://localhost/api/admin/uploads", { method: "POST", body: fd });
}

function file(name = "dunes.jpg", type = "image/jpeg", contents = "x") {
  return new File([contents], name, { type });
}

describe("POST /api/admin/uploads", () => {
  beforeEach(() => {
    mockedAuth.mockReset();
    getEnv.mockReset();
    storeImage.mockReset();
    findFirst.mockReset();
    findUnique.mockReset();
    create.mockReset();
    bucketDelete.mockReset();
    getEnv.mockReturnValue({ PHOTOS: { delete: bucketDelete } });
    mockedAuth.mockResolvedValue({ user: { name: "E" } } as never);
    findFirst.mockResolvedValue(null);
    findUnique.mockResolvedValue(null);
    storeImage.mockResolvedValue({
      storageKey: "photos/k.jpg",
      width: 10,
      height: 5,
      mimeType: "image/jpeg",
      sizeBytes: 1,
      blurDataUrl: "data:x",
    });
  });

  it("rejects unauthenticated requests", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await POST(upload({ file: file() }));
    expect(res.status).toBe(401);
    expect(storeImage).not.toHaveBeenCalled();
  });

  it("rejects a request whose content-length exceeds the limit before parsing the body", async () => {
    const res = await POST(
      new Request("http://localhost/api/admin/uploads", {
        method: "POST",
        headers: { "content-length": String(30 * 1024 * 1024) },
        body: "",
      }),
    );
    expect(res.status).toBe(413);
    expect(storeImage).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a missing file", async () => {
    const res = await POST(upload());
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects unsupported types", async () => {
    const res = await POST(upload({ file: file("a.gif", "image/gif") }));
    expect(res.status).toBe(415);
    expect(storeImage).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 409 when a photo with the same originalFilename and sizeBytes already exists", async () => {
    findFirst.mockResolvedValue({ id: "p1", title: "Dunes" });
    const res = await POST(upload({ file: file("dunes.jpg") }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, error: "already uploaded as Dunes", existingId: "p1" });
    expect(storeImage).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("bypasses the duplicate check when force=1", async () => {
    // Would be reported as a duplicate by the "originalFilename"+"sizeBytes" lookup;
    // force=1 must skip that lookup entirely so it never even calls it.
    findFirst.mockResolvedValue({ id: "p1", title: "Dunes" });
    create.mockResolvedValue({ id: "p2", title: "Dunes" });
    const res = await POST(upload({ file: file("dunes.jpg"), force: "1" }));
    expect(res.status).toBe(200);
    expect(findFirst).not.toHaveBeenCalled();
    expect(storeImage).toHaveBeenCalled();
    expect(create).toHaveBeenCalled();
  });

  it("creates a draft row with a generated slug after storing the image", async () => {
    create.mockResolvedValue({ id: "p1", title: "dunes at dusk", slug: "dunes-at-dusk", published: false });
    const res = await POST(upload({ file: file("dunes at dusk.jpg") }));
    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "dunes at dusk",
          slug: "dunes-at-dusk",
          storageKey: "photos/k.jpg",
          width: 10,
          height: 5,
          aspectRatio: 2,
          mimeType: "image/jpeg",
          sizeBytes: 1,
          blurDataUrl: "data:x",
          originalFilename: "dunes at dusk.jpg",
          format: "DIGITAL",
          published: false,
          tags: [],
        }),
      }),
    );
    const json = await res.json();
    expect(json).toEqual({ ok: true, photo: { id: "p1", title: "dunes at dusk", slug: "dunes-at-dusk", published: false } });
  });

  it("passes through the optional exif and format text fields", async () => {
    create.mockResolvedValue({ id: "p1" });
    await POST(
      upload({
        file: file("dunes.jpg"),
        camera: "Sony A7IV",
        lens: "24-70mm",
        focalLength: "50mm",
        aperture: "2.8",
        shutterSpeed: "1/250",
        iso: "400",
        takenAt: "2024-05-01T00:00:00.000Z",
        format: "FILM_35MM",
      }),
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          camera: "Sony A7IV",
          lens: "24-70mm",
          focalLength: "50mm",
          aperture: "2.8",
          shutterSpeed: "1/250",
          iso: "400",
          takenAt: "2024-05-01T00:00:00.000Z",
          format: "FILM_35MM",
        }),
      }),
    );
  });

  it("falls back to DIGITAL for an invalid format value", async () => {
    create.mockResolvedValue({ id: "p1" });
    await POST(upload({ file: file("dunes.jpg"), format: "NOT_A_FORMAT" }));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ format: "DIGITAL" }) }),
    );
  });

  it("finds a unique slug when the base slug is taken", async () => {
    findFirst.mockResolvedValue(null); // duplicate check
    findUnique
      .mockResolvedValueOnce({ id: "existing" }) // slug "dunes" taken
      .mockResolvedValueOnce(null); // slug "dunes-2" free
    create.mockResolvedValue({ id: "p1" });
    await POST(upload({ file: file("dunes.jpg") }));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: "dunes-2" }) }),
    );
  });

  it("deletes the stored object when the row create rejects, then rethrows", async () => {
    create.mockRejectedValue(new Error("db down"));
    const res = await POST(upload({ file: file("dunes.jpg") }));
    expect(res.status).toBe(500);
    expect(bucketDelete).toHaveBeenCalledWith("photos/k.jpg");
  });

  it("retries once with a new slug when create hits a unique-slug conflict", async () => {
    create
      .mockRejectedValueOnce({ code: "P2002", meta: { target: ["slug"] } })
      .mockResolvedValueOnce({ id: "p1", slug: "dunes-abcd" });
    const res = await POST(upload({ file: file("dunes.jpg") }));
    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledTimes(2);
    const firstSlug = create.mock.calls[0][0].data.slug;
    const secondSlug = create.mock.calls[1][0].data.slug;
    expect(secondSlug).not.toBe(firstSlug);
    expect(bucketDelete).not.toHaveBeenCalled();
  });

  it("deletes the stored object and returns 500 when the retry also hits a slug conflict", async () => {
    create.mockRejectedValue({ code: "P2002", meta: { target: ["slug"] } });
    const res = await POST(upload({ file: file("dunes.jpg") }));
    expect(res.status).toBe(500);
    expect(create).toHaveBeenCalledTimes(2);
    expect(bucketDelete).toHaveBeenCalledWith("photos/k.jpg");
  });

  it("does not retry (and rethrows) on a non-slug database error", async () => {
    create.mockRejectedValue(new Error("db down"));
    const res = await POST(upload({ file: file("dunes.jpg") }));
    expect(res.status).toBe(500);
    expect(create).toHaveBeenCalledTimes(1);
    expect(bucketDelete).toHaveBeenCalledWith("photos/k.jpg");
  });
});
