"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Image from "next/image";
import { Photo } from "@/types/photo";
import { FORMAT_LABELS } from "@/components/gallery/constants";
import { ExifBar } from "@/components/gallery/ExifBar";
import imageLoader from "@/lib/image-loader";
import { GALLERY_SIZES } from "@/lib/gallery-layout";

export function PhotoCard({
  photo,
  index,
  onClick,
}: {
  photo: Photo;
  index: number;
  onClick: (p: Photo, el: HTMLElement) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: reduced ? 0 : 0.5,
        delay: reduced ? 0 : index * 0.035,
        ease: [0.4, 0, 0.2, 1],
      }}
      layout
      data-photo-card
      role="button"
      tabIndex={0}
      aria-label={`Open ${photo.title}`}
      onClick={(e) => onClick(photo, e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(photo, e.currentTarget);
        }
      }}
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
          position: "relative",
        }}
      >
        <Image
          loader={imageLoader}
          src={photo.storageKey}
          alt={photo.title}
          width={photo.width}
          height={photo.height}
          sizes={GALLERY_SIZES}
          quality={80}
          placeholder={photo.blurDataUrl ? "blur" : "empty"}
          blurDataURL={photo.blurDataUrl ?? undefined}
          draggable={false}
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            transition: "transform 0.6s ease",
            transform: hovered ? "scale(1.03)" : "scale(1)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "0.75rem",
            right: "0.75rem",
            fontFamily: "var(--font-mono)",
            fontSize: "8px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(212,220,232,0.6)",
            background: "rgba(14,24,36,0.5)",
            padding: "0.2rem 0.5rem",
            backdropFilter: "blur(4px)",
            zIndex: 5,
          }}
        >
          {FORMAT_LABELS[photo.format]}
        </div>
        <AnimatePresence>
          {hovered && <ExifBar photo={photo} />}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
