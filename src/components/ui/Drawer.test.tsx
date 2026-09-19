// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("wraps Tab from the last focusable element back to the first", () => {
    render(
      <Drawer open onClose={() => {}} title="Edit photo">
        <input aria-label="First" />
        <input aria-label="Last" />
      </Drawer>
    );
    const closeButton = screen.getByRole("button", { name: "Close" });
    const last = screen.getByLabelText("Last");
    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(closeButton);
  });

  it("wraps Shift+Tab from the first focusable element to the last", () => {
    render(
      <Drawer open onClose={() => {}} title="Edit photo">
        <input aria-label="Field" />
      </Drawer>
    );
    const closeButton = screen.getByRole("button", { name: "Close" });
    closeButton.focus();
    fireEvent.keyDown(closeButton, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(screen.getByLabelText("Field"));
  });

  it("restores focus to the previously focused element once the close animation finishes", async () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Open";
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(
      <Drawer open onClose={() => {}} title="Edit photo">
        <input aria-label="Field" />
      </Drawer>
    );
    expect(document.activeElement).not.toBe(trigger);

    rerender(
      <Drawer open={false} onClose={() => {}} title="Edit photo">
        <input aria-label="Field" />
      </Drawer>
    );

    await waitFor(() => expect(document.activeElement).toBe(trigger), { timeout: 2000 });
    document.body.removeChild(trigger);
  });
});
