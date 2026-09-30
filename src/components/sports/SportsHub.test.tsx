// @vitest-environment jsdom
import { it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SportsHub from "@/components/sports/SportsHub";
import type { SportsGenreSummary } from "@/lib/public-queries";
import type { Photo } from "@/types/photo";

vi.mock("motion-plus/react", () => ({ ScrambleText: ({ children }: { children: string }) => <span>{children}</span> }));

const cover: Photo = {
  id: "p1",
  slug: "p1",
  storageKey: "photos/p1.jpg",
  blurDataUrl: null,
  format: "DIGITAL",
  tags: [],
  width: 3,
  height: 2,
  aspectRatio: 1.5,
  location: null,
  caption: "Trackside pass",
} as unknown as Photo;

it("renders a genre's cover photo with alt text derived from the caption, and its description over its blurb", () => {
  const genres: SportsGenreSummary[] = [
    { slug: "sports", title: "Sports", blurb: "Sports blurb", description: "Homecoming coverage", count: 5, cover },
    { slug: "motorsport", title: "Motorsport", blurb: "Motorsport blurb", description: null, count: 0, cover: null },
    { slug: "live", title: "Live", blurb: "Live blurb", description: null, count: 0, cover: null },
  ];

  render(<SportsHub genres={genres} />);

  expect(screen.getByAltText("Trackside pass")).toBeInTheDocument();
  expect(screen.getByText("Homecoming coverage")).toBeInTheDocument();
  expect(screen.getByText("Motorsport blurb")).toBeInTheDocument();
});

it("shows the credential line and booking link", () => {
  const genres: SportsGenreSummary[] = [
    { slug: "sports", title: "Sports", blurb: "Sports blurb", description: null, count: 0, cover: null },
    { slug: "motorsport", title: "Motorsport", blurb: "Motorsport blurb", description: null, count: 0, cover: null },
    { slug: "live", title: "Live", blurb: "Live blurb", description: null, count: 0, cover: null },
  ];

  render(<SportsHub genres={genres} />);

  expect(screen.getAllByRole("link", { name: /Booking inquiry/ })[0]).toHaveAttribute(
    "href",
    "/contact?subject=Sports%20%2F%20events%20booking",
  );
  expect(screen.getByRole("heading", { name: "Availability" })).toBeInTheDocument();
});
