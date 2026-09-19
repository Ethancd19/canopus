"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  bulkPhotos,
  deletePhoto,
  listPhotos,
  patchPhoto,
  type BulkPhotosPayload,
  type BulkPhotosResult,
  type DeletePhotoResult,
  type PatchPhotoInput,
  type PatchPhotoResult,
  type Photo,
  type PhotoFormat,
} from "@/lib/admin-api";
import type { BulkAction } from "@/lib/bulk";
import { TAG_OPTIONS } from "@/lib/tagging";

export type FormatFilter = "all" | PhotoFormat;
export type StateFilter = "all" | "drafts" | "published" | "featured" | "untagged";
export type LibraryView = "grid" | "list";
export type BulkMessage = { tone: "ok" | "error"; text: string };

const BULK_ACTION_LABELS: Record<BulkAction, { verb: string; infinitive: string }> = {
  publish: { verb: "Published", infinitive: "publish" },
  unpublish: { verb: "Unpublished", infinitive: "unpublish" },
  addTag: { verb: "Tagged", infinitive: "add tag" },
  removeTag: { verb: "Untagged", infinitive: "remove tag" },
  addToCollection: { verb: "Added", infinitive: "add to collection" },
  removeFromCollection: { verb: "Removed", infinitive: "remove from collection" },
  delete: { verb: "Deleted", infinitive: "delete" },
};

function plural(count: number) {
  return count === 1 ? "photo" : "photos";
}

const VIEW_KEY = "canopus.admin.view";

function loadView(): LibraryView {
  try {
    const stored = localStorage.getItem(VIEW_KEY);
    if (stored === "grid" || stored === "list") return stored;
  } catch {
    // localStorage may be unavailable (private mode, disabled storage, etc.)
  }
  return "grid";
}

function saveView(view: LibraryView) {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    // Best effort only - losing the preference is not fatal.
  }
}

/**
 * Loads every photo row and layers client-side search/format/state
 * filtering, an optimistic edit path (`update`), and the grid/list view
 * preference on top. Mirrors the store-ref pattern in `useUploadQueue`: a
 * ref mirrors the latest `photos` so async actions can read/restore the
 * pre-optimistic snapshot without depending on (and re-creating) callbacks
 * every time the list changes.
 */
