// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listPhotosMock = vi.fn();
const patchPhotoMock = vi.fn();
const deletePhotoMock = vi.fn();
const bulkPhotosMock = vi.fn();
const listCollectionsMock = vi.fn();
vi.mock("@/lib/admin-api", () => ({
  listPhotos: (...args: unknown[]) => listPhotosMock(...args),
  patchPhoto: (...args: unknown[]) => patchPhotoMock(...args),
  deletePhoto: (...args: unknown[]) => deletePhotoMock(...args),
  bulkPhotos: (...args: unknown[]) => bulkPhotosMock(...args),
  listCollections: (...args: unknown[]) => listCollectionsMock(...args),
}));

import { Library } from "@/components/admin/Library";

function makePhoto(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    title: "Dunes at dawn",
    slug: "dunes-at-dawn",
    storageKey: "photos/a.jpg",
    blurDataUrl: null,
    published: false,
    featured: false,
    format: "DIGITAL",
    tags: [] as string[],
    location: null,
    caption: null,
    ...overrides,
  };
}

beforeEach(() => {
  listPhotosMock.mockReset();
  patchPhotoMock.mockReset();
  deletePhotoMock.mockReset();
  bulkPhotosMock.mockReset();
  listCollectionsMock.mockReset();
  listCollectionsMock.mockResolvedValue({ ok: true, collections: [] });
  window.localStorage.clear();
});

describe("Library bulk actions", () => {
  it("shows a success message in the bulk bar after a successful bulk publish", async () => {
    const photos = [
      makePhoto({ id: "a", title: "Dunes at dawn" }),
      makePhoto({ id: "b", title: "Harbor lights" }),
    ];
    listPhotosMock.mockResolvedValue({ ok: true, photos });
    bulkPhotosMock.mockResolvedValue({ ok: true, count: 2 });

    render(<Library />);
    await waitFor(() => expect(screen.getByText("Dunes at dawn")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Select Dunes at dawn"));
    fireEvent.click(screen.getByLabelText("Select Harbor lights"));
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    await screen.findByText("Published 2 photos");
    // The selection is cleared once the action succeeds, but the message
    // survives - the bar should collapse to message-only mode.
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("shows an error message without clearing the selection when a bulk action fails", async () => {
    const photos = [makePhoto({ id: "a", title: "Dunes at dawn" })];
    listPhotosMock.mockResolvedValue({ ok: true, photos });
    bulkPhotosMock.mockResolvedValue({ ok: false, error: "server exploded" });

    render(<Library />);
    await waitFor(() => expect(screen.getByText("Dunes at dawn")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Select Dunes at dawn"));
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    await screen.findByText("Couldn't publish: server exploded");
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });
});
