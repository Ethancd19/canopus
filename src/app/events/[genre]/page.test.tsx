// @vitest-environment jsdom
import { it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SportsGenrePage, { generateStaticParams, generateMetadata } from "@/app/events/[genre]/page";
import { getPublishedCollection, getSportsGenres, type SportsGenreSummary } from "@/lib/public-queries";
import type { Photo } from "@/types/photo";

vi.mock("motion-plus/react", () => ({ ScrambleText: ({ children }: { children: string }) => <span>{children}</span> }));

vi.mock("@/lib/public-queries", () => ({
  getPublishedCollection: vi.fn(),
  getSportsGenres: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const photo = (id: string): Photo =>
  ({
    id,
    slug: id,
    storageKey: `photos/${id}.jpg`,
    blurDataUrl: null,
    format: "DIGITAL",
    tags: [],
    width: 3,
    height: 2,
    aspectRatio: 1.5,
    location: null,
    caption: null,
  }) as unknown as Photo;

const genre = (slug: string, title: string, count: number): SportsGenreSummary => ({
  slug,
  title,
  blurb: `${title} blurb`,
  description: null,
  count,
  cover: null,
});

const allGenres: SportsGenreSummary[] = [
  genre("sports", "Sports", 0),
  genre("motorsport", "Motorsport", 0),
  genre("live", "Live", 0),
];

it("calls notFound() for a slug that isn't a configured genre", async () => {
  vi.mocked(getSportsGenres).mockResolvedValue(allGenres);
  await expect(
    SportsGenrePage({ params: Promise.resolve({ genre: "unconfigured" }) }),
  ).rejects.toThrow("NEXT_NOT_FOUND");
});

it("renders the genre heading and gallery tiles when the collection has photos", async () => {
  vi.mocked(getPublishedCollection).mockResolvedValue({
    id: "c1",
    slug: "sports",
    title: "Sports",
    description: "Game day coverage",
    photos: [photo("p1"), photo("p2")],
  });
  vi.mocked(getSportsGenres).mockResolvedValue(allGenres);

  const element = await SportsGenrePage({ params: Promise.resolve({ genre: "sports" }) });
  render(element);

  expect(screen.getByRole("heading", { name: "Sports" })).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(2);
});

it("renders the empty state and only the other genres with work when the collection is null", async () => {
  vi.mocked(getPublishedCollection).mockResolvedValue(null);
  vi.mocked(getSportsGenres).mockResolvedValue([
    genre("sports", "Sports", 0),
    genre("motorsport", "Motorsport", 3),
    genre("live", "Live", 0),
  ]);

  const element = await SportsGenrePage({ params: Promise.resolve({ genre: "sports" }) });
  render(element);

  expect(screen.getByText("Nothing here right now.")).toBeInTheDocument();
  expect(
    screen.getAllByRole("link").filter((link) => link.getAttribute("href") === "/events/motorsport").length,
  ).toBeGreaterThan(0);
  expect(
    screen.getAllByRole("link").filter((link) => link.getAttribute("href") === "/events/live").length,
  ).toBe(1); // only the nav link, no card for a genre with no work
});

it("generates static params for the three configured genres", async () => {
  expect(await generateStaticParams()).toEqual([
    { genre: "sports" },
    { genre: "motorsport" },
    { genre: "live" },
  ]);
});

it("generates metadata using the genre title", async () => {
  vi.mocked(getPublishedCollection).mockResolvedValue(null);
  const metadata = await generateMetadata({ params: Promise.resolve({ genre: "motorsport" }) });
  expect(metadata.title).toBe("Motorsport · Sports & Events · Canopus");
});
