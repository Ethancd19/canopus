"use client";

import { motion } from "motion/react";
import { Photo } from "@/types/photo";
import { PhotoCard } from "@/components/gallery/PhotoCard";
import { GALLERY_GAP } from "@/lib/gallery-layout";
import { useColumnCount } from "@/components/gallery/useColumnCount";
import { distributeMasonry } from "@/lib/masonry";

export function GalleryGrid({
  photos,
  onOpen,
}: {
  photos: Photo[];
  onOpen: (index: number, el: HTMLElement) => void;
}) {
  const columns = useColumnCount();
  const cols = distributeMasonry(photos, columns);

  return (
    <motion.div key="grid" layout style={{ display: "flex", gap: GALLERY_GAP, alignItems: "flex-start" }}>
      <style>{`
        [data-photo-card]:focus-visible { outline: 1px solid rgba(212,220,232,0.35); outline-offset: 2px; }
      `}</style>
      {cols.map((column, colIndex) => (
        <div
          key={colIndex}
          style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: GALLERY_GAP }}
        >
          {column.map(({ item: photo, index }) => (
            <PhotoCard key={photo.id} photo={photo} index={index} onClick={(p, el) => onOpen(index, el)} />
          ))}
        </div>
      ))}
    </motion.div>
  );
}
