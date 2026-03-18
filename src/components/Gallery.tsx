"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Photo } from "@/types/photo";
import type { Format } from "@prisma/client";

const FORMAT_LABELS: Record<Format, string> = {
  DIGITAL: "Digital",
  FILM_35MM: "35mm",
  FILM_120MM: "120",
};

const ALL_FORMATS = ["All", "Digital", "35mm", "120"] as const;
const ALL_GENRES = [
  "All",
  "Landscape",
  "Astro",
  "Architecture",
  "Sports",
  "Underwater",
  "Street",
  "Portrait",
] as const;

function cloudinaryUrl(id: string, width = 800) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  return `https://res.cloudinary.com/${cloud}/image/upload/w_${width},q_auto,f_auto/${id}`;
}

// ─── Mini EXIF value pill ───────────────────────────────────────────────────

function MiniExif({ value }: { value: string }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        color: "rgba(240,242,244,0.65)",
        letterSpacing: "0.05em",
      }}
    >
      {value}
    </span>
  );
}

// ─── EXIF overlay (appears on image on hover) ────────────────────────────────

function ExifBar({ photo }: { photo: Photo }) {
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
          "linear-gradient(to top, rgba(8,10,12,0.95) 0%, rgba(8,10,12,0.6) 65%, transparent 100%)",
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
              color: "#F0F2F4",
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
              color: "rgba(240,242,244,0.4)",
            }}
          >
            {photo.location}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Photo card ───────────────────────────────────────────────────────────────

function PhotoCard({
  photo,
  onClick,
}: {
  photo: Photo;
  onClick: (p: Photo) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      layout
      onClick={() => onClick(photo)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: "pointer",
        overflow: "hidden",
        position: "relative",
        willChange: "transform",
      }}
    >
      <div
        style={{
          paddingTop: `${(1 / photo.aspectRatio) * 100}%`,
          position: "relative",
        }}
      >
        <img
          src={cloudinaryUrl(photo.cloudinaryId)}
          alt={photo.title}
          loading="lazy"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transition: "transform 0.6s ease",
            transform: hovered ? "scale(1.03)" : "scale(1)",
          }}
        />

        {/* Format badge */}
        <div
          style={{
            position: "absolute",
            top: "0.75rem",
            right: "0.75rem",
            fontFamily: "var(--font-mono)",
            fontSize: "8px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(240,242,244,0.6)",
            background: "rgba(8,10,12,0.5)",
            padding: "0.2rem 0.5rem",
            backdropFilter: "blur(4px)",
            zIndex: 5,
          }}
        >
          {FORMAT_LABELS[photo.format]}
        </div>

        {/* EXIF overlay — lives on the image */}
        <AnimatePresence>
          {hovered && <ExifBar photo={photo} />}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── MetaRow ─────────────────────────────────────────────────────────────────

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: "1rem",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(240,242,244,0.3)",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "rgba(240,242,244,0.7)",
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Expanded photo modal ─────────────────────────────────────────────────────

