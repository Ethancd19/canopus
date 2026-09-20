"use client";

import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { Photo } from "@/types/photo";
import { useGalleryFilter } from "@/components/gallery/useGalleryFilter";
import { GalleryFilters } from "@/components/gallery/GalleryFilters";
import { EmptyState } from "@/components/gallery/EmptyState";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { Lightbox } from "@/components/gallery/Lightbox";

export default function Gallery({
  photos,
  theme = "dark",
  showFilters = true,
}: {
  photos: Photo[];
  theme?: "dark" | "light";
  showFilters?: boolean;
}) {
  const [active, setActive] = useState<{ index: number; el: HTMLElement | null } | null>(null);
  const { filtered, activeFormat, activeGenre, setFormat, setGenre, emptyMessage } = useGalleryFilter(photos);

  return (
    <>
      {showFilters && (
        <GalleryFilters
          theme={theme}
          activeFormat={activeFormat}
          activeGenre={activeGenre}
          onFormat={setFormat}
          onGenre={setGenre}
        />
      )}

      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <EmptyState key={`empty-${emptyMessage}`} theme={theme} message={emptyMessage} />
        ) : (
          <GalleryGrid key="grid" photos={filtered} onOpen={(index, el) => setActive({ index, el })} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {active && (
          <Lightbox
            photos={filtered}
            index={active.index}
            onClose={() => setActive(null)}
            onNavigate={(index) => setActive({ index, el: active.el })}
            returnFocusTo={active.el}
          />
        )}
      </AnimatePresence>
    </>
  );
}
