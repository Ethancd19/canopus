// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const compressMock = vi.fn(async (file: File) => file);
vi.mock("browser-image-compression", () => ({
  default: (file: File) => compressMock(file),
}));

const exifParseMock = vi.fn(async () => ({}));
vi.mock("exifr", () => ({
  default: { parse: () => exifParseMock() },
}));

const uploadPhotoMock = vi.fn();
const patchPhotoMock = vi.fn();
const deletePhotoMock = vi.fn();
const tagPhotoMock = vi.fn();
vi.mock("@/lib/admin-api", () => ({
  uploadPhoto: (...args: unknown[]) => uploadPhotoMock(...args),
  patchPhoto: (...args: unknown[]) => patchPhotoMock(...args),
  deletePhoto: (...args: unknown[]) => deletePhotoMock(...args),
  tagPhoto: (...args: unknown[]) => tagPhotoMock(...args),
  listPhotos: vi.fn(),
}));

import { UploadQueue } from "@/components/admin/UploadQueue";

function makeFile(name: string) {
  return new File(["x"], name, { type: "image/jpeg" });
}

function makePhoto(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    title: "A",
    slug: "a",
    storageKey: "key-a",
    published: false,
    tags: [] as string[],
    caption: null,
    location: null,
    format: "DIGITAL",
    featured: false,
    camera: null,
    lens: null,
    focalLength: null,
    aperture: null,
    shutterSpeed: null,
    iso: null,
    filmStock: null,
    filmFormat: null,
    ...overrides,
  };
}

async function renderWithReadyItem() {
  const photo = makePhoto();
  uploadPhotoMock.mockResolvedValue({ ok: true, photo });
  tagPhotoMock.mockResolvedValue({ ok: true, tags: [], location: "", caption: "" });
  const view = render(<UploadQueue />);
  const input = screen.getByLabelText("Drop photos here, or click to choose files") as HTMLInputElement;
  fireEvent.change(input, { target: { files: [makeFile("a.jpg")] } });
  await waitFor(() => expect(screen.getByLabelText("Title")).toBeInTheDocument());
  return { photo, unmount: view.unmount };
}

beforeEach(() => {
  (globalThis.URL as unknown as { createObjectURL: () => string }).createObjectURL = vi.fn(() => "blob:mock");
  (globalThis.URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = vi.fn();
  uploadPhotoMock.mockReset();
  patchPhotoMock.mockReset();
  deletePhotoMock.mockReset();
  tagPhotoMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("UploadQueue / QueueRow field changes", () => {
  it("sends a featured change immediately, without waiting for the debounce", async () => {
    await renderWithReadyItem();
    patchPhotoMock.mockResolvedValue({ ok: true, photo: makePhoto({ featured: true }) });

    fireEvent.click(screen.getByRole("switch", { name: "Featured on home page" }));

    await waitFor(() => expect(patchPhotoMock).toHaveBeenCalledWith("p1", { featured: true }));
  });

  it("debounces a title change for 500ms before sending it", async () => {
    await renderWithReadyItem();
    patchPhotoMock.mockResolvedValue({ ok: true, photo: makePhoto({ title: "New title" }) });

    vi.useFakeTimers();
    const titleInput = screen.getByLabelText("Title") as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "New title" } });
    fireEvent.blur(titleInput);

    expect(patchPhotoMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(patchPhotoMock).toHaveBeenCalledWith("p1", { title: "New title" });
  });

  it("clears the debounce timer when the row unmounts, so no PATCH fires later", async () => {
    const { unmount } = await renderWithReadyItem();

    vi.useFakeTimers();
    const titleInput = screen.getByLabelText("Title") as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "New title" } });
    fireEvent.blur(titleInput);

    unmount();

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(patchPhotoMock).not.toHaveBeenCalled();
  });
});
