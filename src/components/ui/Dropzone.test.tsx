// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dropzone } from "@/components/ui/Dropzone";

afterEach(() => {
  vi.useRealTimers();
});

describe("Dropzone", () => {
  it("shows a rejection message for 3s when a drop yields zero accepted files", () => {
    vi.useFakeTimers();
    const onFiles = vi.fn();
    render(<Dropzone onFiles={onFiles} accept="image/jpeg,image/png">Drop photos here</Dropzone>);
    const zone = screen.getByText("Drop photos here").closest("label")!;
    const gif = new File(["x"], "b.gif", { type: "image/gif" });

    fireEvent.drop(zone, { dataTransfer: { files: [gif], types: ["Files"] } });

    expect(onFiles).not.toHaveBeenCalled();
    expect(screen.getByText("Only JPEG, PNG, or WebP files are accepted.")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText("Only JPEG, PNG, or WebP files are accepted.")).not.toBeInTheDocument();
  });

  it("tracks drag depth so a dragleave on a child doesn't clear dragOver early", () => {
    render(<Dropzone onFiles={vi.fn()} accept="image/jpeg">Drop photos here</Dropzone>);
    const zone = screen.getByText("Drop photos here").closest("label")!;
    // `hover:border-copper/60` is always present, so check the exact
    // dragOver-only class rather than a loose substring match.
    const isDragOver = () => zone.className.split(/\s+/).includes("border-copper/60");

    fireEvent.dragEnter(zone);
    fireEvent.dragEnter(zone); // e.g. entering a child element inside the zone
    expect(isDragOver()).toBe(true);

    fireEvent.dragLeave(zone); // leaving that child back onto the parent
    expect(isDragOver()).toBe(true);

    fireEvent.dragLeave(zone); // leaving the zone entirely
    expect(isDragOver()).toBe(false);
  });

  it("passes only accepted files from a drop", () => {
    const onFiles = vi.fn();
    render(<Dropzone onFiles={onFiles} accept="image/jpeg,image/png">Drop photos here</Dropzone>);
    const zone = screen.getByText("Drop photos here").closest("label")!;
    const jpg = new File(["x"], "a.jpg", { type: "image/jpeg" });
    const gif = new File(["x"], "b.gif", { type: "image/gif" });
    fireEvent.drop(zone, { dataTransfer: { files: [jpg, gif], types: ["Files"] } });
    expect(onFiles).toHaveBeenCalledWith([jpg]);
  });

  it("passes files chosen with the input", () => {
    const onFiles = vi.fn();
    render(<Dropzone onFiles={onFiles} accept="image/jpeg">Drop photos here</Dropzone>);
    const input = screen.getByLabelText("Drop photos here") as HTMLInputElement;
    const jpg = new File(["x"], "a.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [jpg] } });
    expect(onFiles).toHaveBeenCalledWith([jpg]);
  });

  it("uses a compact row layout when compact is set", () => {
    render(
      <Dropzone onFiles={vi.fn()} accept="image/jpeg" compact>
        Drop more photos
      </Dropzone>,
    );
    const zone = screen.getByText("Drop more photos").closest("label")!;
    expect(zone.className).toContain("flex-row");
    expect(zone.className).toContain("p-4");
    expect(zone.className).not.toContain("flex-col");
    expect(zone.className).not.toContain("p-10");
  });

  it("uses the tall column layout by default", () => {
    render(<Dropzone onFiles={vi.fn()} accept="image/jpeg">Drop photos here</Dropzone>);
    const zone = screen.getByText("Drop photos here").closest("label")!;
    expect(zone.className).toContain("flex-col");
    expect(zone.className).toContain("p-10");
  });
});
