"use client";

import { useRef, useState } from "react";
import { ALL_FORMATS, CHEEKY_MESSAGES, EMPTY_MESSAGES, FORMAT_LABELS, pickRandom } from "@/components/gallery/constants";
import type { Photo } from "@/types/photo";

function matches(p: Photo, format: string, genre: string): boolean {
  const fmtMatch = format === "All" || FORMAT_LABELS[p.format] === format;
  const genreMatch = genre === "All" || p.tags.map((t) => t.toLowerCase()).includes(genre.toLowerCase());
  return fmtMatch && genreMatch;
}

export function useGalleryFilter(photos: Photo[]) {
  const [activeFormat, setActiveFormat] = useState<string>(ALL_FORMATS[0]);
  const [activeGenre, setActiveGenre] = useState<string>("All");
  const [emptyMessage, setEmptyMessage] = useState<string>(EMPTY_MESSAGES[0]);
  const historyRef = useRef<string[]>([EMPTY_MESSAGES[0]]);
  const consecutiveEmptyRef = useRef(0);

  const filtered = photos.filter((p) => matches(p, activeFormat, activeGenre));

  const afterChange = (format: string, genre: string) => {
    const empty = !photos.some((p) => matches(p, format, genre));
    if (!empty) {
      consecutiveEmptyRef.current = 0;
      return;
    }
    consecutiveEmptyRef.current += 1;
    const pool = consecutiveEmptyRef.current >= 2 ? CHEEKY_MESSAGES : EMPTY_MESSAGES;
    const msg = pickRandom(pool, historyRef.current, 3);
    historyRef.current = [...historyRef.current, msg];
    setEmptyMessage(msg);
  };

  const setFormat = (f: string) => { setActiveFormat(f); afterChange(f, activeGenre); };
  const setGenre = (g: string) => { setActiveGenre(g); afterChange(activeFormat, g); };

  return { filtered, activeFormat, activeGenre, setFormat, setGenre, emptyMessage };
}
