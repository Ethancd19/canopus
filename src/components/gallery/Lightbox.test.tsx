// @vitest-environment jsdom
import { it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Lightbox } from "@/components/gallery/Lightbox";
import type { Photo } from "@/types/photo";

const photos = [
  { id: "a", title: "Dunes", storageKey: "photos/a.jpg", format: "DIGITAL", tags: [], width: 3, height: 2, aspectRatio: 1.5 },
  { id: "b", title: "Rain", storageKey: "photos/b.jpg", format: "FILM_35MM", tags: [], width: 2, height: 3, aspectRatio: 0.667 },
] as unknown as Photo[];

it("shows the indexed photo, navigates with the next button, and restores focus on close", () => {
  const onNavigate = vi.fn();
  const onClose = vi.fn();
  const opener = document.createElement("button");
  document.body.appendChild(opener);
  const { unmount } = render(<Lightbox photos={photos} index={0} onClose={onClose} onNavigate={onNavigate} returnFocusTo={opener} />);
  expect(screen.getByRole("dialog", { name: "Dunes" })).toBeInTheDocument();
  expect(document.body.style.overflow).toBe("hidden");
  fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
  expect(onNavigate).toHaveBeenCalledWith(1);
  unmount();
  expect(document.body.style.overflow).toBe("");
  expect(document.activeElement).toBe(opener);
});

it("moves focus into the dialog on mount and traps Tab within it", () => {
  const onNavigate = vi.fn();
  const onClose = vi.fn();
  const opener = document.createElement("button");
  document.body.appendChild(opener);
  render(<Lightbox photos={photos} index={0} onClose={onClose} onNavigate={onNavigate} returnFocusTo={opener} />);

  const dialog = screen.getByRole("dialog", { name: "Dunes" });
  expect(document.activeElement).not.toBe(document.body);
  expect(dialog.contains(document.activeElement)).toBe(true);

  const first = screen.getByRole("button", { name: "Previous photo" });
  const last = screen.getByRole("button", { name: "Close ✕" });
  last.focus();
  fireEvent.keyDown(last, { key: "Tab" });
  expect(document.activeElement).toBe(first);

  first.focus();
  fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(last);
});
