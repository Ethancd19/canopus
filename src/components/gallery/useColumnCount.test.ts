// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useColumnCount } from "@/components/gallery/useColumnCount";

type Listener = (event: MediaQueryListEvent) => void;

function stubMatchMedia(matchingQueries: string[]) {
  const listenersByQuery = new Map<string, Set<Listener>>();
  const addEventListener = vi.fn((query: string, type: string, listener: Listener) => {
    if (type !== "change") return;
    if (!listenersByQuery.has(query)) listenersByQuery.set(query, new Set());
    listenersByQuery.get(query)!.add(listener);
  });
  const removeEventListener = vi.fn((query: string, type: string, listener: Listener) => {
    if (type !== "change") return;
    listenersByQuery.get(query)?.delete(listener);
  });

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: matchingQueries.includes(query),
    media: query,
    addEventListener: (type: string, listener: Listener) => addEventListener(query, type, listener),
    removeEventListener: (type: string, listener: Listener) => removeEventListener(query, type, listener),
  }));

  return { addEventListener, removeEventListener, listenersByQuery };
}

describe("useColumnCount", () => {
  afterEach(() => {
    // @ts-expect-error -- restore jsdom's default (no matchMedia) between tests
    delete window.matchMedia;
    vi.restoreAllMocks();
  });

  it("returns 4 when the wide query matches", () => {
    stubMatchMedia(["(min-width: 1600px)"]);
    const { result } = renderHook(() => useColumnCount());
    expect(result.current).toBe(4);
  });

  it("returns 1 when the phone query matches", () => {
    stubMatchMedia(["(max-width: 640px)", "(max-width: 1024px)"]);
    const { result } = renderHook(() => useColumnCount());
    expect(result.current).toBe(1);
  });

  it("returns 3 (desktop) when no query matches", () => {
    stubMatchMedia([]);
    const { result } = renderHook(() => useColumnCount());
    expect(result.current).toBe(3);
  });

  it("removes all three change listeners on unmount", () => {
    const { addEventListener, removeEventListener } = stubMatchMedia([]);
    const { unmount } = renderHook(() => useColumnCount());
    expect(addEventListener).toHaveBeenCalledTimes(3);
    unmount();
    expect(removeEventListener).toHaveBeenCalledTimes(3);
  });
});
