"use client";

import { ALL_FORMATS, ALL_GENRES, DARK, LIGHT } from "@/components/gallery/constants";

export function GalleryFilters({
  theme,
  activeFormat,
  activeGenre,
  onFormat,
  onGenre,
}: {
  theme: "dark" | "light";
  activeFormat: string;
  activeGenre: string;
  onFormat: (f: string) => void;
  onGenre: (g: string) => void;
}) {
  const T = theme === "light" ? LIGHT : DARK;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2.5rem",
        flexWrap: "wrap",
        gap: "1rem",
      }}
    >
      {/* Format tabs */}
      <div
        style={{
          display: "flex",
          border: `1px solid ${T.border}`,
          overflow: "hidden",
          borderRadius: "2px",
        }}
      >
        {ALL_FORMATS.map((fmt) => (
          <button
            key={fmt}
            onClick={() => onFormat(fmt)}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "0.5rem 1.1rem",
              background: activeFormat === fmt ? T.activeBg : "transparent",
              color: activeFormat === fmt ? T.text : T.textFaint,
              border: "none",
              borderRight: `1px solid ${T.border}`,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {fmt}
          </button>
        ))}
      </div>

      {/* Genre tags */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {ALL_GENRES.map((genre) => (
          <button
            key={genre}
            onClick={() => onGenre(genre)}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "0.3rem 0.7rem",
              background: "transparent",
              color: activeGenre === genre ? T.text : T.textFaint,
              border: `1px solid ${activeGenre === genre ? T.border : T.borderFaint}`,
              cursor: "pointer",
              transition: "all 0.2s",
              borderRadius: "2px",
            }}
          >
            {genre}
          </button>
        ))}
      </div>
    </div>
  );
}
