// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listPhotosMock = vi.fn();
const orderPhotosMock = vi.fn();
vi.mock("@/lib/admin-api", () => ({
  listPhotos: (...args: unknown[]) => listPhotosMock(...args),
  orderPhotos: (...args: unknown[]) => orderPhotosMock(...args),
}));

import { FeaturedOrder } from "@/components/admin/FeaturedOrder";

function makePhoto(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    title: "Dunes at dawn",
    slug: "dunes-at-dawn",
    storageKey: "photos/a.jpg",
    blurDataUrl: null,
    published: true,
    featured: true,
    order: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    format: "DIGITAL",
    tags: [] as string[],
    location: null,
    caption: null,
    ...overrides,
  };
}

beforeEach(() => {
  listPhotosMock.mockReset();
  orderPhotosMock.mockReset();
});

describe("FeaturedOrder", () => {
  it("renders rows in order with Save disabled when clean", async () => {
    const photos = [
      makePhoto({ id: "a", title: "First", order: 0 }),
      makePhoto({ id: "b", title: "Second", order: 1 }),
      makePhoto({ id: "c", title: "Third", order: 2 }),
    ];
    listPhotosMock.mockResolvedValue({ ok: true, photos });

    render(<FeaturedOrder />);

    await waitFor(() => expect(screen.getByText("First")).toBeInTheDocument());

    const titles = screen.getAllByText(/First|Second|Third/).map((el) => el.textContent);
    expect(titles).toEqual(["First", "Second", "Third"]);

    expect(screen.getByRole("button", { name: "Save order" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
  });

  it("shows the empty state when there are no featured photos", async () => {
    listPhotosMock.mockResolvedValue({ ok: true, photos: [] });

    render(<FeaturedOrder />);

    await waitFor(() =>
      expect(
        screen.getByText("No featured photos yet. Mark photos as featured in the library."),
      ).toBeInTheDocument(),
    );
  });

  it("surfaces the load error", async () => {
    listPhotosMock.mockResolvedValue({ ok: false, error: "network blip" });

    render(<FeaturedOrder />);

    await waitFor(() => expect(screen.getByText("network blip")).toBeInTheDocument());
  });
});
