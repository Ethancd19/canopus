"use client";

import Link from "next/link";
import { motion } from "motion/react";
import SportsNav from "@/components/sports/SportsNav";
import { SportsFooter } from "@/components/sports/SportsFooter";
import { ContactLinks } from "@/components/sports/ContactLinks";
import { GenreCard } from "@/components/sports/GenreCard";
import { CREDENTIAL_LINE } from "@/lib/site";
import type { SportsGenreSummary } from "@/lib/public-queries";

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

const creditStyle = {
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

const emptyLineStyle = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic" as const,
  fontWeight: 300,
  fontSize: "1.15rem",
  color: "rgba(212,220,232,0.65)",
};

export default function SportsHub({ genres }: { genres: SportsGenreSummary[] }) {
  const allEmpty = genres.every((genre) => genre.count === 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}>
      <SportsNav />

      <section style={{ padding: "7rem clamp(1.5rem, 5vw, 4rem) 0" }}>
        <p style={labelStyle}>Portfolio</p>
        <h1 style={h1Style}>Sports &amp; Events</h1>
        <p style={creditStyle}>{CREDENTIAL_LINE}</p>
        <div style={{ marginBottom: "3rem" }}>
          <ContactLinks />
        </div>
      </section>

      <section style={{ padding: "0 clamp(1.5rem, 5vw, 4rem) clamp(3rem, 6vw, 4rem)" }}>
        <p style={labelStyle}>Choose a genre</p>
        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            overflowX: "auto",
            scrollSnapType: "x proximity",
            paddingBottom: "0.5rem",
            marginBottom: allEmpty ? "1.5rem" : 0,
          }}
        >
          {genres.map((genre) => (
            <GenreCard key={genre.slug} genre={genre} />
          ))}
        </div>

        {allEmpty && (
          <p style={emptyLineStyle}>
            Work is being added to each genre. In the meantime,{" "}
            <Link href="/work" style={{ color: "#C9A96E" }}>
              see the archive
            </Link>
            .
          </p>
        )}
      </section>

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
    </motion.div>
  );
}
