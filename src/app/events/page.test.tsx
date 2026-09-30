// @vitest-environment jsdom
import { it, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SportsPage from "@/app/events/page";
import { getSportsGenres, type SportsGenreSummary } from "@/lib/public-queries";

vi.mock("motion-plus/react", () => ({ ScrambleText: ({ children }: { children: string }) => <span>{children}</span> }));

vi.mock("@/lib/public-queries", () => ({
  getSportsGenres: vi.fn(),
}));

const genre = (
  slug: string,
  title: string,
  count: number,
): SportsGenreSummary => ({
  slug,
  title,
  blurb: `${title} blurb`,
  description: null,
  count,
  cover: null,
});

it("renders a card per genre linking to each genre page, whether it has photos or not", async () => {
  vi.mocked(getSportsGenres).mockResolvedValue([
    genre("sports", "Sports", 0),
    genre("motorsport", "Motorsport", 4),
    genre("live", "Live", 0),
  ]);

  const element = await SportsPage();
  render(element);

  for (const slug of ["sports", "motorsport", "live"]) {
    const links = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href") === `/events/${slug}`);
    expect(links.length).toBeGreaterThan(0);
  }
});

it("shows 'Coming soon' for empty genres and the photo count for genres with photos", async () => {
  vi.mocked(getSportsGenres).mockResolvedValue([
    genre("sports", "Sports", 0),
    genre("motorsport", "Motorsport", 4),
    genre("live", "Live", 0),
  ]);

  const element = await SportsPage();
  render(element);

  expect(screen.getAllByText("Coming soon").length).toBeGreaterThan(0);
  expect(screen.getByText("4 photos")).toBeInTheDocument();
});

it("shows the all-empty archive line only when every genre has no photos", async () => {
  vi.mocked(getSportsGenres).mockResolvedValue([
    genre("sports", "Sports", 0),
    genre("motorsport", "Motorsport", 0),
    genre("live", "Live", 0),
  ]);
  let element = await SportsPage();
  render(element);
  expect(screen.getByRole("link", { name: /see the archive/i })).toHaveAttribute("href", "/work");

  cleanup();

  vi.mocked(getSportsGenres).mockResolvedValue([
    genre("sports", "Sports", 2),
    genre("motorsport", "Motorsport", 0),
    genre("live", "Live", 0),
  ]);
  element = await SportsPage();
  render(element);
  expect(screen.queryByRole("link", { name: /see the archive/i })).toBeNull();
});
