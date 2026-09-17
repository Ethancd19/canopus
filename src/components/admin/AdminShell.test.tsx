// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminShell } from "@/components/admin/AdminShell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/upload",
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
    expect(library).toBeInTheDocument();
    expect(upload).toBeInTheDocument();
    expect(upload).toHaveAttribute("aria-current", "page");
    expect(library).not.toHaveAttribute("aria-current");

    expect(screen.getByText("child")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});
