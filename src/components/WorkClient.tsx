"use client";

import { motion } from "motion/react";
import Nav from "@/components/Nav";
import Gallery from "@/components/Gallery";
import { Photo } from "@/types/photo";

export default function WorkClient({ photos }: { photos: Photo[] }) {
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
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#B87333",
              marginBottom: "0.5rem",
            }}
          >
            All work
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
            Archive
          </h1>

          <Gallery photos={photos} />
        </motion.div>
      </section>
    </div>
  );
}
