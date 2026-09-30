"use client";

import Link from "next/link";
import { PolarisMarkIcon } from "@/components/PolarisMark";
import { BOOKING_SUBJECT, SPORTS_GENRES, SPORTS_PATH, sportsGenrePath } from "@/lib/site";

const linkStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: "10px",
  letterSpacing: "0.2em",
  textTransform: "uppercase" as const,
  color: "rgba(212,220,232,0.7)",
  textDecoration: "none",
};

const currentLinkStyle = {
  ...linkStyle,
  color: "#D4DCE8",
};

const quietLinkStyle = {
  ...linkStyle,
  color: "rgba(212,220,232,0.4)",
};

/** Fixed nav bar shared by the sports hub and every genre page. */
export default function SportsNav({ current }: { current?: string }) {
  return (
    <nav
      data-sports-nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1.5rem",
        padding: "1.25rem clamp(1.5rem, 5vw, 4rem)",
        background: "rgba(14,24,36,0.85)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderBottom: "0.5px solid rgba(212,220,232,0.07)",
      }}
    >
      <style>{`
        @media (max-width: 640px) {
          [data-sports-nav] { flex-wrap: wrap; row-gap: 0.75rem; }
          [data-sports-nav-links] {
            flex: 1 0 100%;
            flex-wrap: nowrap !important;
            overflow-x: auto;
            white-space: nowrap;
            scrollbar-width: none;
          }
          [data-sports-nav-links]::-webkit-scrollbar { display: none; }
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", minWidth: 0 }}>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <PolarisMarkIcon size={20} color="#A8C5DA" />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "#D4DCE8",
              lineHeight: 1,
            }}
          >
            Canopus
          </span>
        </Link>

        <Link
          href={SPORTS_PATH}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#B87333",
            whiteSpace: "nowrap",
            textDecoration: "none",
          }}
        >
          Sports &amp; Events
        </Link>
      </div>

      <div
        data-sports-nav-links
        style={{ display: "flex", gap: "1.75rem", alignItems: "center", flexWrap: "wrap" }}
      >
        {SPORTS_GENRES.map((genre) => (
          <Link
            key={genre.slug}
            href={sportsGenrePath(genre.slug)}
            style={genre.slug === current ? currentLinkStyle : linkStyle}
          >
            {genre.title}
          </Link>
        ))}
        <Link href={`/contact?subject=${encodeURIComponent(BOOKING_SUBJECT)}`} style={linkStyle}>
          Contact
        </Link>
        <Link href="/" style={quietLinkStyle}>
          Main site
        </Link>
      </div>
    </nav>
  );
}
