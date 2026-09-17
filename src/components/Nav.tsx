"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { PolarisMarkIcon } from "@/components/PolarisMark";

const LINKS = [
  { label: "Work", href: "/work" },
  { label: "Behind", href: "/behind" },
  { label: "Contact", href: "/contact" },
];

// ─── Nav ─────────────────────────────────────────────────────────────────────

export default function Nav({ visible = true }: { visible?: boolean }) {
  const [onLight, setOnLight] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setOnLight(window.scrollY > window.innerHeight * 0.85);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const markColor = onLight ? "#B87333" : "#A8C5DA";
  const textColor = onLight ? "#2A3A4A" : "#D4DCE8";
  const linkColor = onLight ? "rgba(42,58,74,0.6)" : "rgba(212,220,232,0.6)";

  return (
    <motion.nav
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "1.25rem 2rem",
        pointerEvents: visible ? "auto" : "none",
        backdropFilter: onLight ? "blur(8px)" : "none",
        WebkitBackdropFilter: onLight ? "blur(8px)" : "none",
        transition: "backdrop-filter 0.4s ease",
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          textDecoration: "none",
        }}
      >
        <motion.div
          animate={{ color: markColor }}
          transition={{ duration: 0.4 }}
        >
          <PolarisMarkIcon size={22} color={markColor} />
        </motion.div>
        <motion.span
          animate={{ color: textColor }}
          transition={{ duration: 0.4 }}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            lineHeight: 1,
          }}
        >
          Canopus
        </motion.span>
      </Link>

      {/* Links */}
      <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
        {LINKS.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: textColor,
              textDecoration: "none",
              transition: "color 0.4s, opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = linkColor)}
            onMouseLeave={(e) => (e.currentTarget.style.color = textColor)}
          >
            {label}
          </Link>
        ))}
      </div>
    </motion.nav>
  );
}
