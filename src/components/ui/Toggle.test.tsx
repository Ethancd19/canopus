// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Toggle } from "@/components/ui/Toggle";

describe("Toggle", () => {
  it("is a switch that reports the next value", () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Featured on home page" />);
    const s = screen.getByRole("switch", { name: "Featured on home page" });
    expect(s).toHaveAttribute("aria-checked", "false");
    fireEvent.click(s);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("defaults to the ice tone when checked", () => {
    render(<Toggle checked onChange={vi.fn()} label="Featured on home page" />);
    const s = screen.getByRole("switch", { name: "Featured on home page" });
    expect(s.className).toContain("bg-ice");
    expect(s.className).not.toContain("bg-copper");
  });

  it("uses the copper tone when checked and tone is set to copper", () => {
    render(<Toggle checked onChange={vi.fn()} label="Published" tone="copper" />);
    const s = screen.getByRole("switch", { name: "Published" });
    expect(s.className).toContain("bg-copper");
    expect(s.className).not.toContain("bg-ice");
  });
});
