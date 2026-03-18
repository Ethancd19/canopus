"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react";

const links = [
  { label: "Work", href: "/work" },
  { label: "Behind", href: "/behind" },
  { label: "Contact", href: "/contact" },
];

export default function Nav({ visible = true }: { visible?: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: mobile ? "1.25rem 1.5rem" : "1.75rem 3rem",
          mixBlendMode: "difference",
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "18px",
            fontWeight: 300,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "#fff",
          }}
        >
          Canopus
        </Link>

        {/* Desktop links */}
        {!mobile && (
          <nav style={{ display: "flex", gap: "2.5rem", alignItems: "center" }}>
            {links.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: pathname === href ? "#fff" : "rgba(255,255,255,0.45)",
                  transition: "color 0.2s",
                }}
              >
                {label}
              </Link>
            ))}
          </nav>
        )}

        {/* Mobile hamburger */}
        {mobile && (
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: "5px",
              padding: "4px",
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  display: "block",
                  width: "22px",
                  height: "1px",
                  background: "#fff",
                  transition: "all 0.3s ease",
                  transform: menuOpen
                    ? i === 0
                      ? "translateY(6px) rotate(45deg)"
                      : i === 2
                        ? "translateY(-6px) rotate(-45deg)"
                        : "scaleX(0)"
                    : "none",
                  opacity: menuOpen && i === 1 ? 0 : 1,
                }}
              />
            ))}
          </button>
        )}
      </motion.header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobile && menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setMenuOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 40,
                background: "rgba(8,10,12,0.8)",
                backdropFilter: "blur(4px)",
              }}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                bottom: 0,
                zIndex: 45,
                width: "260px",
                background: "var(--black-mid)",
                borderLeft: "0.5px solid var(--border)",
                padding: "5rem 2rem 2rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
              }}
            >
              <div
                style={{
                  fontSize: "9px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--slate-dim)",
                  marginBottom: "1rem",
                }}
              >
                Navigation
              </div>
              {links.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  style={{
                    fontSize: "13px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: pathname === href ? "var(--white)" : "var(--slate)",
                    padding: "0.85rem 1rem",
                    borderLeft:
                      pathname === href
                        ? "1px solid var(--white)"
                        : "1px solid transparent",
                    transition: "all 0.2s",
                    display: "block",
                  }}
                >
                  {label}
                </Link>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
