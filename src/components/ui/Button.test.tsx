// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders its label and forwards props", () => {
    render(<Button type="submit">Save changes</Button>);
    const b = screen.getByRole("button", { name: "Save changes" });
    expect(b).toHaveAttribute("type", "submit");
    expect(b.className).toContain("bg-copper");
  });

  it("is disabled and marked busy while loading", () => {
    render(<Button loading>Publishing</Button>);
    const b = screen.getByRole("button");
    expect(b).toBeDisabled();
    expect(b).toHaveAttribute("aria-busy", "true");
  });

  it("applies the variant classes", () => {
    render(<Button variant="danger">Delete photo</Button>);
    expect(screen.getByRole("button").className).toContain("text-danger");
  });
});
