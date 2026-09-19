"use client";

import { Reorder, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { useFeaturedOrder } from "@/components/admin/useFeaturedOrder";
import { photoSrc } from "@/lib/photo-url";
import type { Photo } from "@/lib/admin-api";

function thumbStyle(photo: Photo) {
  return photo.blurDataUrl ? { backgroundImage: `url(${photo.blurDataUrl})` } : undefined;
}

export function FeaturedOrder() {
  const { photos, ids, loading, refreshing, saving, error, dirty, move, save, reset } = useFeaturedOrder();
  const reducedMotion = useReducedMotion();

  return (
    <div className="flex flex-col gap-6">
      <p className="font-mono text-[12px] text-muted">
        Drag to set the order photos appear on the home page.
      </p>

      {error && <p className="font-mono text-[12px] text-danger">{error}</p>}

      {loading ? (
        <p className="font-mono text-[13px] text-muted">Loading photos</p>
      ) : photos.length === 0 ? (
        <p className="font-mono text-[13px] text-muted">
          No featured photos yet. Mark photos as featured in the library.
        </p>
      ) : (
        <>
          <Reorder.Group axis="y" values={ids} onReorder={move} className="flex flex-col">
            {photos.map((photo, index) => (
              <Reorder.Item
                key={photo.id}
                value={photo.id}
                // Do NOT pass `layout={false}` here: layout/projection is how
                // Reorder.Item measures and registers each item's position,
                // which is what makes dragging actually reorder the list -
                // disabling it would let items visually move but never swap.
                // Reduced motion is instead honored by zeroing the layout
                // transition's duration, which keeps measurement alive but
                // skips the animated tween.
                transition={reducedMotion ? { layout: { duration: 0 } } : undefined}
                className="flex cursor-grab items-center gap-4 border-b border-text/10 py-3 active:cursor-grabbing"
              >
                <span className="w-6 shrink-0 font-mono text-[12px] text-faint">{index + 1}</span>
                <div
                  className="h-16 w-24 shrink-0 overflow-hidden rounded-sm bg-navy-light bg-cover bg-center"
                  style={thumbStyle(photo)}
                >
                  <img
                    src={photoSrc(photo, 320)}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    draggable={false}
                  />
                </div>
                <p className="truncate font-serif text-[15px] font-light text-text">{photo.title}</p>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              disabled={!dirty}
              loading={saving || refreshing}
              onClick={() => void save()}
            >
              Save order
            </Button>
            <Button variant="secondary" size="md" disabled={!dirty || saving || refreshing} onClick={reset}>
              Reset
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
