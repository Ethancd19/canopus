"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addCollectionPhotos,
  deleteCollection,
  getCollection,
  patchCollection,
  removeCollectionPhotos,
  setCollectionPhotos,
  type Collection,
  type CollectionPhotoWithPhoto,
  type CollectionPhotosResult,
  type DeleteCollectionResult,
  type Photo,
  type PatchCollectionInput,
} from "@/lib/admin-api";

type Baseline = Collection & { cover: Photo | null };

type DraftFields = {
  title: string;
  description: string;
  published: boolean;
  coverId: string | null;
};

type SaveResult = { ok: true } | { ok: false; error?: string };

/** The exact message `GET /api/admin/collections/[id]` sends for a missing row (see `apiError("collection not found", 404)`). */
const NOT_FOUND_MESSAGE = "collection not found";

function draftFromBaseline(baseline: Baseline): DraftFields {
  return {
    title: baseline.title,
    description: baseline.description ?? "",
    published: baseline.published,
    coverId: baseline.coverId,
  };
}

type FetchedCollection = { collection: Baseline; photos: CollectionPhotoWithPhoto[] };

/**
 * Loads one collection and its ordered members, and lets the caller edit
 * fields and reorder/add/remove members before committing.
 *
 * Membership changes (`addPhotos`, `removePhoto`) hit the server immediately
 * and then refetch via `refreshMerging()` - like `useFeaturedOrder`, the
 * refetch uses `refreshing` (not `loading`) so the page stays mounted. Unlike
 * a plain reload, that refetch *merges* rather than replaces: any field edit
 * that was already dirty before the membership change survives it (re-applied
 * on top of the freshly-fetched baseline), and a manually-dragged member
 * order keeps its relative order for members that still exist, with any
 * newly-added members appended at the end. Only a successful `save()` or an
 * explicit `reset()` are allowed to fully replace the draft with the server's
 * values - those are the only two places the user has said "discard my
 * pending edits" (implicitly, by committing them, or explicitly).
 */
