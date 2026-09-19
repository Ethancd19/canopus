"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createCollection,
  listCollections,
  type CollectionWithCover,
  type CreateCollectionResult,
} from "@/lib/admin-api";

/**
 * Loads every collection (with its cover photo and member count) for the
 * list page. `create(title)` posts a new collection and reloads the list on
 * success - the caller (the inline "New collection" form) decides what to do
 * with a failure via the returned result.
 */
export function useCollections() {
  const [collections, setCollections] = useState<CollectionWithCover[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchCollections = useCallback(async () => {
    const result = await listCollections();
    if (!mountedRef.current) return;
    if (result.ok) {
      setCollections(result.collections);
      setError(null);
    } else {
      setError(result.error || "Couldn't load collections.");
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchCollections();
      if (mountedRef.current) setLoading(false);
    })();
  }, [fetchCollections]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchCollections();
    if (mountedRef.current) setLoading(false);
  }, [fetchCollections]);

  const create = useCallback(
    async (title: string): Promise<CreateCollectionResult> => {
      const result = await createCollection({ title });
      if (result.ok) {
        await reload();
      }
      return result;
    },
    [reload],
  );

  return { collections, loading, error, reload, create };
}
