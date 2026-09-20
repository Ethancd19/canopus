"use client";

import { motion } from "motion/react";
import { Photo } from "@/types/photo";
import { PhotoCard } from "@/components/gallery/PhotoCard";
import { GALLERY_BREAKPOINTS as B, GALLERY_COLUMNS as C, GALLERY_GAP } from "@/lib/gallery-layout";

export function GalleryGrid({
  photos,
  onOpen,
}: {
  photos: Photo[];
  onOpen: (index: number, el: HTMLElement) => void;
}) {
  return (
    <motion.div key="grid" layout style={{ columns: `var(--gallery-cols, ${C.desktop})`, columnGap: GALLERY_GAP }}>
      <style>{`
        @media (min-width: ${B.wide}px)   { :root { --gallery-cols: ${C.wide}; } }
        @media (max-width: ${B.tablet}px) { :root { --gallery-cols: ${C.tablet}; } }
        @media (max-width: ${B.phone}px)  { :root { --gallery-cols: ${C.phone}; } }
        [data-photo-card]:focus-visible { outline: 1px solid rgba(212,220,232,0.35); outline-offset: 2px; }
      `}</style>
      {photos.map((photo, i) => (
        <div key={photo.id} style={{ marginBottom: GALLERY_GAP, breakInside: "avoid" }}>
          <PhotoCard photo={photo} index={i} onClick={(p, el) => onOpen(i, el)} />
        </div>
      ))}
    </motion.div>
  );
}
