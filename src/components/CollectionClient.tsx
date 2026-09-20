"use client";

import Link from "next/link";
import { motion } from "motion/react";
import Nav from "@/components/Nav";
import Gallery from "@/components/gallery/Gallery";
import { Footer } from "@/components/Footer";
import type { PublicCollection } from "@/lib/public-queries";

export default function CollectionClient({ collection }: { collection: PublicCollection }) {
  return (
    <div style={{ background: "#0E1824", minHeight: "100vh" }}>
      <Nav visible={true} />

      <section
        style={{
          padding:
            "clamp(6rem, 10vw, 8rem) clamp(1.5rem, 5vw, 4rem) clamp(3rem, 6vw, 5rem)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <Link
            href="/work"
            style={{
              display: "inline-block",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(212,220,232,0.6)",
              textDecoration: "none",
              marginBottom: "1.5rem",
            }}
          >
            ← All work
          </Link>

          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#B87333",
              opacity: 0.9,
              marginBottom: "0.5rem",
            }}
          >
            Collection
          </p>

          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
              fontWeight: 300,
              color: "#D4DCE8",
              letterSpacing: "0.05em",
              marginBottom: "3rem",
              lineHeight: 1,
            }}
          >
            {collection.title}
          </h1>

          {collection.description && (
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "1.15rem",
                fontWeight: 300,
                fontStyle: "italic",
                color: "rgba(212,220,232,0.6)",
                maxWidth: "60ch",
                marginBottom: "3rem",
              }}
            >
              {collection.description}
            </p>
          )}

          <Gallery photos={collection.photos} showFilters={false} />
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
