"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listPhotos, orderPhotos, type Photo } from "@/lib/admin-api";

/** Sorts featured photos by `order` ascending, then `createdAt` ascending as a tiebreak. */
function sortFeatured(photos: Photo[]): Photo[] {
  return photos
    .filter((p) => p.featured)
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
}

/**
 * Loads featured photos (sorted by `order`, then `createdAt`) and lets the
 * caller reorder them client-side via `move(ids)` before committing with
 * `save()`, which posts the new order and reloads from the server. `reset()`
 * discards the pending reorder and restores the last-loaded order.
 *
 * `loading` is only ever true for the initial load - a post-save refetch
 * uses the separate `refreshing` flag instead, so the list (and the ids the
 * user was just looking at) stay mounted instead of flashing to the
 * "Loading photos" state on every save.
 */
export function useFeaturedOrder() {
  // The last-loaded-from-server order; the working order in progress is
  // `ids` below. Named `baseline` (not `photos`) so it can't be confused
  // with the reordered rows this hook returns as `photos`.
  const [baseline, setBaseline] = useState<Photo[]>([]);
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baselineRef = useRef<Photo[]>(baseline);
  useEffect(() => {
    baselineRef.current = baseline;
  }, [baseline]);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchPhotos = useCallback(async () => {
    const result = await listPhotos();
    if (!mountedRef.current) return;
    if (result.ok) {
      const featured = sortFeatured(result.photos);
      setBaseline(featured);
      setIds(featured.map((p) => p.id));
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

  /** Same refetch as `reload()`, but signals via `refreshing` instead of
   * `loading` so a mounted list isn't unmounted mid-refresh. */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    await fetchPhotos();
    if (mountedRef.current) setRefreshing(false);
  }, [fetchPhotos]);

  const move = useCallback((nextIds: string[]) => {
    setIds(nextIds);
  }, []);

  const reset = useCallback(() => {
    setIds(baselineRef.current.map((p) => p.id));
    setError(null);
  }, []);

  const dirty = ids.length === baseline.length && ids.some((id, i) => id !== baseline[i]?.id);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    const result = await orderPhotos(ids);
    if (result.ok) {
      await refresh();
    } else {
      setError(result.error || "Couldn't save the order.");
    }
    if (mountedRef.current) setSaving(false);
    return result;
  }, [ids, refresh]);

  const rows = ids
    .map((id) => baseline.find((p) => p.id === id))
    .filter((p): p is Photo => p !== undefined);

  return { photos: rows, ids, loading, refreshing, saving, error, dirty, move, save, reset, reload };
}