export function useLibrary() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [format, setFormat] = useState<FormatFilter>("all");
  const [state, setState] = useState<StateFilter>("all");
  const [view, setViewState] = useState<LibraryView>(() => loadView());

  const photosRef = useRef<Photo[]>(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Selection lives outside `photos` entirely - it tracks ids, not rows, so
  // it survives an optimistic update to an unrelated field. `selectionEpoch`
  // increments every time the selection is cleared (explicit Clear, or a
  // successful bulk action) so a consumer can `key` the bulk bar on it and
  // get a fresh mount - resetting its own pending inputs/confirm state -
  // exactly when the count drops to zero.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectionEpoch, setSelectionEpoch] = useState(0);
  const [bulkMessage, setBulkMessage] = useState<BulkMessage | null>(null);
  const lastSelectedRef = useRef<string | null>(null);

  const clearBulkMessage = useCallback(() => setBulkMessage(null), []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    lastSelectedRef.current = null;
    setSelectionEpoch((n) => n + 1);
  }, []);

  // Split so the mount effect never calls setState synchronously in its own
  // body (only after the `await` below, once the fetch resolves) - `reload`
  // is called from a click handler instead, where that restriction doesn't
  // apply.
  const fetchPhotos = useCallback(async () => {
    const result = await listPhotos();
    if (!mountedRef.current) return;
    if (result.ok) {
      setPhotos(result.photos);
      setError(null);
      // Drop any selected id that no longer exists in the loaded set (e.g.
      // deleted server-side between reloads) - otherwise `selected.size`
      // stays inflated with dead ids and the bulk bar shows a stale count.
      const validIds = new Set(result.photos.map((p) => p.id));
      setSelected((current) => {
        const next = new Set([...current].filter((id) => validIds.has(id)));
        return next.size === current.size ? current : next;
      });
    } else {
      setError(result.error || "Couldn't load photos.");
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchPhotos();
      if (mountedRef.current) setLoading(false);
    })();
  }, [fetchPhotos]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchPhotos();
    if (mountedRef.current) setLoading(false);
  }, [fetchPhotos]);

  const setViewPersisted = useCallback((next: LibraryView) => {
    setViewState(next);
    saveView(next);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return photos.filter((photo) => {
      if (format !== "all" && photo.format !== format) return false;
      if (state === "drafts" && photo.published) return false;
      if (state === "published" && !photo.published) return false;
      if (state === "featured" && !photo.featured) return false;
      if (state === "untagged" && photo.tags.length > 0) return false;
      if (q) {
        const haystack = [photo.title, photo.location ?? "", ...photo.tags].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [photos, search, format, state]);

  // `filteredRef` mirrors `filtered` (same ref pattern as `photosRef`) so
  // shift-range selection can read the on-screen order without depending on
  // (and re-creating) `toggleSelected` every time the filter changes.
  const filteredRef = useRef<Photo[]>(filtered);
  useEffect(() => {
    filteredRef.current = filtered;
  }, [filtered]);

  const toggleSelected = useCallback((id: string, opts: { range?: boolean } = {}) => {
    // A fresh selection edit supersedes whatever the last bulk action said.
    setBulkMessage(null);
    setSelected((current) => {
      const anchor = lastSelectedRef.current;
      if (opts.range && anchor) {
        const ids = filteredRef.current.map((p) => p.id);
        const from = ids.indexOf(anchor);
        const to = ids.indexOf(id);
        if (from !== -1 && to !== -1) {
          const [start, end] = from < to ? [from, to] : [to, from];
          const next = new Set(current);
          for (let i = start; i <= end; i++) next.add(ids[i]);
          lastSelectedRef.current = id;
          return next;
        }
      }
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      lastSelectedRef.current = id;
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setBulkMessage(null);
    setSelected(new Set(filteredRef.current.map((p) => p.id)));
  }, []);

  const bulk = useCallback(
    async (action: BulkAction, payload?: BulkPhotosPayload): Promise<BulkPhotosResult> => {
      const ids = [...selected];
      const result = await bulkPhotos(ids, action, payload);
      const labels = BULK_ACTION_LABELS[action];
      if (result.ok) {
        await reload();
        clearSelection();
        setBulkMessage({ tone: "ok", text: `${labels.verb} ${result.count} ${plural(result.count)}` });
      } else {
        setBulkMessage({ tone: "error", text: `Couldn't ${labels.infinitive}: ${result.error}` });
      }
      return result;
    },
    [selected, reload, clearSelection],
  );

  const allTags = useMemo(() => {
    const set = new Set<string>(TAG_OPTIONS);
    for (const photo of photos) {
      for (const tag of photo.tags) set.add(tag);
    }
    return [...set].sort();
  }, [photos]);

  const update = useCallback(async (id: string, partial: PatchPhotoInput): Promise<PatchPhotoResult> => {
    // Capture only the one row being touched, not the whole array - another
    // row may change (via a concurrent update/remove) while this PATCH is in
    // flight, and a whole-array rollback would clobber that change too.
    const previous = photosRef.current.find((p) => p.id === id);
    setPhotos((current) => current.map((p) => (p.id === id ? ({ ...p, ...partial } as Photo) : p)));
    const result = await patchPhoto(id, partial);
    if (result.ok) {
      setPhotos((current) => current.map((p) => (p.id === id ? result.photo : p)));
    } else if (previous) {
      setPhotos((current) => current.map((p) => (p.id === id ? previous : p)));
    }
    return result;
  }, []);

  const remove = useCallback(async (id: string): Promise<DeletePhotoResult> => {
    const previousIndex = photosRef.current.findIndex((p) => p.id === id);
    const previous = previousIndex === -1 ? undefined : photosRef.current[previousIndex];
    setPhotos((current) => current.filter((p) => p.id !== id));
    const result = await deletePhoto(id);
    if (result.ok) {
      // Drop the deleted id from the selection too - it can no longer be
      // acted on, and leaving it in would inflate the bulk bar's count.
      setSelected((current) => {
        if (!current.has(id)) return current;
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    } else if (previous) {
      setPhotos((current) => {
        const next = [...current];
        next.splice(Math.min(previousIndex, next.length), 0, previous);
        return next;
      });
    }
    return result;
  }, []);

  const togglePublished = useCallback(
    (id: string) => {
      const photo = photosRef.current.find((p) => p.id === id);
      if (!photo) return Promise.resolve({ ok: false, error: "not found" } as const);
      return update(id, { published: !photo.published });
    },
    [update],
  );

  const toggleFeatured = useCallback(
    (id: string) => {
      const photo = photosRef.current.find((p) => p.id === id);
      if (!photo) return Promise.resolve({ ok: false, error: "not found" } as const);
      return update(id, { featured: !photo.featured });
    },
    [update],
  );

  return {
    photos,
    filtered,
    loading,
    error,
    reload,
    search,
    setSearch,
    format,
    setFormat,
    state,
    setState,
    view,
    setView: setViewPersisted,
    allTags,
    update,
    remove,
    togglePublished,
    toggleFeatured,
    selected,
    toggleSelected,
    selectAllFiltered,
    clearSelection,
    selectionEpoch,
    bulk,
    bulkMessage,
    clearBulkMessage,
  };
}