function ExpandedPhoto({
  photo,
  onClose,
}: {
  photo: Photo;
  onClose: () => void;
}) {
  const isFilm = photo.format !== "DIGITAL";
  const [loaded, setLoaded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(8,10,12,0.96)",
        backdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          alignItems: "stretch",
          maxWidth: "92vw",
          maxHeight: "88vh",
          overflow: "hidden",
          border: "0.5px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* ── Image side ── */}
        <div
          style={{
            position: "relative",
            flexShrink: 0,
            background: "#0D0F11",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "30vw",
          }}
        >
          {/* Loading placeholder */}
          {!loaded && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(240,242,244,0.15)",
              }}
            >
              Loading…
            </span>
          )}

          <img
            src={cloudinaryUrl(photo.cloudinaryId, 1600)}
            alt={photo.title}
            onLoad={() => setLoaded(true)}
            style={{
              maxHeight: "88vh",
              maxWidth: "65vw",
              objectFit: "contain",
              display: "block",
              opacity: loaded ? 1 : 0,
              transition: "opacity 0.4s ease",
              position: loaded ? "relative" : "absolute",
            }}
          />
        </div>

        {/* ── Info panel — slides in from right ── */}
        <motion.div
          initial={{ x: 32, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
          style={{
            width: "260px",
            flexShrink: 0,
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            overflowY: "auto",
            borderLeft: "0.5px solid rgba(255,255,255,0.06)",
            background: "#0D0F11",
          }}
        >
          {/* Title + location */}
          <div>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "22px",
                fontWeight: 300,
                color: "#F0F2F4",
                marginBottom: "0.4rem",
                lineHeight: 1.2,
              }}
            >
              {photo.title}
            </h2>
            {photo.location && (
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "9px",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "rgba(240,242,244,0.35)",
                }}
              >
                {photo.location}
              </p>
            )}
          </div>

          {/* Caption */}
          {photo.caption && (
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "14px",
                fontWeight: 300,
                fontStyle: "italic",
                color: "rgba(240,242,244,0.65)",
                lineHeight: 1.7,
              }}
            >
              {photo.caption}
            </p>
          )}

          {/* EXIF data */}
          <div
            style={{
              borderTop: "0.5px solid rgba(255,255,255,0.06)",
              paddingTop: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(240,242,244,0.25)",
                marginBottom: "0.25rem",
              }}
            >
              {isFilm ? "Film data" : "Exposure data"}
            </span>

            {!isFilm ? (
              <>
                {photo.camera && (
                  <MetaRow label="Camera" value={photo.camera} />
                )}
                {photo.lens && <MetaRow label="Lens" value={photo.lens} />}
                {photo.focalLength && (
                  <MetaRow label="Focal length" value={photo.focalLength} />
                )}
                {photo.aperture && (
                  <MetaRow label="Aperture" value={`f/${photo.aperture}`} />
                )}
                {photo.shutterSpeed && (
                  <MetaRow label="Shutter" value={photo.shutterSpeed} />
                )}
                {photo.iso && <MetaRow label="ISO" value={photo.iso} />}
              </>
            ) : (
              <>
                {photo.camera && (
                  <MetaRow label="Camera" value={photo.camera} />
                )}
                {photo.filmStock && (
                  <MetaRow label="Film" value={photo.filmStock} />
                )}
                {photo.filmFormat && (
                  <MetaRow label="Format" value={photo.filmFormat!} />
                )}
              </>
            )}
          </div>

          {/* Tags */}
          {photo.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {photo.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "9px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "0.2rem 0.55rem",
                    border: "0.5px solid rgba(255,255,255,0.08)",
                    color: "rgba(240,242,244,0.35)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              marginTop: "auto",
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "rgba(240,242,244,0.3)",
              background: "transparent",
              border: "0.5px solid rgba(255,255,255,0.08)",
              padding: "0.5rem 0.85rem",
              cursor: "pointer",
              transition: "all 0.2s",
              alignSelf: "flex-start",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#F0F2F4";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(240,242,244,0.3)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            }}
          >
            Close ✕
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Gallery export ──────────────────────────────────────────────────────

export default function Gallery({ photos }: { photos: Photo[] }) {
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null);
  const [activeFormat, setActiveFormat] = useState<string>("All");
  const [activeGenre, setActiveGenre] = useState<string>("All");

  const filtered = photos.filter((p) => {
    const fmtMatch =
      activeFormat === "All" || FORMAT_LABELS[p.format] === activeFormat;
    const genreMatch =
      activeGenre === "All" ||
      p.tags.map((t) => t.toLowerCase()).includes(activeGenre.toLowerCase());
    return fmtMatch && genreMatch;
  });

  return (
    <>
      {/* ── Filters ── */}
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
            border: "0.5px solid rgba(255,255,255,0.1)",
            overflow: "hidden",
          }}
        >
          {ALL_FORMATS.map((fmt) => (
            <button
              key={fmt}
              onClick={() => setActiveFormat(fmt)}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "0.5rem 1.1rem",
                background:
                  activeFormat === fmt
                    ? "rgba(240,242,244,0.1)"
                    : "transparent",
                color:
                  activeFormat === fmt ? "#F0F2F4" : "rgba(240,242,244,0.35)",
                border: "none",
                borderRight: "0.5px solid rgba(255,255,255,0.1)",
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
              onClick={() => setActiveGenre(genre)}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "0.3rem 0.7rem",
                background: "transparent",
                color:
                  activeGenre === genre ? "#F0F2F4" : "rgba(240,242,244,0.35)",
                border: `0.5px solid ${activeGenre === genre ? "rgba(240,242,244,0.4)" : "rgba(255,255,255,0.08)"}`,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* ── Masonry grid ── */}
      <motion.div
        layout
        style={{
          columns: "var(--gallery-cols, 3)",
          columnGap: "3px",
        }}
      >
        <style>{`
          @media (max-width: 1024px) { :root { --gallery-cols: 2; } }
          @media (max-width: 640px)  { :root { --gallery-cols: 1; } }
        `}</style>

        <AnimatePresence>
          {filtered.map((photo, i) => (
            <motion.div
              key={photo.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4, delay: i * 0.04, ease: "easeOut" }}
              style={{ marginBottom: "3px", breakInside: "avoid" }}
            >
              <PhotoCard photo={photo} onClick={(p) => setActivePhoto(p)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* ── Expanded modal ── */}
      <AnimatePresence>
        {activePhoto && (
          <ExpandedPhoto
            photo={activePhoto}
            onClose={() => setActivePhoto(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
