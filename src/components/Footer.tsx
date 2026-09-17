import Link from "next/link";

const PALETTES = {
  dark: {
    border: "rgba(212,220,232,0.07)",
    text: "rgba(212,220,232,0.5)",
  },
  light: {
    border: "rgba(42,58,74,0.12)",
    text: "rgba(42,58,74,0.6)",
  },
} as const;

export function Footer({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { border, text } = PALETTES[tone];

  const linkStyle = {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    color: text,
    textDecoration: "none",
  };

  return (
    <footer
      style={{
        borderTop: `0.5px solid ${border}`,
        padding: "1.5rem clamp(1.5rem, 5vw, 4rem)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span style={linkStyle}>© {new Date().getFullYear()} Ethan Duval</span>
      <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
        <Link href="/work" style={linkStyle}>
          Work
        </Link>
        <Link href="/behind" style={linkStyle}>
          Behind
        </Link>
        <Link href="/contact" style={linkStyle}>
          Contact
        </Link>
        <Link href="/admin" style={{ ...linkStyle, opacity: 0.4 }}>
          Admin
        </Link>
      </div>
    </footer>
  );
}
