// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listPhotosMock = vi.fn();
vi.mock("@/lib/admin-api", () => ({
  listPhotos: (...args: unknown[]) => listPhotosMock(...args),
}));

import { PhotoPicker } from "@/components/admin/PhotoPicker";

function makePhoto(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: `Photo ${id}`,
    slug: `photo-${id}`,
    storageKey: `photos/${id}.jpg`,
    blurDataUrl: null,
    published: true,
    featured: false,
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
});

describe("PhotoPicker", () => {
  it("renders library photos, excluding current members", async () => {
    listPhotosMock.mockResolvedValue({
      ok: true,
      photos: [makePhoto("p1", { title: "Dunes" }), makePhoto("p2", { title: "Ridge" }), makePhoto("p3", { title: "Coast" })],
    });

    render(<PhotoPicker open onClose={vi.fn()} excludeIds={["p2"]} onAdd={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Dunes")).toBeInTheDocument());
    expect(screen.getByText("Coast")).toBeInTheDocument();
    expect(screen.queryByText("Ridge")).not.toBeInTheDocument();
  });

  it("filters by search text matching title or tags", async () => {
    listPhotosMock.mockResolvedValue({
      ok: true,
      photos: [
        makePhoto("p1", { title: "Dunes at dawn", tags: ["desert"] }),
        makePhoto("p2", { title: "Ridge line", tags: ["mountain"] }),
      ],
    });

    render(<PhotoPicker open onClose={vi.fn()} excludeIds={[]} onAdd={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Dunes at dawn")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Search photos"), { target: { value: "desert" } });

    expect(screen.getByText("Dunes at dawn")).toBeInTheDocument();
    expect(screen.queryByText("Ridge line")).not.toBeInTheDocument();
  });

  it("toggles selection via checkbox and calls onAdd with the selected ids", async () => {
    listPhotosMock.mockResolvedValue({
      ok: true,
      photos: [makePhoto("p1", { title: "Dunes" }), makePhoto("p2", { title: "Ridge" })],
    });
    const onAdd = vi.fn().mockResolvedValue(undefined);

    render(<PhotoPicker open onClose={vi.fn()} excludeIds={[]} onAdd={onAdd} />);
    await waitFor(() => expect(screen.getByText("Dunes")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: "Add 0 photos" })).toBeDisabled();

    fireEvent.click(screen.getByLabelText("Select Dunes"));
    fireEvent.click(screen.getByLabelText("Select Ridge"));

    const addButton = screen.getByRole("button", { name: "Add 2 photos" });
    expect(addButton).not.toBeDisabled();

    fireEvent.click(addButton);

    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    expect(onAdd.mock.calls[0][0].sort()).toEqual(["p1", "p2"]);
  });

  it("shows the error and keeps the selection when onAdd fails", async () => {
    listPhotosMock.mockResolvedValue({ ok: true, photos: [makePhoto("p1", { title: "Dunes" })] });
    const onAdd = vi.fn().mockResolvedValue({ ok: false, error: "Couldn't add photos." });

    render(<PhotoPicker open onClose={vi.fn()} excludeIds={[]} onAdd={onAdd} />);
    await waitFor(() => expect(screen.getByText("Dunes")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Select Dunes"));
    fireEvent.click(screen.getByRole("button", { name: "Add 1 photo" }));

    await waitFor(() => expect(screen.getByText("Couldn't add photos.")).toBeInTheDocument());
    // The selection survives the failure - the checkbox is still checked.
    expect(screen.getByLabelText("Select Dunes")).toBeChecked();
  });

  it("shows singular label when exactly one photo is selected", async () => {
    listPhotosMock.mockResolvedValue({ ok: true, photos: [makePhoto("p1", { title: "Dunes" })] });

    render(<PhotoPicker open onClose={vi.fn()} excludeIds={[]} onAdd={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Dunes")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Select Dunes"));
    expect(screen.getByRole("button", { name: "Add 1 photo" })).toBeInTheDocument();
  });
});
