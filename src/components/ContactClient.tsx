"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "motion/react";
import { ScrambleText } from "motion-plus/react";
import Nav from "@/components/Nav";

type FormState = "idle" | "sending" | "sent" | "error";

// ─── Polaris mark (large) ─────────────────────────────────────────────────────

function PolarisLarge({
  size = 96,
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
      <circle fill="#0E1824" cx="0" cy="0" r="12" />
      <circle fill={color} cx="0" cy="0" r="6" />
    </svg>
  );
}

// ─── Left panel with spotlight cursor ────────────────────────────────────────

function LogoPanel() {
  const panelRef = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0.5);
  const rawY = useMotionValue(0.5);

  // Spring smoothing for the glow
  const springX = useSpring(rawX, { stiffness: 80, damping: 20 });
  const springY = useSpring(rawY, { stiffness: 80, damping: 20 });

  const [glowStyle, setGlowStyle] = useState({
    background:
      "radial-gradient(600px circle at 50% 50%, rgba(201,169,110,0.08) 0%, transparent 70%)",
  });

  useEffect(() => {
    const unsub = springX.on("change", () => {
      const x = springX.get() * 100;
      const y = springY.get() * 100;
      setGlowStyle({
        background: `radial-gradient(500px circle at ${x}% ${y}%, rgba(201,169,110,0.12) 0%, rgba(201,169,110,0.04) 30%, transparent 70%)`,
      });
    });
    return unsub;
  }, [springX, springY]);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = panelRef.current?.getBoundingClientRect();
      if (!rect) return;
      rawX.set((e.clientX - rect.left) / rect.width);
      rawY.set((e.clientY - rect.top) / rect.height);
    },
    [rawX, rawY],
  );

  const onMouseLeave = useCallback(() => {
    rawX.set(0.5);
    rawY.set(0.5);
  }, [rawX, rawY]);

  return (
    <div
      ref={panelRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        borderRight: "0.5px solid rgba(212,220,232,0.07)",
        overflow: "hidden",
        cursor: "default",
      }}
    >
      {/* Spotlight glow layer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          ...glowStyle,
          transition: "background 0.05s",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.5rem",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        {/* Large Polaris mark */}
        <motion.div
          animate={{ rotate: [0, 0.5, -0.5, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        >
          <PolarisLarge size={100} color="#A8C5DA" />
        </motion.div>

        {/* Wordmark */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "18px",
              letterSpacing: "0.45em",
              textTransform: "uppercase",
              color: "#D4DCE8",
              lineHeight: 1,
            }}
          >
            Canopus
          </span>
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "13px",
              fontWeight: 300,
              fontStyle: "italic",
              letterSpacing: "0.15em",
              color: "rgba(212,220,232,0.4)",
            }}
          >
            Photography · Ethan Duval
          </span>
        </div>
      </motion.div>

      {/* Star coordinates bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, delay: 1 }}
        style={{
          position: "absolute",
          bottom: "2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "3px",
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "8px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(212,220,232,0.2)",
          }}
        >
          α Carinae · Canopus
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "8px",
            letterSpacing: "0.1em",
            color: "rgba(212,220,232,0.12)",
          }}
        >
          06h 23m 57s · −52° 41′ 44″
        </span>
      </motion.div>
    </div>
  );
}

// ─── Section label with ScrambleText ─────────────────────────────────────────

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
        color: "#C9A96E",
        opacity: 0.8,
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

// ─── Magnetic button ──────────────────────────────────────────────────────────

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

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={onMouseMove}
      onMouseLeave={() => {
        bx.set(0);
        by.set(0);
      }}
      style={{ x: bx, y: by, ...extraStyle }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {children}
    </motion.button>
  );
}

// ─── Input style ──────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "none",
  borderBottom: "0.5px solid rgba(212,220,232,0.15)",
  padding: "0.6rem 0",
  color: "#D4DCE8",
  fontFamily: "var(--font-mono)",
  fontSize: "13px",
  outline: "none",
  transition: "border-color 0.2s",
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function ContactClient() {
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
        {/* ── Left: Logo + spotlight ── */}
        <LogoPanel />

        {/* ── Right: Form ── */}
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
                    transition={{ duration: 0.7 }}
                  >
                    <p
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "9px",
                        letterSpacing: "0.25em",
                        textTransform: "uppercase",
                        color: "#C9A96E",
                        opacity: 0.8,
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
                            background:
                              subject === s
                                ? "rgba(201,169,110,0.1)"
                                : "transparent",
                            border: `0.5px solid ${subject === s ? "rgba(201,169,110,0.5)" : "rgba(212,220,232,0.12)"}`,
                            color:
                              subject === s
                                ? "#C9A96E"
                                : "rgba(212,220,232,0.4)",
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
                            color: "rgba(212,220,232,0.3)",
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
                              "rgba(212,220,232,0.15)")
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
                            color: "rgba(212,220,232,0.3)",
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
                              "rgba(212,220,232,0.15)")
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
                          color: "rgba(212,220,232,0.3)",
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
                            "rgba(212,220,232,0.15)")
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
