// @vitest-environment jsdom
//
// Simulating an actual pointer drag on `Reorder.Item` in jsdom is
// impractical, so this file mocks `useFeaturedOrder` directly to drive
// `FeaturedOrder` with a `dirty: true`/`dirty: false` hook result and assert
// the Save/Reset buttons respond to it. The hook's own `dirty` transition
// after `move()` is covered at the hook level in useFeaturedOrder.test.ts.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const useFeaturedOrderMock = vi.fn();
vi.mock("@/components/admin/useFeaturedOrder", () => ({
  useFeaturedOrder: (...args: unknown[]) => useFeaturedOrderMock(...args),
}));

import { FeaturedOrder } from "@/components/admin/FeaturedOrder";

function makePhoto(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    title: "Dunes at dawn",
    storageKey: "photos/a.jpg",
    blurDataUrl: null,
    ...overrides,
  };
}

function makeHookResult(overrides: Record<string, unknown> = {}) {
  return {
    photos: [makePhoto({ id: "a", title: "First" }), makePhoto({ id: "b", title: "Second" })],
    ids: ["a", "b"],
    loading: false,
    refreshing: false,
    saving: false,
    error: null,
    dirty: false,
    move: vi.fn(),
    save: vi.fn(),
    reset: vi.fn(),
    reload: vi.fn(),
    ...overrides,
  };
}

describe("FeaturedOrder (dirty state via mocked hook)", () => {
  it("enables Save order and Reset once the hook reports dirty: true", () => {
    useFeaturedOrderMock.mockReturnValue(makeHookResult({ ids: ["b", "a"], dirty: true }));

    render(<FeaturedOrder />);

    expect(screen.getByRole("button", { name: "Save order" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Reset" })).toBeEnabled();
  });

  it("keeps Save order and Reset disabled when the hook reports dirty: false", () => {
    useFeaturedOrderMock.mockReturnValue(makeHookResult({ dirty: false }));

    render(<FeaturedOrder />);

    expect(screen.getByRole("button", { name: "Save order" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
  });
});
