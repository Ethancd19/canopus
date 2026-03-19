"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ScrambleText } from "motion-plus/react";
import { useRouter } from "next/navigation";

// ─── Starfield ────────────────────────────────────────────────────────────────

function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const stars = Array.from({ length: 320 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.3 + 0.2,
      opacity: Math.random() * 0.6 + 0.15,
      speed: Math.random() * 0.12 + 0.02,
      phase: Math.random() * Math.PI * 2,
    }));

    let frame: number;
    let t = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.007;

      for (const s of stars) {
        s.y -= s.speed;
        if (s.y < 0) {
          s.y = canvas.height;
          s.x = Math.random() * canvas.width;
        }
        const twinkle = s.opacity * (0.55 + 0.45 * Math.sin(t * 1.8 + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(230,238,255,${twinkle})`;
        ctx.fill();
      }

      const cx = canvas.width * 0.72;
      const cy = canvas.height * 0.26;
      const pulse = 0.75 + 0.25 * Math.sin(t * 1.4);

      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 22);
      glow.addColorStop(0, `rgba(190,215,255,${pulse})`);
      glow.addColorStop(0.4, `rgba(170,200,255,${pulse * 0.35})`);
      glow.addColorStop(1, "rgba(170,200,255,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,235,255,${pulse})`;
      ctx.fill();

      frame = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
    />
  );
}

// ─── Cursor trail ─────────────────────────────────────────────────────────────

type Dot = { x: number; y: number; id: number };

function CursorTrail() {
  const [dots, setDots] = useState<Dot[]>([]);
  const idRef = useRef(0);
  const lastRef = useRef({ x: 0, y: 0, t: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const now = Date.now();
      const dx = e.clientX - lastRef.current.x;
      const dy = e.clientY - lastRef.current.y;
      const dt = Math.max(now - lastRef.current.t, 1);
      const vel = Math.sqrt(dx * dx + dy * dy) / dt;

      if (vel > 0.25) {
        const count = Math.min(Math.floor(vel * 2), 6);
        const newDots: Dot[] = Array.from({ length: count }, () => ({
          x: e.clientX + (Math.random() - 0.5) * 10,
          y: e.clientY + (Math.random() - 0.5) * 10,
          id: idRef.current++,
        }));
        setDots((prev) => [...prev.slice(-50), ...newDots]);
      }

      lastRef.current = { x: e.clientX, y: e.clientY, t: now };
    };

    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <>
      {dots.map((dot) => (
        <motion.div
          key={dot.id}
          initial={{ opacity: 0.9, scale: 1 }}
          animate={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          onAnimationComplete={() =>
            setDots((prev) => prev.filter((d) => d.id !== dot.id))
          }
          style={{
            position: "fixed",
            left: dot.x - 3,
            top: dot.y - 3,
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "rgba(190,215,255,0.85)",
            boxShadow: "0 0 8px rgba(170,200,255,0.7)",
            zIndex: 50,
            pointerEvents: "none",
          }}
        />
      ))}
    </>
  );
}

// ─── Messages ─────────────────────────────────────────────────────────────────

const MESSAGES = [
  "You weren't supposed to find this.",
  "But Canopus has been watching you too.",
  "Second brightest star in the sky.",
  "First to know when you're lost.",
  "Some things are only visible from the southern hemisphere.",
  "You clicked ten times.",
  "It noticed.",
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SecretPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "reveal" | "done">("loading");
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setPhase("reveal"), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== "reveal") return;
    if (msgIdx >= MESSAGES.length - 1) {
      const t = setTimeout(() => setPhase("done"), 2500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setMsgIdx((i) => i + 1), 2400);
    return () => clearTimeout(t);
  }, [phase, msgIdx]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#020408",
        overflow: "hidden",
      }}
    >
      <Starfield />
      <CursorTrail />

      {/* Canopus star label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "reveal" || phase === "done" ? 1 : 0 }}
        transition={{ duration: 2.5, delay: 1.5 }}
        style={{
          position: "fixed",
          top: "calc(26% + 28px)",
          right: "calc(28% - 10px)",
          fontFamily: "var(--font-mono)",
          fontSize: "8px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(190,215,255,0.45)",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        α Carinae · Canopus
      </motion.div>

      {/* Central message area */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <AnimatePresence mode="wait">
          {phase === "reveal" && (
            <motion.div
              key={msgIdx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              style={{ maxWidth: "540px" }}
            >
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(1.2rem, 3vw, 2rem)",
                  fontWeight: 300,
                  fontStyle: "italic",
                  color: "rgba(230,238,255,0.8)",
                  lineHeight: 1.55,
                  letterSpacing: "0.02em",
                }}
              >
                <ScrambleText key={msgIdx}>{MESSAGES[msgIdx]}</ScrambleText>
              </p>
            </motion.div>
          )}

          {phase === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "2.5rem",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(1rem, 2vw, 1.5rem)",
                  fontWeight: 300,
                  fontStyle: "italic",
                  color: "rgba(230,238,255,0.4)",
                  letterSpacing: "0.03em",
                }}
              >
                Now you know.
              </p>

              <motion.button
                onClick={() => router.push("/")}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "9px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  padding: "0.7rem 1.75rem",
                  background: "transparent",
                  border: "0.5px solid rgba(255,255,255,0.15)",
                  color: "rgba(230,238,255,0.35)",
                  cursor: "pointer",
                  transition: "color 0.2s, border-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "rgba(230,238,255,0.9)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "rgba(230,238,255,0.35)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                }}
              >
                Return to the surface
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Coordinates footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.18 }}
        transition={{ duration: 4, delay: 2 }}
        style={{
          position: "fixed",
          bottom: "1.75rem",
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "var(--font-mono)",
          fontSize: "8px",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "#B8C4D0",
          zIndex: 10,
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        06h 23m 57s · −52° 41′ 44″ · −0.74 mag
      </motion.div>
    </div>
  );
}
