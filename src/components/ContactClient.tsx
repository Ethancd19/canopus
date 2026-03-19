"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue } from "motion/react";
import { ScrambleText } from "motion-plus/react";
import Nav from "@/components/Nav";

// ─── Types ────────────────────────────────────────────────────────────────────

type Photo = {
  id: string;
  cloudinaryId: string;
  title: string;
  location: string | null;
  aspectRatio: number;
};

type FormState = "idle" | "sending" | "sent" | "error";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cloudinaryUrl(id: string, width = 1200) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  return `https://res.cloudinary.com/${cloud}/image/upload/w_${width},q_auto,f_auto/${id}`;
}

// ─── Ken Burns slideshow ──────────────────────────────────────────────────────

// Each slide picks a random start/end position to pan between
const KB_PRESETS = [
  { fromScale: 1.12, toScale: 1.0, fromX: 2, fromY: 2, toX: -2, toY: -2 },
  { fromScale: 1.0, toScale: 1.12, fromX: -2, fromY: 0, toX: 2, toY: -1 },
  { fromScale: 1.08, toScale: 1.0, fromX: 0, fromY: -2, toX: 0, toY: 2 },
  { fromScale: 1.0, toScale: 1.1, fromX: 2, fromY: -1, toX: -2, toY: 1 },
  { fromScale: 1.1, toScale: 1.02, fromX: -1, fromY: 2, toX: 1, toY: -2 },
];

function KenBurns({ photos }: { photos: Photo[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(true);

  const SLIDE_DURATION = 7000; // ms per slide
  const FADE_DURATION = 1.2; // seconds for crossfade

  useEffect(() => {
    if (!photos.length) return;
    const interval = setInterval(() => {
      setPrevIdx(activeIdx);
      setActiveIdx((i) => (i + 1) % photos.length);
    }, SLIDE_DURATION);
    return () => clearInterval(interval);
  }, [activeIdx, photos.length]);

  if (!photos.length) return null;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Previous slide — fades out */}
      {prevIdx !== null && (
        <KenBurnsSlide
          key={`prev-${prevIdx}`}
          photo={photos[prevIdx]}
          preset={KB_PRESETS[prevIdx % KB_PRESETS.length]}
          duration={SLIDE_DURATION}
          fadeDuration={FADE_DURATION}
          isLeaving
        />
      )}

      {/* Active slide — fades in */}
      <KenBurnsSlide
        key={`active-${activeIdx}`}
        photo={photos[activeIdx]}
        preset={KB_PRESETS[activeIdx % KB_PRESETS.length]}
        duration={SLIDE_DURATION}
        fadeDuration={FADE_DURATION}
        isLeaving={false}
      />

      {/* Dark overlay so text is readable */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(14,24,36,0.35)",
          zIndex: 5,
          pointerEvents: "none",
        }}
      />

      {/* Location label */}
      <AnimatePresence mode="wait">
        {photos[activeIdx].location && (
          <motion.div
            key={activeIdx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            style={{
              position: "absolute",
              bottom: "2rem",
              left: "2rem",
              zIndex: 10,
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(212,220,232,0.55)",
              pointerEvents: "none",
            }}
          >
            {photos[activeIdx].location}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Star coordinates */}
      <div
        style={{
          position: "absolute",
          bottom: "2rem",
          right: "2rem",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "2px",
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "8px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "rgba(240,242,244,0.2)",
          }}
        >
          α Carinae · Canopus
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "8px",
            letterSpacing: "0.1em",
            color: "rgba(240,242,244,0.12)",
          }}
        >
          06h 23m 57s · −52° 41′ 44″
        </span>
      </div>

      {/* Slide dots */}
      <div
        style={{
          position: "absolute",
          bottom: "2rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          display: "flex",
          gap: "6px",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        {photos.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === activeIdx ? "16px" : "4px",
              height: "2px",
              background:
                i === activeIdx
                  ? "rgba(212,220,232,0.6)"
                  : "rgba(212,220,232,0.2)",
              transition: "all 0.4s ease",
              borderRadius: "1px",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function KenBurnsSlide({
  photo,
  preset,
  duration,
  fadeDuration,
  isLeaving,
}: {
  photo: Photo;
  preset: (typeof KB_PRESETS)[0];
  duration: number;
  fadeDuration: number;
  isLeaving: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: isLeaving ? 1 : 0 }}
      animate={{ opacity: isLeaving ? 0 : 1 }}
      transition={{ duration: fadeDuration, ease: "easeInOut" }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: isLeaving ? 1 : 2,
        overflow: "hidden",
      }}
    >
      <motion.img
        src={cloudinaryUrl(photo.cloudinaryId, 1400)}
        alt={photo.title}
        initial={{
          scale: preset.fromScale,
          x: `${preset.fromX}%`,
          y: `${preset.fromY}%`,
        }}
        animate={{
          scale: preset.toScale,
          x: `${preset.toX}%`,
          y: `${preset.toY}%`,
        }}
        transition={{
          duration: duration / 1000,
          ease: "linear",
        }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          willChange: "transform",
        }}
      />
    </motion.div>
  );
}

