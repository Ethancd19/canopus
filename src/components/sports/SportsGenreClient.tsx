"use client";

import Link from "next/link";
import Gallery from "@/components/gallery/Gallery";
import SportsNav from "@/components/sports/SportsNav";
import { SportsFooter } from "@/components/sports/SportsFooter";
import { ContactLinks } from "@/components/sports/ContactLinks";
import { GenreCard } from "@/components/sports/GenreCard";
import { SPORTS_PATH, type SportsGenre } from "@/lib/site";
import type { SportsGenreSummary } from "@/lib/public-queries";
import type { Photo } from "@/types/photo";

const backLinkStyle = {
  display: "inline-block",
  fontFamily: "var(--font-mono)",
  fontSize: "10px",
  letterSpacing: "0.2em",
  textTransform: "uppercase" as const,
  color: "rgba(212,220,232,0.6)",
  textDecoration: "none",
  marginBottom: "1.5rem",
};

const labelStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: "10px",
  letterSpacing: "0.25em",
  textTransform: "uppercase" as const,
  color: "#B87333",
  opacity: 0.9,
  marginBottom: "0.5rem",
};

const h1Style = {
  fontFamily: "var(--font-serif)",
  fontSize: "clamp(2.5rem, 5vw, 4rem)",
  fontWeight: 300,
  color: "#D4DCE8",
  letterSpacing: "0.05em",
  marginBottom: "1.5rem",
  lineHeight: 1,
};

const descriptionStyle = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic" as const,
  fontWeight: 300,
  fontSize: "1.15rem",
  color: "rgba(212,220,232,0.65)",
  maxWidth: "60ch",
  marginBottom: "1.75rem",
};

const h2Style = {
  fontFamily: "var(--font-serif)",
  fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)",
  fontWeight: 300,
  color: "#D4DCE8",
  letterSpacing: "0.03em",
  marginBottom: "1rem",
  lineHeight: 1.1,
};

const emptyHeadlineStyle = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic" as const,
  fontWeight: 300,
  fontSize: "1.15rem",
  color: "rgba(212,220,232,0.65)",
  marginBottom: "1.5rem",
};

const emptyLineStyle = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic" as const,
  fontWeight: 300,
  fontSize: "1.15rem",
  color: "rgba(212,220,232,0.65)",
};

export default function SportsGenreClient({
  genre,
  description,
  photos,
  others,
}: {
  genre: SportsGenre;
  description: string | null;
  photos: Photo[];
  others: SportsGenreSummary[];
}) {
  const hasPhotos = photos.length > 0;
  const othersWithWork = others.filter((other) => other.count > 0);

  return (
    <>
      <SportsNav current={genre.slug} />

      <section style={{ padding: "7rem clamp(1.5rem, 5vw, 4rem) 0" }}>
        <Link href={SPORTS_PATH} style={backLinkStyle}>
          ← Sports &amp; Events
        </Link>
        <p style={labelStyle}>Genre</p>
        <h1 style={h1Style}>{genre.title}</h1>
        <p style={descriptionStyle}>{description ?? genre.blurb}</p>
        <div style={{ marginBottom: hasPhotos ? 0 : "3rem" }}>
          <ContactLinks />
        </div>
      </section>

      {hasPhotos ? (
        <section style={{ padding: "3rem clamp(1.5rem, 5vw, 4rem) 0" }}>
          <Gallery photos={photos} showFilters={false} />
        </section>
      ) : (
        <section style={{ padding: "0 clamp(1.5rem, 5vw, 4rem) clamp(3rem, 6vw, 4rem)" }}>
          <p style={emptyHeadlineStyle}>Nothing here right now.</p>
          {othersWithWork.length > 0 ? (
            <>
              <p style={labelStyle}>Meanwhile, have a look at</p>
              <div
                style={{
                  display: "flex",
                  gap: "1.5rem",
                  overflowX: "auto",
                  scrollSnapType: "x proximity",
                  paddingBottom: "0.5rem",
                }}
              >
                {othersWithWork.map((other) => (
                  <GenreCard key={other.slug} genre={other} />
                ))}
              </div>
            </>
          ) : (
            <p style={emptyLineStyle}>
              Work is being added. In the meantime,{" "}
              <Link href="/work" style={{ color: "#C9A96E" }}>
                see the archive
              </Link>
              .
            </p>
          )}
        </section>
      )}

      <section
        style={{
          borderTop: "0.5px solid rgba(212,220,232,0.07)",
          marginTop: "clamp(4rem, 8vw, 6rem)",
          padding: "clamp(3rem, 6vw, 4rem) clamp(1.5rem, 5vw, 4rem)",
        }}
      >
        <h2 style={{ ...h2Style, marginBottom: "1rem" }}>Availability</h2>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 300,
            fontSize: "1.05rem",
            color: "rgba(212,220,232,0.65)",
            maxWidth: "60ch",
            marginBottom: "1.5rem",
          }}
        >
          Based in the DC area and available to travel for sports, motorsport, concerts and events.
        </p>
        <ContactLinks />
      </section>

      <SportsFooter />
    </>
  );
}