export function useCollection(id: string) {
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [baselineMembers, setBaselineMembers] = useState<CollectionPhotoWithPhoto[]>([]);
  const [draft, setDraft] = useState<DraftFields>({ title: "", description: "", published: false, coverId: null });
  const [memberIds, setMemberIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Mirrored on every render so `refreshMerging` (below) can read the
  // in-flight draft/order at the moment it's called without needing them in
  // its own dependency array - keeping it (and the add/remove/save callbacks
  // that depend on it) from being recreated on every keystroke or drag.
  const baselineRef = useRef(baseline);
  useEffect(() => {
    baselineRef.current = baseline;
  }, [baseline]);
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  const memberIdsRef = useRef(memberIds);
  useEffect(() => {
    memberIdsRef.current = memberIds;
  }, [memberIds]);
  const baselineMembersRef = useRef(baselineMembers);
  useEffect(() => {
    baselineMembersRef.current = baselineMembers;
  }, [baselineMembers]);

  /** Fetches the collection and updates `baseline`/`baselineMembers`/`error`/`notFound` only - never touches `draft` or `memberIds`. */
  const fetchCollection = useCallback(async (): Promise<FetchedCollection | null> => {
    const result = await getCollection(id);
    if (!mountedRef.current) return null;
    if (result.ok) {
      setBaseline(result.collection);
      setBaselineMembers(result.photos);
      setError(null);
      setNotFound(false);
      return { collection: result.collection, photos: result.photos };
    } else if (result.error === NOT_FOUND_MESSAGE) {
      setNotFound(true);
    } else {
      setError(result.error || "Couldn't load collection.");
    }
    return null;
  }, [id]);

  /** Full replace of `draft`/`memberIds` from a fetch result - only for the initial load and a successful `save()`. */
  const applyFullReplace = useCallback((data: FetchedCollection) => {
    setDraft(draftFromBaseline(data.collection));
    setMemberIds(data.photos.map((p) => p.photoId));
  }, []);

  useEffect(() => {
    void (async () => {
      const data = await fetchCollection();
      if (mountedRef.current) {
        if (data) applyFullReplace(data);
        setLoading(false);
      }
    })();
  }, [fetchCollection, applyFullReplace]);

  /**
   * Refetches after a membership change (`addPhotos`/`removePhoto`),
   * re-applying whatever was already dirty in `draft`/`memberIds` on top of
   * the new baseline instead of discarding it. See the hook's top comment.
   */
  const refreshMerging = useCallback(async () => {
    const prevBaseline = baselineRef.current;
    const prevDraft = draftRef.current;
    const prevMemberIds = memberIdsRef.current;
    const prevBaselineOrder = baselineMembersRef.current.map((m) => m.photoId);

    setRefreshing(true);
    const data = await fetchCollection();
    if (mountedRef.current && data) {
      const dirtyFieldDiff: Partial<DraftFields> = {};
      if (prevBaseline) {
        if (prevDraft.title !== prevBaseline.title) dirtyFieldDiff.title = prevDraft.title;
        if (prevDraft.description !== (prevBaseline.description ?? "")) dirtyFieldDiff.description = prevDraft.description;
        if (prevDraft.published !== prevBaseline.published) dirtyFieldDiff.published = prevDraft.published;
        if (prevDraft.coverId !== prevBaseline.coverId) dirtyFieldDiff.coverId = prevDraft.coverId;
      }
      setDraft({ ...draftFromBaseline(data.collection), ...dirtyFieldDiff });

      const newOrderIds = data.photos.map((p) => p.photoId);
      const orderWasDirty =
        prevMemberIds.length !== prevBaselineOrder.length ||
        prevMemberIds.some((mid, i) => mid !== prevBaselineOrder[i]);
      if (orderWasDirty) {
        // Keep the user's relative order for members that survived the
        // membership change; anything new (just added) goes at the end.
        const newSet = new Set(newOrderIds);
        const kept = prevMemberIds.filter((mid) => newSet.has(mid));
        const keptSet = new Set(kept);
        const appended = newOrderIds.filter((mid) => !keptSet.has(mid));
        setMemberIds([...kept, ...appended]);
      } else {
        setMemberIds(newOrderIds);
      }
    }
    if (mountedRef.current) setRefreshing(false);
  }, [fetchCollection]);

  const setField = useCallback((partial: Partial<DraftFields>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  }, []);

  const move = useCallback((nextIds: string[]) => {
    setMemberIds(nextIds);
  }, []);

  const reset = useCallback(() => {
    if (!baseline) return;
    setDraft(draftFromBaseline(baseline));
    setMemberIds(baselineMembers.map((m) => m.photoId));
    setError(null);
  }, [baseline, baselineMembers]);

  const baselineOrderIds = baselineMembers.map((m) => m.photoId);
  const fieldsDirty = baseline
    ? draft.title !== baseline.title ||
      draft.description !== (baseline.description ?? "") ||
      draft.published !== baseline.published ||
      draft.coverId !== baseline.coverId
    : false;
  const orderDirty =
    memberIds.length !== baselineOrderIds.length || memberIds.some((mid, i) => mid !== baselineOrderIds[i]);
  const dirty = fieldsDirty || orderDirty;

  const save = useCallback(async (): Promise<SaveResult> => {
    if (!baseline) return { ok: false, error: "Collection not loaded." };
    setSaving(true);
    setError(null);

    const patch: PatchCollectionInput = {};
    if (draft.title !== baseline.title) patch.title = draft.title;
    if (draft.description !== (baseline.description ?? "")) patch.description = draft.description;
    if (draft.published !== baseline.published) patch.published = draft.published;
    if (draft.coverId !== baseline.coverId) patch.coverId = draft.coverId;

    let result: { ok: boolean; error?: string } = { ok: true };
    if (Object.keys(patch).length > 0) {
      result = await patchCollection(id, patch);
    }

    if (result.ok) {
      // Refetch *before* deciding on the member-order PUT - not after, as a
      // plain reload would. The server's membership may have changed since
      // this hook last loaded (e.g. a bulk "Add to collection" from the
      // Library), and PUTting the stale local `memberIds` as the complete
      // membership would silently drop anything added there. Merge: keep
      // the local (possibly just-reordered) relative order for members that
      // still exist server-side, and append anything server-side that isn't
      // in the local list yet, in the server's order - then only PUT if
      // that merge actually differs from what the server already has.
      //
      // This refetch also updates `baseline` (a side effect of
      // `fetchCollection`) to the server's current fields immediately after
      // a successful patch above, so if the PUT below fails, `baseline`
      // (and therefore `reset()`) reflects what the server actually has -
      // only the still-unsaved order stays dirty - instead of pointing at
      // stale pre-save data.
      if (mountedRef.current) setRefreshing(true);
      const fresh = await fetchCollection();
      if (mountedRef.current) setRefreshing(false);

      if (mountedRef.current && fresh) {
        const serverIds = fresh.photos.map((p) => p.photoId);
        const serverSet = new Set(serverIds);
        const kept = memberIds.filter((mid) => serverSet.has(mid));
        const keptSet = new Set(kept);
        const merged = [...kept, ...serverIds.filter((mid) => !keptSet.has(mid))];
        const orderChanged = merged.length !== serverIds.length || merged.some((mid, i) => mid !== serverIds[i]);

        if (orderChanged) {
          result = await setCollectionPhotos(id, merged);
        }

        if (result.ok) {
          // Success: `merged` (equal to `serverIds` when no PUT was needed)
          // is the new server truth - fully replace rather than merge (see
          // the hook's top comment).
          const photoById = new Map(fresh.photos.map((p) => [p.photoId, p]));
          const mergedMembers = merged
            .map((mid) => photoById.get(mid))
            .filter((m): m is CollectionPhotoWithPhoto => m !== undefined);
          setDraft(draftFromBaseline(fresh.collection));
          setBaselineMembers(mergedMembers);
        }
        // Whether or not the PUT succeeded, the rendered list must include
        // anything the server gained meanwhile: `baselineMembers` was just
        // refreshed from `fresh`, so a stale `memberIds` would silently hide
        // those members. On failure this leaves the order dirty against the
        // server's order, which is exactly what "Save changes" should retry.
        setMemberIds(merged);
      }
    }

    if (mountedRef.current) {
      if (!result.ok) setError(result.error || "Couldn't save changes.");
      setSaving(false);
    }
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  }, [id, baseline, draft, memberIds, fetchCollection]);

  const addPhotos = useCallback(
    async (ids: string[]): Promise<CollectionPhotosResult> => {
      setError(null);
      const result = await addCollectionPhotos(id, ids);
      if (result.ok) {
        await refreshMerging();
      } else {
        setError(result.error || "Couldn't add photos.");
      }
      return result;
    },
    [id, refreshMerging],
  );

  const removePhoto = useCallback(
    async (photoId: string): Promise<CollectionPhotosResult> => {
      setError(null);
      const wasCover = draftRef.current.coverId === photoId;
      const result = await removeCollectionPhotos(id, [photoId]);
      if (!result.ok) {
        setError(result.error || "Couldn't remove photo.");
        return result;
      }
      if (wasCover) {
        const coverResult = await patchCollection(id, { coverId: null });
        if (!coverResult.ok) {
          setError(coverResult.error || "Couldn't clear the cover.");
        } else {
          // Clear it locally too, and - since `draftRef` only mirrors
          // `draft` via an effect that hasn't necessarily flushed yet -
          // update the ref itself right away. Otherwise `refreshMerging`
          // (below) could snapshot the stale, still-cover-pointing-at-the-
          // just-removed-photo draft and re-apply it on top of the freshly
          // cleared server value.
          setField({ coverId: null });
          draftRef.current = { ...draftRef.current, coverId: null };
        }
      }
      await refreshMerging();
      return result;
    },
    [id, refreshMerging, setField],
  );

  const remove = useCallback(async (): Promise<DeleteCollectionResult> => {
    setError(null);
    const result = await deleteCollection(id);
    if (!result.ok) setError(result.error || "Couldn't delete collection.");
    return result;
  }, [id]);

  const members = memberIds
    .map((photoId) => baselineMembers.find((m) => m.photoId === photoId))
    .filter((m): m is CollectionPhotoWithPhoto => m !== undefined);

  const coverPhoto = draft.coverId ? members.find((m) => m.photoId === draft.coverId)?.photo ?? null : null;

  const collection = baseline
    ? {
        ...baseline,
        title: draft.title,
        description: draft.description,
        published: draft.published,
        coverId: draft.coverId,
        cover: coverPhoto,
      }
    : null;

  return {
    collection,
    members,
    loading,
    refreshing,
    saving,
    error,
    notFound,
    dirty,
    setField,
    move,
    save,
    reset,
    addPhotos,
    removePhoto,
    remove,
  };
}
