// @vitest-environment jsdom
import { it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SportsGenreClient from "@/components/sports/SportsGenreClient";
import { getSportsGenre } from "@/lib/site";
import type { SportsGenreSummary } from "@/lib/public-queries";
import type { Photo } from "@/types/photo";

vi.mock("motion-plus/react", () => ({ ScrambleText: ({ children }: { children: string }) => <span>{children}</span> }));

const genre = getSportsGenre("sports")!;

it("falls back to the genre's blurb when the collection has no description, and links back to the hub", () => {
  render(<SportsGenreClient genre={genre} description={null} photos={[]} others={[]} />);

  expect(screen.getByText(genre.blurb)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /^← Sports & Events$/ })).toHaveAttribute("href", "/events");
});

it("prefers the collection's description over the genre's blurb", () => {
  render(<SportsGenreClient genre={genre} description="Homecoming coverage" photos={[]} others={[]} />);

  expect(screen.getByText("Homecoming coverage")).toBeInTheDocument();
  expect(screen.queryByText(genre.blurb)).toBeNull();
});

it("shows the archive fallback line when no other genre has work", () => {
  const others: SportsGenreSummary[] = [
    { slug: "motorsport", title: "Motorsport", blurb: "Motorsport blurb", description: null, count: 0, cover: null },
    { slug: "live", title: "Live", blurb: "Live blurb", description: null, count: 0, cover: null },
  ];

  render(<SportsGenreClient genre={genre} description={null} photos={[]} others={others} />);

  expect(screen.getByText("Nothing here right now.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /see the archive/i })).toHaveAttribute("href", "/work");
  expect(screen.queryByText("Meanwhile, have a look at")).toBeNull();
  // Only the nav link to /events/motorsport exists; no card was rendered for it.
  expect(
    screen.getAllByRole("link").filter((link) => link.getAttribute("href") === "/events/motorsport"),
  ).toHaveLength(1);
});

it("renders cards only for other genres that have work", () => {
  const others: SportsGenreSummary[] = [
    { slug: "motorsport", title: "Motorsport", blurb: "Motorsport blurb", description: null, count: 3, cover: null },
    { slug: "live", title: "Live", blurb: "Live blurb", description: null, count: 0, cover: null },
  ];

  render(<SportsGenreClient genre={genre} description={null} photos={[]} others={others} />);

  expect(screen.getByText("Meanwhile, have a look at")).toBeInTheDocument();
  // The nav always links to every genre; a card adds a second link to the same href.
  expect(
    screen.getAllByRole("link").filter((link) => link.getAttribute("href") === "/events/motorsport"),
  ).toHaveLength(2);
  expect(
    screen.getAllByRole("link").filter((link) => link.getAttribute("href") === "/events/live"),
  ).toHaveLength(1);
});

it("renders gallery tiles instead of the empty state when there are photos", () => {
  const photo: Photo = {
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
    caption: null,
  } as unknown as Photo;

  render(<SportsGenreClient genre={genre} description={null} photos={[photo]} others={[]} />);

  expect(screen.queryByText("Nothing here right now.")).toBeNull();
  expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(1);
});
