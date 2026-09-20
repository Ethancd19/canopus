// @vitest-environment jsdom
import { it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Gallery from "@/components/gallery/Gallery";
import type { Photo } from "@/types/photo";

vi.mock("motion-plus/react", () => ({ ScrambleText: ({ children }: { children: string }) => <span>{children}</span> }));

const photos = [
  { id: "a", title: "Dunes", slug: "dunes", storageKey: "photos/a.jpg", blurDataUrl: null, format: "DIGITAL", tags: ["landscape"], width: 3, height: 2, aspectRatio: 1.5 },
  { id: "b", title: "Rain", slug: "rain", storageKey: "photos/b.jpg", blurDataUrl: null, format: "FILM_35MM", tags: ["street"], width: 2, height: 3, aspectRatio: 0.667 },
] as unknown as Photo[];

const eightPhotos = Array.from({ length: 8 }, (_, i) => ({
  id: `p${i}`,
  title: `Photo ${i}`,
  slug: `photo-${i}`,
  storageKey: `photos/p${i}.jpg`,
  blurDataUrl: null,
  format: "DIGITAL",
  tags: ["landscape"],
  width: 3,
  height: 2,
  aspectRatio: i % 2 === 0 ? 1.5 : 0.667,
})) as unknown as Photo[];

afterEach(() => {
  // @ts-expect-error -- restore jsdom's default (no matchMedia) between tests
  delete window.matchMedia;
});

it("renders a tile per photo with a snapped /img src and opens the lightbox on Enter", () => {
  render(<Gallery photos={photos} />);
  const tiles = screen.getAllByRole("button", { name: /^Open / });
  expect(tiles).toHaveLength(2);
  expect(screen.getByAltText("Dunes").getAttribute("src")).toMatch(/^\/img\/photos\/a\.jpg\?w=\d+$/);
  fireEvent.keyDown(tiles[1], { key: "Enter" });
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Rain" })).toBeInTheDocument();
});

it("hides the filter bar when showFilters is false", () => {
  render(<Gallery photos={photos} showFilters={false} />);
  expect(screen.queryByRole("button", { name: "Digital" })).toBeNull();
});

it("crossfades to the empty state and back when a genre filter matches nothing then everything", async () => {
  render(<Gallery photos={photos} />);
  expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(2);

  fireEvent.click(screen.getByRole("button", { name: "Astro" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: /^Open / })).toBeNull());
  expect(screen.getByText("Check back soon")).toBeInTheDocument();

  fireEvent.click(screen.getAllByRole("button", { name: "All" })[1]);
  await waitFor(() => expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(2));
  expect(screen.queryByText("Check back soon")).toBeNull();
});

it("distributes photos across 4 masonry columns on wide screens", () => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === "(min-width: 1600px)",
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

  const { container } = render(<Gallery photos={eightPhotos} />);
  const cards = container.querySelectorAll("[data-photo-card]");
  expect(cards).toHaveLength(8);

  const columns = new Set(Array.from(cards).map((card) => card.parentElement));
  expect(columns.size).toBe(4);
});
