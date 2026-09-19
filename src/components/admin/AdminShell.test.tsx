// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminShell } from "@/components/admin/AdminShell";

const usePathnameMock = vi.fn(() => "/admin/upload");
vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

vi.mock("@/app/admin/actions", () => ({
  signOutAction: vi.fn(),
}));

describe("AdminShell", () => {
  it("renders nav links, marks the active one, and renders children and sign out", () => {
    render(
      <AdminShell>
        <p>child</p>
      </AdminShell>,
    );

    const library = screen.getByRole("link", { name: "Library" });
    const upload = screen.getByRole("link", { name: "Upload" });
    const featured = screen.getByRole("link", { name: "Featured" });
    const collections = screen.getByRole("link", { name: "Collections" });
    expect(library).toBeInTheDocument();
    expect(upload).toBeInTheDocument();
    expect(featured).toBeInTheDocument();
    expect(collections).toBeInTheDocument();
    expect(upload).toHaveAttribute("aria-current", "page");
    expect(library).not.toHaveAttribute("aria-current");

    expect(screen.getByText("child")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});

describe("AdminShell on a nested route", () => {
  it("marks Collections active for a collection detail page, and Library stays inactive", () => {
    usePathnameMock.mockReturnValue("/admin/collections/col1");

    render(
      <AdminShell>
        <p>child</p>
      </AdminShell>,
    );

    expect(screen.getByRole("link", { name: "Collections" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Library" })).not.toHaveAttribute("aria-current");
  });

  it("does not mark Library active for a nested route (exact match only for /admin)", () => {
    usePathnameMock.mockReturnValue("/admin/upload");

    render(
      <AdminShell>
        <p>child</p>
      </AdminShell>,
    );

    expect(screen.getByRole("link", { name: "Library" })).not.toHaveAttribute("aria-current");
  });
});
