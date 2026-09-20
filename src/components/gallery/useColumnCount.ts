"use client";

import { useSyncExternalStore } from "react";
import { GALLERY_BREAKPOINTS, GALLERY_COLUMNS } from "@/lib/gallery-layout";

const PHONE_QUERY = `(max-width: ${GALLERY_BREAKPOINTS.phone}px)`;
const TABLET_QUERY = `(max-width: ${GALLERY_BREAKPOINTS.tablet}px)`;
const WIDE_QUERY = `(min-width: ${GALLERY_BREAKPOINTS.wide}px)`;

function hasMatchMedia(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

function getSnapshot(): number {
  if (!hasMatchMedia()) return GALLERY_COLUMNS.desktop;
  if (window.matchMedia(PHONE_QUERY).matches) return GALLERY_COLUMNS.phone;
  if (window.matchMedia(TABLET_QUERY).matches) return GALLERY_COLUMNS.tablet;
  if (window.matchMedia(WIDE_QUERY).matches) return GALLERY_COLUMNS.wide;
  return GALLERY_COLUMNS.desktop;
}

function getServerSnapshot(): number {
  return GALLERY_COLUMNS.desktop;
}

function subscribe(callback: () => void): () => void {
  if (!hasMatchMedia()) return () => {};
  const lists = [window.matchMedia(PHONE_QUERY), window.matchMedia(TABLET_QUERY), window.matchMedia(WIDE_QUERY)];
  lists.forEach((list) => list.addEventListener("change", callback));
  return () => {
    lists.forEach((list) => list.removeEventListener("change", callback));
  };
}

/** Live column count for the masonry grid, driven by `GALLERY_BREAKPOINTS`. Falls back to
 * the desktop count on the server and in environments without `window.matchMedia`. */
export function useColumnCount(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
