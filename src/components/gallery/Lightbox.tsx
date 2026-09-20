"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Photo } from "@/types/photo";
import { photoSrc } from "@/lib/photo-url";
import { useLightboxNavigation } from "@/components/gallery/useLightboxNavigation";

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(panel: HTMLElement | null): HTMLElement[] {
  if (!panel) return [];
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

// ─── MetaRow ──────────────────────────────────────────────────────────────────

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
          color: "rgba(212,220,232,0.3)",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "rgba(212,220,232,0.7)",
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Lightbox image ───────────────────────────────────────────────────────────

function LightboxImage({
  photo,
  onPointerDown,
  onPointerUp,
}: {
  photo: Photo;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      style={{
        position: "relative",
        flexShrink: 0,
        background: "#111F2E",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "30vw",
        touchAction: "pan-y",
      }}
    >
      {!loaded && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(212,220,232,0.15)",
          }}
        >
          Loading…
        </span>
      )}
      <img
        src={photoSrc(photo, 1920)}
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
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

export function Lightbox({
  photos,
  index,
  onClose,
  onNavigate,
  returnFocusTo,
}: {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  returnFocusTo: HTMLElement | null;
}) {
  const photo = photos[index];
  const isFilm = photo.format !== "DIGITAL";
  const reduced = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const { prev, next, onPointerDown, onPointerUp } = useLightboxNavigation({
    count: photos.length,
    index,
    onNavigate,
    onClose,
  });

  useEffect(() => {
    if (photos.length < 2) return;
    const urls = [photos[(index + 1) % photos.length], photos[(index - 1 + photos.length) % photos.length]]
      .map((p) => photoSrc(p, 1920));
    const imgs = urls.map((u) => { const i = new window.Image(); i.src = u; return i; });
    return () => { imgs.forEach((i) => { i.src = ""; }); };
  }, [photos, index]);

  useEffect(() => {
    panelRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      if (returnFocusTo?.isConnected) returnFocusTo.focus();
    };
  }, [returnFocusTo]);

  const handlePanelKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const focusable = getFocusable(panelRef.current);
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.25 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={photo.title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(14,24,36,0.96)",
        backdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.3, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handlePanelKeyDown}
        style={{
          display: "flex",
          alignItems: "stretch",
          maxWidth: "92vw",
          maxHeight: "88vh",
          overflow: "hidden",
          border: "0.5px solid rgba(212,220,232,0.07)",
          outline: "none",
        }}
      >
        <LightboxImage
          key={photo.id}
          photo={photo}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        />
        <motion.div
          initial={{ x: 32, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.1, ease: [0.4, 0, 0.2, 1] }}
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
                  color: "rgba(212,220,232,0.35)",
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
                color: "rgba(212,220,232,0.65)",
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
                color: "rgba(212,220,232,0.25)",
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
                    color: "rgba(212,220,232,0.35)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div
            style={{
              marginTop: "auto",
              display: "flex",
              gap: "0.5rem",
              alignSelf: "flex-start",
            }}
          >
            {photos.length > 1 && (
              <button
                onClick={prev}
                aria-label="Previous photo"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "9px",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "rgba(212,220,232,0.3)",
                  background: "transparent",
                  border: "0.5px solid rgba(212,220,232,0.08)",
                  padding: "0.5rem 0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#D4DCE8";
                  e.currentTarget.style.borderColor = "rgba(212,220,232,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "rgba(212,220,232,0.3)";
                  e.currentTarget.style.borderColor = "rgba(212,220,232,0.08)";
                }}
              >
                ‹
              </button>
            )}
            {photos.length > 1 && (
              <button
                onClick={next}
                aria-label="Next photo"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "9px",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "rgba(212,220,232,0.3)",
                  background: "transparent",
                  border: "0.5px solid rgba(212,220,232,0.08)",
                  padding: "0.5rem 0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#D4DCE8";
                  e.currentTarget.style.borderColor = "rgba(212,220,232,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "rgba(212,220,232,0.3)";
                  e.currentTarget.style.borderColor = "rgba(212,220,232,0.08)";
                }}
              >
                ›
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "rgba(212,220,232,0.3)",
                background: "transparent",
                border: "0.5px solid rgba(212,220,232,0.08)",
                padding: "0.5rem 0.85rem",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#D4DCE8";
                e.currentTarget.style.borderColor = "rgba(212,220,232,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(212,220,232,0.3)";
                e.currentTarget.style.borderColor = "rgba(212,220,232,0.08)";
              }}
            >
              Close ✕
            </button>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
