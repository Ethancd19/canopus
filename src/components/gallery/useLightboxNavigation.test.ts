// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLightboxNavigation } from "@/components/gallery/useLightboxNavigation";

function setup(index = 1, count = 3) {
  const onNavigate = vi.fn();
  const onClose = vi.fn();
  const hook = renderHook(() => useLightboxNavigation({ count, index, onNavigate, onClose }));
  return { hook, onNavigate, onClose };
}

describe("useLightboxNavigation", () => {
  it("ArrowRight/ArrowLeft move with wrap-around, Escape closes", () => {
    const { onNavigate, onClose } = setup(2, 3);
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" })); });
    expect(onNavigate).toHaveBeenLastCalledWith(0);
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" })); });
    expect(onNavigate).toHaveBeenLastCalledWith(1);
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); });
    expect(onClose).toHaveBeenCalled();
  });
  it("a horizontal drag beyond the threshold navigates; a short one does not", () => {
    const { hook, onNavigate } = setup(0, 2);
    act(() => hook.result.current.onPointerDown({ clientX: 200, clientY: 10 } as React.PointerEvent));
    act(() => hook.result.current.onPointerUp({ clientX: 100, clientY: 12 } as React.PointerEvent));
    expect(onNavigate).toHaveBeenLastCalledWith(1);
    act(() => hook.result.current.onPointerDown({ clientX: 100, clientY: 10 } as React.PointerEvent));
    act(() => hook.result.current.onPointerUp({ clientX: 130, clientY: 10 } as React.PointerEvent));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
  it("does nothing with a single photo", () => {
    const { hook, onNavigate } = setup(0, 1);
    act(() => hook.result.current.next());
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
