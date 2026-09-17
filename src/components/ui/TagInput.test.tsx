// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TagInput } from "@/components/ui/TagInput";

describe("TagInput", () => {
  it("adds a trimmed lowercase tag on Enter and dedupes", () => {
    const onChange = vi.fn();
    render(<TagInput value={["street"]} onChange={onChange} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "  Golden Hour " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith(["street", "golden hour"]);
    fireEvent.change(input, { target: { value: "street" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith(["street"]);
  });

  it("removes the last tag on Backspace when empty and by clicking a chip's remove", () => {
    const onChange = vi.fn();
    render(<TagInput value={["a", "b"]} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Backspace" });
    expect(onChange).toHaveBeenLastCalledWith(["a"]);
    fireEvent.click(screen.getByRole("button", { name: "Remove a" }));
    expect(onChange).toHaveBeenLastCalledWith(["b"]);
  });

  it("shows matching suggestions and adds on click", () => {
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} suggestions={["landscape", "long exposure", "macro"]} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "l" } });
    expect(screen.getByText("landscape")).toBeInTheDocument();
    expect(screen.queryByText("macro")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("long exposure"));
    expect(onChange).toHaveBeenLastCalledWith(["long exposure"]);
  });
});
