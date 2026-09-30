// @vitest-environment jsdom
import { it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CollectionStrip } from "@/components/CollectionStrip";

const cover = { id: "p", title: "Dunes", storageKey: "photos/p.jpg", blurDataUrl: null, width: 3000, height: 2000, aspectRatio: 1.5, format: "DIGITAL", tags: [] };

it("renders a link per collection with title, count, and the cover at its own aspect ratio", () => {
  render(<CollectionStrip collections={[
    { id: "c1", slug: "coast", title: "Coast", description: null, count: 12, cover: cover as never },
    { id: "c2", slug: "empty", title: "Empty", description: null, count: 0, cover: null },
  ]} />);
  const link = screen.getByRole("link", { name: /Coast/ });
  expect(link).toHaveAttribute("href", "/work/coast");
  expect(screen.getByText("12 photos")).toBeInTheDocument();
  expect(screen.getByAltText("Digital photograph by Ethan Duval")).toHaveAttribute("width", "3000");
  expect(screen.getByAltText("Digital photograph by Ethan Duval")).toHaveAttribute("sizes", "330px");
  expect(screen.queryByText("Dunes")).not.toBeInTheDocument();
  expect(screen.getByText("Empty")).toBeInTheDocument();
});

it("renders nothing when there are no collections", () => {
  const { container } = render(<CollectionStrip collections={[]} />);
  expect(container).toBeEmptyDOMElement();
});
