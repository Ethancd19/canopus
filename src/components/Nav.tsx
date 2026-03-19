"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion } from "motion/react";

// ─── Inline Polaris mark SVG ──────────────────────────────────────────────────

function PolarisMarк({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-80 -80 160 160"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0 }}
    >
      <path
        fill="#A8C5DA"
        d="M0,-66 C11,-38 11,-15 0,0 C-11,-15 -11,-38 0,-66 Z"
        transform="rotate(0)"
      />
      <path
        fill="#A8C5DA"
        d="M0,-66 C11,-38 11,-15 0,0 C-11,-15 -11,-38 0,-66 Z"
        transform="rotate(90)"
      />
      <path
        fill="#A8C5DA"
        d="M0,-66 C11,-38 11,-15 0,0 C-11,-15 -11,-38 0,-66 Z"
        transform="rotate(180)"
      />
      <path
        fill="#A8C5DA"
        d="M0,-66 C11,-38 11,-15 0,0 C-11,-15 -11,-38 0,-66 Z"
        transform="rotate(270)"
      />
      <path
        fill="#A8C5DA"
        d="M0,-37 C4.5,-21 4.5,-9 0,0 C-4.5,-9 -4.5,-21 0,-37 Z"
        transform="rotate(45)"
      />
      <path
        fill="#A8C5DA"
        d="M0,-37 C4.5,-21 4.5,-9 0,0 C-4.5,-9 -4.5,-21 0,-37 Z"
        transform="rotate(135)"
      />
      <path
        fill="#A8C5DA"
        d="M0,-37 C4.5,-21 4.5,-9 0,0 C-4.5,-9 -4.5,-21 0,-37 Z"
        transform="rotate(225)"
      />
      <path
        fill="#A8C5DA"
        d="M0,-37 C4.5,-21 4.5,-9 0,0 C-4.5,-9 -4.5,-21 0,-37 Z"
        transform="rotate(315)"
      />
      <circle fill="transparent" cx="0" cy="0" r="10" />
      <circle fill="#A8C5DA" cx="0" cy="0" r="5" />
    </svg>
  );
}

// ─── Nav links ────────────────────────────────────────────────────────────────

const LINKS = [
  { label: "Work", href: "/work" },
  { label: "Behind", href: "/behind" },
  { label: "Contact", href: "/contact" },
];

// ─── Nav ─────────────────────────────────────────────────────────────────────

export default function Nav({ visible = true }: { visible?: boolean }) {
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
        mixBlendMode: "difference",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {/* Logo mark + wordmark */}
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          textDecoration: "none",
        }}
      >
        <PolarisMarк size={22} />
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

      {/* Nav links */}
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
              color: "#D4DCE8",
              textDecoration: "none",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.5")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            {label}
          </Link>
        ))}
      </div>
    </motion.nav>
  );
}
