import Link from "next/link";
import { BOOKING_SUBJECT, SITE_EMAIL } from "@/lib/site";

const bookingHref = `/contact?subject=${encodeURIComponent(BOOKING_SUBJECT)}`;

const mailStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: "11px",
  color: "#C9A96E",
  textDecoration: "none",
};

const bookingStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: "10px",
  letterSpacing: "0.2em",
  textTransform: "uppercase" as const,
  color: "rgba(212,220,232,0.6)",
  textDecoration: "none",
};

/** Mailto + booking-inquiry pair shared by the sports hub and genre pages. */
export function ContactLinks() {
  return (
    <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
      <a href={`mailto:${SITE_EMAIL}`} style={mailStyle}>
        {SITE_EMAIL}
      </a>
      <Link href={bookingHref} style={bookingStyle}>
        Booking inquiry →
      </Link>
    </div>
  );
}
