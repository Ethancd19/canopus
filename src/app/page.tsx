"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "motion/react";
import Nav from "@/components/Nav";

export default function Home() {
  const [introPhase, setIntroPhase] = useState<"name" | "image" | "done">(
    "name",
  );
  const [navVisible, setNavVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const backgroundColor = useTransform(
    scrollYProgress,
    [0, 0.35],
    ["#080A0C", "#F0F2F4"],
  );

  const textColor = useTransform(
    scrollYProgress,
    [0, 0.35],
    ["#F0F2F4", "#080A0C"],
  );

  // Intro sequence timing
  useEffect(() => {
    // Phase 1: name is visible for 2s
    const t1 = setTimeout(() => {
      setIntroPhase("image");
    }, 2000);

    // Phase 2: image bleeds in, scroll hint appears, nav fades in
    const t2 = setTimeout(() => {
      setIntroPhase("done");
      setNavVisible(true);
    }, 3500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <motion.div ref={containerRef} style={{ backgroundColor }}>
      <Nav visible={navVisible} />

      {/* ── Intro ───────────────────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Background image — fades in behind the name */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{
            opacity: introPhase === "image" || introPhase === "done" ? 0.6 : 0,
          }}
          transition={{ duration: 2.5, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url(/intro.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            willChange: "opacity",
          }}
        />

        {/* Dark overlay so name stays readable */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(8,10,12,0.45)",
          }}
        />

        {/* Name */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 2, ease: "easeOut" }}
          style={{
            position: "relative",
            zIndex: 2,
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(4rem, 10vw, 9rem)",
            fontWeight: 300,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "#F0F2F4",
            lineHeight: 1,
          }}
        >
          Canopus
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 2, delay: 0.6, ease: "easeOut" }}
          style={{
            position: "relative",
            zIndex: 2,
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "#F0F2F4",
            marginTop: "1.5rem",
          }}
        >
          Photography &nbsp;·&nbsp; Ethan Duval
        </motion.p>

        {/* Scroll hint */}
        <AnimatePresence>
          {introPhase === "done" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{
                position: "absolute",
                bottom: "2.5rem",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "9px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "rgba(240,242,244,0.5)",
                }}
              >
                Scroll
              </span>
              <motion.div
                animate={{ scaleY: [1, 0.4, 1] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  width: "1px",
                  height: "40px",
                  background: "rgba(240,242,244,0.4)",
                  transformOrigin: "top",
                  willChange: "transform",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ── Gallery section placeholder ─────────────────────────── */}
      <section
        style={{
          minHeight: "100vh",
          padding: "clamp(3rem, 8vw, 6rem) clamp(1.5rem, 5vw, 4rem)",
        }}
      >
        <motion.div style={{ color: textColor }}>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              opacity: 0.5,
            }}
          >
            Selected work
          </p>
        </motion.div>
      </section>
    </motion.div>
  );
}
