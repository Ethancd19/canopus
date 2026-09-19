"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { listPhotos, type Photo } from "@/lib/admin-api";
import { photoSrc } from "@/lib/photo-url";

type AddResult = { ok: boolean; error?: string };

type Props = {
  open: boolean;
  onClose: () => void;
  /** Ids already in the collection - excluded from the pickable list. */
  excludeIds: string[];
  /**
   * Returning `{ ok: false }` keeps the drawer open (with `error` shown
   * below the search box) instead of closing it, so a failed add doesn't
   * silently lose the user's selection.
   */
  onAdd: (ids: string[]) => AddResult | void | Promise<AddResult | void>;
};

function thumbStyle(photo: Photo) {
  return photo.blurDataUrl ? { backgroundImage: `url(${photo.blurDataUrl})` } : undefined;
}

/**
 * Drawer listing every library photo not already a member, with a search box
 * and checkboxes. Loads the library fresh each time it opens (rather than on
 * mount) so a photo added to the library while the collection page sits open
 * still shows up.
 */
export function PhotoPicker({ open, onClose, excludeIds, onAdd }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(open);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  // Adjusting state in response to a prop change (rather than synchronizing
  // with an external system) belongs during render, not in an effect - see
  // PhotoDrawer.tsx and https://react.dev/learn/you-might-not-need-an-effect.
  // The `open` effect below is left to do only the one thing an effect is
  // for here: kicking off (and cleaning up) the async fetch.
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setSearch("");
      setSelected(new Set());
      setError(null);
      setLoading(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const result = await listPhotos();
      if (cancelled) return;
      if (result.ok) {
        setPhotos(result.photos);
        setError(null);
      } else {
        setError(result.error || "Couldn't load photos.");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const excluded = new Set(excludeIds);
  const q = search.trim().toLowerCase();
  const available = photos
    .filter((photo) => !excluded.has(photo.id))
    .filter((photo) => {
      if (!q) return true;
      const haystack = [photo.title, ...photo.tags].join(" ").toLowerCase();
      return haystack.includes(q);
    });

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAdd = async () => {
    if (selected.size === 0) return;
    setAdding(true);
    const result = await onAdd([...selected]);
    setAdding(false);
    if (result && !result.ok) {
      setError(result.error || "Couldn't add photos.");
    }
  };

  const footer = (
    <div className="flex justify-end">
      <Button
        variant="primary"
        size="sm"
        disabled={selected.size === 0}
        loading={adding}
        onClick={() => void handleAdd()}
      >
        Add {selected.size} {selected.size === 1 ? "photo" : "photos"}
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={onClose} title="Add photos" footer={footer}>
      <div className="flex flex-col gap-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search photos"
          aria-label="Search photos"
        />

        {error && <p className="font-mono text-[12px] text-danger">{error}</p>}

        {loading ? (
          <p className="font-mono text-[13px] text-muted">Loading photos</p>
        ) : available.length === 0 ? (
          <p className="font-mono text-[13px] text-muted">No photos match.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-text/10">
            {available.map((photo) => (
              <li key={photo.id}>
                <label className="flex items-center gap-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-ice"
                    checked={selected.has(photo.id)}
                    onChange={() => toggle(photo.id)}
                    aria-label={`Select ${photo.title}`}
                  />
                  <div
                    className="h-12 w-16 shrink-0 overflow-hidden rounded-sm bg-navy-light bg-cover bg-center"
                    style={thumbStyle(photo)}
                  >
                    <img src={photoSrc(photo, 320)} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </div>
                  <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-text">{photo.title}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Drawer>
  );
}
