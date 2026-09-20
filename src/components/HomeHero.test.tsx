// @vitest-environment jsdom
import { it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HomeHero } from "@/components/HomeHero";

it("renders a picture with avif/webp sources and a 1920 jpg fallback img", () => {
  render(<HomeHero visible={true} />);
  const img = screen.getByAltText("");
  expect(img).toHaveAttribute("src", "/hero/intro-1920.jpg");
  expect(img).toHaveAttribute("sizes", "100vw");

  const sources = document.querySelectorAll("picture source");
  expect(sources).toHaveLength(2);
  const types = Array.from(sources).map((s) => s.getAttribute("type"));
  expect(types).toContain("image/avif");
  expect(types).toContain("image/webp");
});
