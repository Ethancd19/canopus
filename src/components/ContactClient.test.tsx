// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ContactClient from "@/components/ContactClient";
import { SITE_EMAIL, CREDENTIAL_LINE, BOOKING_SUBJECT } from "@/lib/site";

vi.mock("motion-plus/react", () => ({
  ScrambleText: ({ children }: { children: string }) => <span>{children}</span>,
}));

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  // @ts-expect-error -- jsdom has no IntersectionObserver; SectionLabel only needs the shape above
  window.IntersectionObserver = MockIntersectionObserver;
});

describe("ContactClient", () => {
  it("renders the credential line and a mailto link to the site email", () => {
    render(<ContactClient />);
    expect(screen.getByText(CREDENTIAL_LINE)).toBeInTheDocument();
    const mailLink = screen.getByRole("link", { name: SITE_EMAIL });
    expect(mailLink).toHaveAttribute("href", `mailto:${SITE_EMAIL}`);
  });

  it("preselects the booking subject pill when initialSubject matches it exactly", () => {
    render(<ContactClient initialSubject={BOOKING_SUBJECT} />);
    const pill = screen.getByRole("button", { name: BOOKING_SUBJECT });
    expect(pill.style.color).toBe("rgb(201, 169, 110)");
  });

  it("preselects nothing when initialSubject does not match any pill", () => {
    render(<ContactClient initialSubject="Not a real subject" />);
    const pill = screen.getByRole("button", { name: BOOKING_SUBJECT });
    expect(pill.style.color).toBe("rgba(212, 220, 232, 0.4)");
  });
});
