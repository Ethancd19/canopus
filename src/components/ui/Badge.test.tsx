// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "@/components/ui/Badge";

describe("Badge", () => {
  it("renders its text with uppercase styling", () => {
    render(<Badge tone="draft">Draft</Badge>);
    const el = screen.getByText("Draft");
    expect(el).toBeInTheDocument();
    expect(el.className).toContain("uppercase");
  });

  it("uses copper for the published tone", () => {
    render(<Badge tone="published">Published</Badge>);
    expect(screen.getByText("Published").className).toContain("text-copper");
  });
});
