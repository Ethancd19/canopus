"use client";

import { motion } from "motion/react";
import { Photo } from "@/types/photo";

// ─── Mini EXIF pill ───────────────────────────────────────────────────────────

function MiniExif({ value }: { value: string }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        color: "rgba(212,220,232,0.65)",
        letterSpacing: "0.05em",
      }}
    >
      {value}
    </span>
  );
}

// ─── EXIF overlay ─────────────────────────────────────────────────────────────

export function ExifBar({ photo }: { photo: Photo }) {
  const isFilm = photo.format !== "DIGITAL";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        background:
          "linear-gradient(to top, rgba(14,24,36,0.95) 0%, rgba(14,24,36,0.6) 65%, transparent 100%)",
        padding: "2.5rem 0.85rem 0.75rem",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}
        >
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "13px",
              fontWeight: 300,
              color: "#D4DCE8",
              lineHeight: 1,
            }}
          >
            {photo.title}
          </span>
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {!isFilm ? (
              <>
                {photo.camera && <MiniExif value={photo.camera} />}
                {photo.focalLength && <MiniExif value={photo.focalLength} />}
                {photo.aperture && <MiniExif value={`f/${photo.aperture}`} />}
                {photo.shutterSpeed && <MiniExif value={photo.shutterSpeed} />}
                {photo.iso && <MiniExif value={`ISO ${photo.iso}`} />}
              </>
            ) : (
              <>
                {photo.camera && <MiniExif value={photo.camera} />}
                {photo.filmStock && <MiniExif value={photo.filmStock} />}
              </>
            )}
          </div>
        </div>
        {photo.location && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "8px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(212,220,232,0.4)",
            }}
          >
            {photo.location}
          </span>
        )}
      </div>
    </motion.div>
  );
}
