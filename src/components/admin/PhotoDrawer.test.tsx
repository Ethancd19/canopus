// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhotoDrawer } from "@/components/admin/PhotoDrawer";
import type { Photo } from "@/lib/admin-api";

const okResult = { ok: true as const };

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    id: "p1",
    title: "Original title",
    slug: "original-title",
    storageKey: "photos/a.jpg",
    published: false,
    blurDataUrl: null,
    mimeType: "image/jpeg",
    sizeBytes: 1000,
    originalFilename: "a.jpg",
    format: "DIGITAL",
    tags: [],
    featured: false,
    order: 0,
    width: 100,
    height: 67,
    aspectRatio: 1.5,
    caption: null,
    location: null,
    takenAt: null,
    camera: null,
    lens: null,
    focalLength: null,
    aperture: null,
    shutterSpeed: null,
    iso: null,
    filmStock: null,
    filmFormat: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  } as Photo;
}

describe("PhotoDrawer", () => {
  it("discards edits before closing so reopening the same photo shows the original values", () => {
    const photo = makePhoto();
    const onClose = vi.fn();
    const { rerender } = render(
      <PhotoDrawer
        photo={photo}
        onClose={onClose}
        onSave={vi.fn().mockResolvedValue(okResult)}
        onDelete={vi.fn().mockResolvedValue(okResult)}
        onTogglePublished={vi.fn().mockResolvedValue(okResult)}
      />,
    );

    const titleInput = screen.getByLabelText("Title") as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "Edited title" } });
    fireEvent.blur(titleInput);
    expect(titleInput.value).toBe("Edited title");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByText("Discard unsaved changes?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    // Simulate the parent (Library) responding to onClose by re-rendering
    // with the exact same photo object it already had - the reference never
    // changes, so any fix relying on prop-identity alone would miss this.
    rerender(
      <PhotoDrawer
        photo={photo}
        onClose={onClose}
        onSave={vi.fn().mockResolvedValue(okResult)}
        onDelete={vi.fn().mockResolvedValue(okResult)}
        onTogglePublished={vi.fn().mockResolvedValue(okResult)}
      />,
    );

    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("Original title");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("keeps the edit and shows an error in the footer when onSave fails", async () => {
    const photo = makePhoto();
    const onSave = vi.fn().mockResolvedValue({ ok: false, error: "network blip" });
    render(
      <PhotoDrawer
        photo={photo}
        onClose={vi.fn()}
        onSave={onSave}
        onDelete={vi.fn().mockResolvedValue(okResult)}
        onTogglePublished={vi.fn().mockResolvedValue(okResult)}
      />,
    );

    const titleInput = screen.getByLabelText("Title") as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "Edited title" } });
    fireEvent.blur(titleInput);

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await screen.findByText("Couldn't save changes: network blip");
    expect(titleInput.value).toBe("Edited title");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
  });

  it("returns to the default footer with an error when the delete confirmation fails", async () => {
    const photo = makePhoto();
    const onDelete = vi.fn().mockResolvedValue({ ok: false, error: "locked" });
    render(
      <PhotoDrawer
        photo={photo}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(okResult)}
        onDelete={onDelete}
        onTogglePublished={vi.fn().mockResolvedValue(okResult)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete photo" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    await screen.findByText("Couldn't delete photo: locked");
    expect(screen.getByRole("button", { name: "Delete photo" })).toBeInTheDocument();
  });

  it("shows an error in the footer when the publish toggle fails", async () => {
    const photo = makePhoto({ published: false });
    const onTogglePublished = vi.fn().mockResolvedValue({ ok: false, error: "server hiccup" });
    render(
      <PhotoDrawer
        photo={photo}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(okResult)}
        onDelete={vi.fn().mockResolvedValue(okResult)}
        onTogglePublished={onTogglePublished}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    await screen.findByText("Couldn't publish: server hiccup");
  });

  it("regenerates the slug from the current title", () => {
    const photo = makePhoto({ title: "Original title", slug: "original-title" });
    render(
      <PhotoDrawer
        photo={photo}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(okResult)}
        onDelete={vi.fn().mockResolvedValue(okResult)}
        onTogglePublished={vi.fn().mockResolvedValue(okResult)}
      />,
    );

    const titleInput = screen.getByLabelText("Title") as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "Brand New Title" } });
    fireEvent.blur(titleInput);

    fireEvent.click(screen.getByRole("button", { name: "Regenerate from title" }));

    expect((screen.getByLabelText("Slug") as HTMLInputElement).value).toBe("brand-new-title");
  });

  describe("copy image URL", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("copies the derived image URL and flashes 'Copied' for 1500ms", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });
      const photo = makePhoto({ storageKey: "photos/a.jpg" });
      render(
        <PhotoDrawer
          photo={photo}
          onClose={vi.fn()}
          onSave={vi.fn().mockResolvedValue(okResult)}
          onDelete={vi.fn().mockResolvedValue(okResult)}
          onTogglePublished={vi.fn().mockResolvedValue(okResult)}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Copy image URL" }));
      });

      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/img/photos/a.jpg?w=1920`);
      expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(1500);
      });

      expect(screen.getByRole("button", { name: "Copy image URL" })).toBeInTheDocument();
    });

    it("shows \"Couldn't copy\" when the clipboard write rejects", async () => {
      const writeText = vi.fn().mockRejectedValue(new Error("denied"));
      Object.assign(navigator, { clipboard: { writeText } });
      const photo = makePhoto();
      render(
        <PhotoDrawer
          photo={photo}
          onClose={vi.fn()}
          onSave={vi.fn().mockResolvedValue(okResult)}
          onDelete={vi.fn().mockResolvedValue(okResult)}
          onTogglePublished={vi.fn().mockResolvedValue(okResult)}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Copy image URL" }));
      });

      expect(screen.getByRole("button", { name: "Couldn't copy" })).toBeInTheDocument();
    });
  });

  it("toggles publish on Cmd/Ctrl+Enter anywhere inside the drawer", async () => {
    const photo = makePhoto({ published: false });
    const onTogglePublished = vi.fn().mockResolvedValue(okResult);
    render(
      <PhotoDrawer
        photo={photo}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(okResult)}
        onDelete={vi.fn().mockResolvedValue(okResult)}
        onTogglePublished={onTogglePublished}
      />,
    );

    const titleInput = screen.getByLabelText("Title");
    fireEvent.keyDown(titleInput, { key: "Enter", metaKey: true });

    expect(onTogglePublished).toHaveBeenCalledTimes(1);
  });
});
