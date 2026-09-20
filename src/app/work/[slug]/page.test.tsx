// @vitest-environment jsdom
import { it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CollectionPage, { generateStaticParams } from "@/app/work/[slug]/page";
import { getPublishedCollection, getPublishedCollectionSlugs } from "@/lib/public-queries";

vi.mock("motion-plus/react", () => ({ ScrambleText: ({ children }: { children: string }) => <span>{children}</span> }));

vi.mock("@/lib/public-queries", () => ({
  getPublishedCollection: vi.fn(),
  getPublishedCollectionSlugs: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

it("calls notFound() when the collection does not exist", async () => {
  vi.mocked(getPublishedCollection).mockResolvedValue(null);
  await expect(
    CollectionPage({ params: Promise.resolve({ slug: "missing" }) }),
  ).rejects.toThrow("NEXT_NOT_FOUND");
});

it("renders the collection title when it exists", async () => {
  vi.mocked(getPublishedCollection).mockResolvedValue({
    id: "c1",
    slug: "coast",
    title: "Coast",
    description: null,
    photos: [],
  });

  const element = await CollectionPage({ params: Promise.resolve({ slug: "coast" }) });
  render(element);

  expect(screen.getByRole("heading", { name: "Coast" })).toBeInTheDocument();
});

it("generates static params for every published collection slug", async () => {
  vi.mocked(getPublishedCollectionSlugs).mockResolvedValue(["a", "b"]);
  expect(await generateStaticParams()).toEqual([{ slug: "a" }, { slug: "b" }]);
});
