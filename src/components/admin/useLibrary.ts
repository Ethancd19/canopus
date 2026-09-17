"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deletePhoto,
  listPhotos,
  patchPhoto,
  type DeletePhotoResult,
  type PatchPhotoInput,
  type PatchPhotoResult,
  type Photo,
  type PhotoFormat,
} from "@/lib/admin-api";
import { TAG_OPTIONS } from "@/lib/tagging";

export type FormatFilter = "all" | PhotoFormat;
export type StateFilter = "all" | "drafts" | "published" | "featured" | "untagged";
export type LibraryView = "grid" | "list";

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
    if (!result.ok && previous) {
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
  };
}
