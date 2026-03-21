"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";

// ─── Polaris mark — color-aware ───────────────────────────────────────────────

function PolarisMarkIcon({
  size = 22,
  color = "#A8C5DA",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-80 -80 160 160"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0 }}
    >
      <path
        fill={color}
        d="M0,-66 C11,-38 11,-15 0,0 C-11,-15 -11,-38 0,-66 Z"
        transform="rotate(0)"
      />
      <path
        fill={color}
        d="M0,-66 C11,-38 11,-15 0,0 C-11,-15 -11,-38 0,-66 Z"
        transform="rotate(90)"
      />
      <path
        fill={color}
        d="M0,-66 C11,-38 11,-15 0,0 C-11,-15 -11,-38 0,-66 Z"
        transform="rotate(180)"
      />
      <path
        fill={color}
        d="M0,-66 C11,-38 11,-15 0,0 C-11,-15 -11,-38 0,-66 Z"
        transform="rotate(270)"
      />
      <path
        fill={color}
        d="M0,-37 C4.5,-21 4.5,-9 0,0 C-4.5,-9 -4.5,-21 0,-37 Z"
        transform="rotate(45)"
      />
      <path
        fill={color}
        d="M0,-37 C4.5,-21 4.5,-9 0,0 C-4.5,-9 -4.5,-21 0,-37 Z"
        transform="rotate(135)"
      />
      <path
        fill={color}
        d="M0,-37 C4.5,-21 4.5,-9 0,0 C-4.5,-9 -4.5,-21 0,-37 Z"
        transform="rotate(225)"
      />
      <path
        fill={color}
        d="M0,-37 C4.5,-21 4.5,-9 0,0 C-4.5,-9 -4.5,-21 0,-37 Z"
        transform="rotate(315)"
      />
      <circle fill="transparent" cx="0" cy="0" r="10" />
      <circle fill={color} cx="0" cy="0" r="5" />
    </svg>
  );
}

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
