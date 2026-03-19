"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Photo } from "@/types/photo";
import { ScrambleText } from "motion-plus/react";

type Format = "DIGITAL" | "FILM_35MM" | "FILM_120MM";

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

const EMPTY_MESSAGES = [
  "Nothing is here just yet... but something's coming!",
  "This category is still being developed. Literally.",
  "The shutter is closed on this one for now. Check back later!",
  "Blank frame. Give it some time to develop!",
  "Not yet captured. The light wasn't right.",
  "This one's still in the darkroom. Stay tuned!",
  "Filed under: soon™",
  "This category is still loading... must be a really long exposure.",
  "The film is still rolling on this one. Check back soon!",
  "This section is still being composed. Patience is a virtue!",
  "Patience, young padawan. This category is still being formed.",
  "Zero photos here yet. The photographer is aware and honestly a bit embarrassed.",
  "Even the tumbleweeds are taking a break here.",
  "Still loading... just kidding, there are actually no photos here yet. But soon!",
  "Lens cap was on... We don't talk about it.",
  "Currently vibes only. No photos have been captured here yet.",
  "Nothing to see here... Which is ironic, for a photography site.",
];

const CHEEKY_MESSAGES = [
  "There's still nothing... Are you testing me?",
  "Yep, still nothing. The suspense is killing me too.",
  "You're really committed to finding something that isn't there, huh?",
  "I admire your dedication to this fruitless quest.",
  "At this point, you might as well just stare at the wall. It has about as much content as this section.",
  "Okay seriously, it's just empty. Maybe go outside or something?",
  "Okay at this point I'm starting to feel bad for you. There's really nothing here.",
  "The photographer has been notified of your persistence.",
  "Bold strategy. Still empty though.",
  "This is a test of willpower. You are doing... fine, I guess?",
  "I see you. Still nothing here, but I see you.",
  "Dang, you really want what I don't have...",
  "This is getting a bit awkward, isn't it?",
  "Okay fine... I'll tell the photographer to get out more.",
];

function pickRandom(pool: string[], history: string[], avoidCount = 3): string {
  const recent = history.slice(-avoidCount);
  const available = pool.filter((msg) => !recent.includes(msg));
  const source = available.length > 0 ? available : pool;
  return source[Math.floor(Math.random() * source.length)];
}

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
  index,
  onClick,
}: {
  photo: Photo;
  index: number;
  onClick: (p: Photo) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: index * 0.035,
        ease: [0.4, 0, 0.2, 1],
      }}
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
        <motion.img
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

        {/* EXIF overlay */}
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
          border: "0.5px solid rgba(212,220,232,0.07)",
        }}
      >
        {/* Image side */}
        <div
          style={{
            position: "relative",
            flexShrink: 0,
            background: "#111F2E",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "30vw",
          }}
        >
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

        {/* Info panel */}
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
            borderLeft: "0.5px solid rgba(212,220,232,0.06)",
            background: "#111F2E",
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "22px",
                fontWeight: 300,
                color: "#D4DCE8",
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

          <div
            style={{
              borderTop: "0.5px solid rgba(212,220,232,0.06)",
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
                    border: "0.5px solid rgba(212,220,232,0.08)",
                    color: "rgba(240,242,244,0.35)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

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
              border: "0.5px solid rgba(212,220,232,0.08)",
              padding: "0.5rem 0.85rem",
              cursor: "pointer",
              transition: "all 0.2s",
              alignSelf: "flex-start",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#D4DCE8";
              e.currentTarget.style.borderColor = "rgba(212,220,232,0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(240,242,244,0.3)";
              e.currentTarget.style.borderColor = "rgba(212,220,232,0.08)";
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

  const messageHistoryRef = useRef<string[]>([]);
  const consecutiveEmptyRef = useRef(0);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  useEffect(() => {
    const msg = pickRandom(EMPTY_MESSAGES, [], 0);
    messageHistoryRef.current = [msg];
    setCurrentMessage(msg);
  }, []);

  const filtered = photos.filter((p) => {
    const fmtMatch =
      activeFormat === "All" || FORMAT_LABELS[p.format] === activeFormat;
    const genreMatch =
      activeGenre === "All" ||
      p.tags.map((t) => t.toLowerCase()).includes(activeGenre.toLowerCase());
    return fmtMatch && genreMatch;
  });

  const handleFilterChange = (isEmpty: boolean) => {
    if (isEmpty) {
      consecutiveEmptyRef.current += 1;
      const pool =
        consecutiveEmptyRef.current > 2 ? CHEEKY_MESSAGES : EMPTY_MESSAGES;
      const msg = pickRandom(pool, messageHistoryRef.current, 3);
      messageHistoryRef.current = [...messageHistoryRef.current, msg];
      setCurrentMessage(msg);
    } else {
      consecutiveEmptyRef.current = 0;
    }
  };

  const handleFormatChange = (fmt: string) => {
    setActiveFormat(fmt);
    const willBeEmpty =
      photos.filter((p) => {
        const fmtMatch = fmt === "All" || FORMAT_LABELS[p.format] === fmt;
        const genreMatch =
          activeGenre === "All" ||
          p.tags
            .map((t) => t.toLowerCase())
            .includes(activeGenre.toLowerCase());
        return fmtMatch && genreMatch;
      }).length === 0;
    handleFilterChange(willBeEmpty);
  };

  const handleGenreChange = (genre: string) => {
    setActiveGenre(genre);
    const willBeEmpty =
      photos.filter((p) => {
        const fmtMatch =
          activeFormat === "All" || FORMAT_LABELS[p.format] === activeFormat;
        const genreMatch =
          genre === "All" ||
          p.tags.map((t) => t.toLowerCase()).includes(genre.toLowerCase());
        return fmtMatch && genreMatch;
      }).length === 0;
    handleFilterChange(willBeEmpty);
  };

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
            border: "0.5px solid rgba(212,220,232,0.1)",
            overflow: "hidden",
          }}
        >
          {ALL_FORMATS.map((fmt) => (
            <button
              key={fmt}
              onClick={() => handleFormatChange(fmt)}
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
                  activeFormat === fmt ? "#D4DCE8" : "rgba(212,220,232,0.35)",
                border: "none",
                borderRight: "0.5px solid rgba(212,220,232,0.1)",
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
              onClick={() => handleGenreChange(genre)}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "0.3rem 0.7rem",
                background: "transparent",
                color:
                  activeGenre === genre ? "#B8C4D0" : "rgba(240,242,244,0.35)",
                border: `0.5px solid ${activeGenre === genre ? "rgba(240,242,244,0.4)" : "rgba(212,220,232,0.08)"}`,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div
            key={`empty-${currentMessage}`}
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
                color: "rgba(240,242,244,0.45)",
                lineHeight: 1.5,
              }}
            >
              {currentMessage && (
                <ScrambleText key={currentMessage}>
                  {currentMessage}
                </ScrambleText>
              )}
            </p>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(240,242,244,0.25)",
              }}
            >
              Check back soon
            </span>
          </motion.div>
        ) : (
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

            {filtered.map((photo, i) => (
              <div
                key={photo.id}
                style={{ marginBottom: "3px", breakInside: "avoid" }}
              >
                <PhotoCard
                  photo={photo}
                  index={i}
                  onClick={(p) => setActivePhoto(p)}
                />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

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
