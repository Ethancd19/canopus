// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BulkBar } from "@/components/admin/BulkBar";

const collections = [
  { id: "col1", title: "Iceland" },
  { id: "col2", title: "Coast" },
];
const allTags = ["landscape", "aerial"];

describe("BulkBar", () => {
  it("renders nothing when nothing is selected and there's no message", () => {
    const { container } = render(
      <BulkBar
        count={0}
        allTags={allTags}
        collections={collections}
        onAction={vi.fn()}
        onClear={vi.fn()}
        message={null}
        onDismissMessage={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows just the message and a Dismiss button when the selection is empty but a message remains", () => {
    render(
      <BulkBar
        count={0}
        allTags={allTags}
        collections={collections}
        onAction={vi.fn()}
        onClear={vi.fn()}
        message={{ tone: "ok", text: "Published 3 photos" }}
        onDismissMessage={vi.fn()}
      />,
    );

    expect(screen.getByText("Published 3 photos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it("Dismiss calls onDismissMessage", () => {
    const onDismissMessage = vi.fn();
    render(
      <BulkBar
        count={0}
        allTags={allTags}
        collections={collections}
        onAction={vi.fn()}
        onClear={vi.fn()}
        message={{ tone: "error", text: "Couldn't publish: nope" }}
        onDismissMessage={onDismissMessage}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismissMessage).toHaveBeenCalled();
  });

  it("shows the count and every action button", () => {
    render(
      <BulkBar
        count={3}
        allTags={allTags}
        collections={collections}
        onAction={vi.fn()}
        onClear={vi.fn()}
        message={null}
        onDismissMessage={vi.fn()}
      />,
    );

    expect(screen.getByText("3 selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unpublish" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Apply" })).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Delete 3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
    expect(screen.getByLabelText("Tag to add")).toBeInTheDocument();
    expect(screen.getByLabelText("Tag to remove")).toBeInTheDocument();
    expect(screen.getByLabelText("Add to collection")).toBeInTheDocument();
  });

  it("calls onAction with the publish action", async () => {
    const onAction = vi.fn().mockResolvedValue({ ok: true, count: 2 });
    render(
      <BulkBar
        count={2}
        allTags={allTags}
        collections={collections}
        onAction={onAction}
        onClear={vi.fn()}
        message={null}
        onDismissMessage={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(onAction).toHaveBeenCalledWith("publish", undefined);
  });

  it("Add tag: typing a tag and clicking Apply calls onAction with addTag and the tag payload", async () => {
    const onAction = vi.fn().mockResolvedValue({ ok: true, count: 1 });
    render(
      <BulkBar
        count={1}
        allTags={allTags}
        collections={collections}
        onAction={onAction}
        onClear={vi.fn()}
        message={null}
        onDismissMessage={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Tag to add"), { target: { value: "golden hour" } });
    const applyButtons = screen.getAllByRole("button", { name: "Apply" });
    fireEvent.click(applyButtons[0]);

    expect(onAction).toHaveBeenCalledWith("addTag", { tag: "golden hour" });
  });

  it("two-step delete requires a second click to confirm, then calls onAction with delete", async () => {
    const onAction = vi.fn().mockResolvedValue({ ok: true, count: 4 });
    render(
      <BulkBar
        count={4}
        allTags={allTags}
        collections={collections}
        onAction={onAction}
        onClear={vi.fn()}
        message={null}
        onDismissMessage={vi.fn()}
      />,
    );

    const deleteButton = screen.getByRole("button", { name: "Delete 4" });
    fireEvent.click(deleteButton);
    expect(onAction).not.toHaveBeenCalled();

    const confirmButton = await screen.findByRole("button", { name: "Confirm delete 4" });
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    fireEvent.click(confirmButton);

    expect(onAction).toHaveBeenCalledWith("delete", undefined);
  });

  it("Cancel backs out of the delete confirm without calling onAction", () => {
    const onAction = vi.fn();
    render(
      <BulkBar
        count={4}
        allTags={allTags}
        collections={collections}
        onAction={onAction}
        onClear={vi.fn()}
        message={null}
        onDismissMessage={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete 4" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Delete 4" })).toBeInTheDocument();
  });

  it("clicking another control while confirming delete cancels the confirm", () => {
    const onAction = vi.fn().mockResolvedValue({ ok: true, count: 4 });
    render(
      <BulkBar
        count={4}
        allTags={allTags}
        collections={collections}
        onAction={onAction}
        onClear={vi.fn()}
        message={null}
        onDismissMessage={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete 4" }));
    expect(screen.getByRole("button", { name: "Confirm delete 4" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    expect(screen.queryByRole("button", { name: "Confirm delete 4" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete 4" })).toBeInTheDocument();
  });

  it("disables Clear while a bulk action is in flight, and re-enables it once it settles", async () => {
    let resolveAction: (value: { ok: true; count: number }) => void = () => {};
    const onAction = vi.fn(
      () =>
        new Promise<{ ok: true; count: number }>((resolve) => {
          resolveAction = resolve;
        }),
    );
    render(
      <BulkBar
        count={2}
        allTags={allTags}
        collections={collections}
        onAction={onAction}
        onClear={vi.fn()}
        message={null}
        onDismissMessage={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();

    await act(async () => {
      resolveAction({ ok: true, count: 2 });
    });

    expect(screen.getByRole("button", { name: "Clear" })).not.toBeDisabled();
  });

  it("shows an error message and Dismiss when passed one alongside an active selection", () => {
    render(
      <BulkBar
        count={1}
        allTags={allTags}
        collections={collections}
        onAction={vi.fn()}
        onClear={vi.fn()}
        message={{ tone: "error", text: "Couldn't publish: server exploded" }}
        onDismissMessage={vi.fn()}
      />,
    );

    expect(screen.getByText("Couldn't publish: server exploded")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("Clear calls onClear", () => {
    const onClear = vi.fn();
    render(
      <BulkBar
        count={1}
        allTags={allTags}
        collections={collections}
        onAction={vi.fn()}
        onClear={onClear}
        message={null}
        onDismissMessage={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onClear).toHaveBeenCalled();
  });
});
