"use client";

import { motion } from "motion/react";
import { ScrambleText } from "motion-plus/react";
import { DARK, LIGHT } from "@/components/gallery/constants";

export function EmptyState({
  theme,
  message,
}: {
  theme: "dark" | "light";
  message: string;
}) {
  const T = theme === "light" ? LIGHT : DARK;
  return (
    <motion.div
      key={`empty-${message}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{
        padding: "5rem 2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.75rem",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "clamp(1.1rem, 2vw, 1.4rem)",
          fontWeight: 300,
          fontStyle: "italic",
          color: T.textMuted,
          lineHeight: 1.5,
        }}
      >
        <ScrambleText key={message}>{message}</ScrambleText>
      </p>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: T.textFaint,
        }}
      >
        Check back soon
      </span>
    </motion.div>
  );
}
