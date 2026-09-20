"use client";

import { motion } from "motion/react";

export function HomeHero({ visible }: { visible: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 0.6 : 0 }}
      transition={{ duration: 2.5, ease: "easeInOut" }}
      style={{
        position: "absolute",
        inset: 0,
        willChange: "opacity",
      }}
    >
      <picture>
        <source
          type="image/avif"
          srcSet="/hero/intro-1280.avif 1280w, /hero/intro-1920.avif 1920w, /hero/intro-2560.avif 2560w"
          sizes="100vw"
        />
        <source
          type="image/webp"
          srcSet="/hero/intro-1280.webp 1280w, /hero/intro-1920.webp 1920w, /hero/intro-2560.webp 2560w"
          sizes="100vw"
        />
        <img
          src="/hero/intro-1920.jpg"
          srcSet="/hero/intro-1280.jpg 1280w, /hero/intro-1920.jpg 1920w, /hero/intro-2560.jpg 2560w"
          sizes="100vw"
          alt=""
          fetchPriority="high"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      </picture>
    </motion.div>
  );
}
