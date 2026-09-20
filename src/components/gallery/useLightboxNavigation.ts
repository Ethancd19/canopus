"use client";

import { useEffect, useRef } from "react";
import type { PointerEvent } from "react";

export const SWIPE_THRESHOLD_PX = 60;

export function useLightboxNavigation({
  count, index, onNavigate, onClose,
}: { count: number; index: number; onNavigate: (i: number) => void; onClose: () => void }) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const prev = () => { if (count > 1) onNavigate((index - 1 + count) % count); };
  const next = () => { if (count > 1) onNavigate((index + 1) % count); };

  const latest = useRef({ prev, next, onClose });
  useEffect(() => { latest.current = { prev, next, onClose }; });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") latest.current.next();
      else if (e.key === "ArrowLeft") latest.current.prev();
      else if (e.key === "Escape") latest.current.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onPointerDown = (e: PointerEvent) => { start.current = { x: e.clientX, y: e.clientY }; };
  const onPointerUp = (e: PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) next(); else prev();
  };
  return { prev, next, onPointerDown, onPointerUp };
}
