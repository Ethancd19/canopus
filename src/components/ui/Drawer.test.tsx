// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Drawer } from "@/components/ui/Drawer";

describe("Drawer", () => {
  it("renders title and children when open and closes on Escape", () => {
    const onClose = vi.fn();
    render(<Drawer open onClose={onClose} title="Edit photo"><p>Body</p></Drawer>);
    expect(screen.getByRole("dialog", { name: "Edit photo" })).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("renders nothing when closed", () => {
    render(<Drawer open={false} onClose={() => {}} title="Edit photo"><p>Body</p></Drawer>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not steal focus back to the panel when a parent re-render passes a new onClose", () => {
    const { rerender } = render(
      <Drawer open onClose={() => {}} title="Edit photo">
        <input aria-label="Caption" />
      </Drawer>
    );
    const input = screen.getByLabelText("Caption");
    input.focus();
    expect(document.activeElement).toBe(input);

    rerender(
      <Drawer open onClose={() => {}} title="Edit photo">
        <input aria-label="Caption" />
      </Drawer>
    );

    expect(document.activeElement).toBe(input);
  });
});