// ─── Magnetic submit button ───────────────────────────────────────────────────

function MagneticButton({
  children,
  onClick,
  disabled,
  style: extraStyle,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const bx = useMotionValue(0);
  const by = useMotionValue(0);

  const onMouseMove = (e: React.MouseEvent) => {
    if (!ref.current || disabled) return;
    const rect = ref.current.getBoundingClientRect();
    bx.set((e.clientX - (rect.left + rect.width / 2)) * 0.3);
    by.set((e.clientY - (rect.top + rect.height / 2)) * 0.3);
  };

  const onMouseLeave = () => {
    bx.set(0);
    by.set(0);
  };

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ x: bx, y: by, ...extraStyle }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {children}
    </motion.button>
  );
}

// ─── ScrambleText section label ───────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setActive(true);
      },
      { threshold: 0.5 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "9px",
        letterSpacing: "0.25em",
        textTransform: "uppercase",
        color: "rgba(212,220,232,0.3)",
        marginBottom: "1rem",
      }}
    >
      {active ? (
        <ScrambleText>{text}</ScrambleText>
      ) : (
        <span style={{ opacity: 0 }}>{text}</span>
      )}
    </div>
  );
}

// ─── Input styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "none",
  borderBottom: "0.5px solid rgba(212,220,232,0.12)",
  padding: "0.6rem 0",
  color: "#D4DCE8",
  fontFamily: "var(--font-mono)",
  fontSize: "13px",
  outline: "none",
  transition: "border-color 0.2s",
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function ContactClient({ photos }: { photos: Photo[] }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");

  const subjects = [
    "Just saying hi",
    "General inquiry",
    "Collaboration",
    "Print / licensing",
  ];

  const handleSubmit = async () => {
    if (!name || !email || !message) return;
    setFormState("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      if (!res.ok) throw new Error("Send failed");
      setFormState("sent");
    } catch {
      setFormState("error");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0E1824",
        color: "#D4DCE8",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Nav visible={true} />

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* ── Left: Ken Burns slideshow ── */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRight: "0.5px solid rgba(212,220,232,0.05)",
          }}
        >
          <KenBurns photos={photos} />
        </div>

        {/* ── Right: Contact form ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "clamp(2rem, 5vw, 4rem)",
            overflowY: "auto",
          }}
        >
          <div style={{ maxWidth: "460px", margin: "0 auto", width: "100%" }}>
            <AnimatePresence mode="wait">
              {formState === "sent" ? (
                // ── Success state ──
                <motion.div
                  key="sent"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <h2
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
                      fontWeight: 300,
                      color: "#D4DCE8",
                      lineHeight: 1.2,
                    }}
                  >
                    Message received.
                  </h2>
                  <p
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      color: "rgba(212,220,232,0.4)",
                      lineHeight: 1.8,
                      letterSpacing: "0.05em",
                    }}
                  >
                    Canopus will be in touch.
                    <br />
                    It always is.
                  </p>
                </motion.div>
              ) : (
                // ── Form ──
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2rem",
                  }}
                >
                  {/* Heading */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                  >
                    <p
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "9px",
                        letterSpacing: "0.25em",
                        textTransform: "uppercase",
                        color: "#C9A96E",
                        marginBottom: "0.65rem",
                      }}
                    >
                      Get in touch
                    </p>
                    <h1
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "clamp(2rem, 3.5vw, 3rem)",
                        fontWeight: 300,
                        color: "#D4DCE8",
                        lineHeight: 1.15,
                        letterSpacing: "0.02em",
                      }}
                    >
                      Let's make
                      <br />
                      something.
                    </h1>
                  </motion.div>

                  {/* Subject pills */}
                  <div>
                    <SectionLabel text="What's this about?" />
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.4rem",
                      }}
                    >
                      {subjects.map((s) => (
                        <button
                          key={s}
                          onClick={() => setSubject(subject === s ? "" : s)}
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "9px",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            padding: "0.4rem 0.85rem",
                            background: "transparent",
                            border: `0.5px solid ${subject === s ? "rgba(212,220,232,0.45)" : "rgba(212,220,232,0.1)"}`,
                            color:
                              subject === s
                                ? "#D4DCE8"
                                : "rgba(212,220,232,0.35)",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fields */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1.5rem",
                    }}
                  >
                    <SectionLabel text="Tell me about yourself" />

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "1.25rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.25rem",
                        }}
                      >
                        <label
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "8px",
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            color: "rgba(212,220,232,0.25)",
                          }}
                        >
                          Name
                        </label>
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          style={inputStyle}
                          onFocus={(e) =>
                            (e.target.style.borderBottomColor =
                              "rgba(212,220,232,0.45)")
                          }
                          onBlur={(e) =>
                            (e.target.style.borderBottomColor =
                              "rgba(212,220,232,0.12)")
                          }
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.25rem",
                        }}
                      >
                        <label
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "8px",
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            color: "rgba(212,220,232,0.25)",
                          }}
                        >
                          Email
                        </label>
                        <input
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          type="email"
                          style={inputStyle}
                          onFocus={(e) =>
                            (e.target.style.borderBottomColor =
                              "rgba(212,220,232,0.45)")
                          }
                          onBlur={(e) =>
                            (e.target.style.borderBottomColor =
                              "rgba(212,220,232,0.12)")
                          }
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                      }}
                    >
                      <label
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "8px",
                          letterSpacing: "0.15em",
                          textTransform: "uppercase",
                          color: "rgba(240,242,244,0.25)",
                        }}
                      >
                        Message
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={5}
                        style={{
                          ...inputStyle,
                          resize: "none",
                          lineHeight: 1.7,
                        }}
                        onFocus={(e) =>
                          (e.target.style.borderBottomColor =
                            "rgba(212,220,232,0.45)")
                        }
                        onBlur={(e) =>
                          (e.target.style.borderBottomColor =
                            "rgba(212,220,232,0.12)")
                        }
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1.25rem",
                    }}
                  >
                    <MagneticButton
                      onClick={handleSubmit}
                      disabled={
                        formState === "sending" || !name || !email || !message
                      }
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        padding: "0.85rem 2rem",
                        background: "rgba(212,220,232,0.06)",
                        border: "0.5px solid rgba(212,220,232,0.18)",
                        color:
                          !name || !email || !message
                            ? "rgba(212,220,232,0.2)"
                            : "#D4DCE8",
                        cursor:
                          !name || !email || !message || formState === "sending"
                            ? "not-allowed"
                            : "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {formState === "sending" ? "Sending…" : "Send message"}
                    </MagneticButton>

                    {formState === "error" && (
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "9px",
                          color: "#E07070",
                          letterSpacing: "0.1em",
                        }}
                      >
                        Something went wrong.
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
