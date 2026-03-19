"use client";

import { use, useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Gallery from "@/components/Gallery";
import { Photo } from "@/types/photo";

export default function HomeClient({ photos }: { photos: Photo[] }) {
  const router = useRouter();

  const [introPhase, setIntroPhase] = useState<"name" | "image" | "done">(
    "name",
  );
  const [navVisible, setNavVisible] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [launching, setLaunching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const backgroundColor = useTransform(
    scrollYProgress,
    [0, 0.35],
    ["#0E1824", "#B8C4D0"],
  );

  const textColor = useTransform(
    scrollYProgress,
    [0, 0.35],
    ["#B8C4D0", "#0E1824"],
  );

  useEffect(() => {
    const t1 = setTimeout(() => setIntroPhase("image"), 2000);
    const t2 = setTimeout(() => {
      setIntroPhase("done");
      setNavVisible(true);
    }, 3500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const handleTitleClick = () => {
    if (launching) return;
    const next = clickCount + 1;
    setClickCount(next);
    if (next >= 10) {
      setLaunching(true);
      setTimeout(() => {
        router.push("/canopus-is-watching");
      }, 1100);
    }
  };

  const remaining = 10 - clickCount;

  return (
    <motion.div ref={containerRef} style={{ backgroundColor }}>
      <Nav visible={navVisible} />

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

        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(14,24,36,0.45)",
          }}
        />
        <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={
              launching
                ? { opacity: 0, y: -600, scale: 0.4 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            transition={
              launching
                ? { duration: 1.1, ease: [0.4, 0, 1, 1] }
                : { duration: 2, ease: "easeOut" }
            }
            onClick={handleTitleClick}
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(4rem, 10vw, 9rem)",
              fontWeight: 300,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#D4DCE8",
              lineHeight: 1,
              cursor: "default",
              userSelect: "none",
              display: "block",
            }}
          >
            Canopus
          </motion.h1>

          {/* Click counter hint — appears after 3 clicks */}
          <AnimatePresence>
            {clickCount >= 3 && clickCount < 10 && !launching && (
              <motion.p
                key={remaining}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "9px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "rgba(212,220,232,0.35)",
                  marginTop: "0.75rem",
                  userSelect: "none",
                }}
              >
                {remaining === 1 ? "one more…" : `${remaining} more`}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

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
            color: "#D4DCE8",
            marginTop: "1.5rem",
          }}
        >
          Photography &nbsp;·&nbsp; Ethan Duval
        </motion.p>

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
                  color: "rgba(212,220,232,0.5)",
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
                  background: "rgba(212,220,232,0.4)",
                  transformOrigin: "top",
                  willChange: "transform",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section
        style={{
          minHeight: "100vh",
          padding: "clamp(3rem, 8vw, 6rem) clamp(1.5rem, 5vw, 4rem)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.p
            style={{
              color: "var(--copper-light)",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              opacity: 0.7,
              marginBottom: "2.5rem",
            }}
          >
            Selected work
          </motion.p>

          <Gallery photos={photos} />
        </motion.div>
      </section>
    </motion.div>
  );
}
