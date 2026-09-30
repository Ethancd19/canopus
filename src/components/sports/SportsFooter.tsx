import Link from "next/link";

const linkStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: "11px",
  color: "rgba(212,220,232,0.5)",
  textDecoration: "none",
};

export function SportsFooter() {
  return (
    <footer
      style={{
        borderTop: "0.5px solid rgba(212,220,232,0.07)",
        padding: "1.5rem clamp(1.5rem, 5vw, 4rem)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span style={linkStyle}>© {new Date().getFullYear()} Ethan Duval</span>
      <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
        <Link href="/" style={linkStyle}>
          Home
        </Link>
        <Link href="/work" style={linkStyle}>
          Work
        </Link>
        <Link href="/contact" style={linkStyle}>
          Contact
        </Link>
      </div>
    </footer>
  );
}
