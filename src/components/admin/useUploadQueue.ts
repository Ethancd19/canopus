"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import exifr from "exifr";
import { mapExif } from "@/lib/exif";
import {
  deletePhoto,
  patchPhoto,
  tagPhoto,
  uploadPhoto,
  type DeletePhotoResult,
  type PatchPhotoInput,
  type Photo,
} from "@/lib/admin-api";

const MAX_CONCURRENT = 3;
const SAVED_FLASH_MS = 1500;

const EXIF_PICK = [
  "Make",
  "Model",
  "LensModel",
  "FocalLength",
  "FNumber",
  "ExposureTime",
  "ISO",
  "DateTimeOriginal",
] as const;

export type QueueItemStatus =
  | "queued"
  | "compressing"
  | "uploading"
  | "tagging"
  | "ready"
  | "published"
  | "failed"
  | "duplicate";

export type QueueItem = {
  localId: string;
  file: File;
  previewUrl: string;
  status: QueueItemStatus;
  error?: string;
  photo?: Photo;
  existingId?: string;
  /** Set once by `uploadAnyway`; keeps forcing the upload through retries. */
  force?: boolean;
  /** True for a moment right after a field edit is saved. */
  saved?: boolean;
};

let localIdCounter = 0;
function nextLocalId(): string {
  localIdCounter += 1;
  return `upload-${localIdCounter}`;
}

/**
 * State machine backing the upload queue UI. Keeps its own mutable store
 * (`storeRef`) so processing can read the latest item state synchronously
 * without waiting on a React re-render; `items` is just the rendered mirror.
 */
export function useUploadQueue() {
  const storeRef = useRef<QueueItem[]>([]);
  const [items, setItems] = useState<QueueItem[]>([]);
  const activeCountRef = useRef(0);
  // Tracks the pending "saved" flash timeout per item so it (and any other
  // timer keyed by localId) can be cleared on unmount instead of firing a
  // state update after the component using this hook is gone.
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const commit = useCallback(() => {
    setItems([...storeRef.current]);
  }, []);

  const patchItem = useCallback(
    (localId: string, patch: Partial<QueueItem>) => {
      storeRef.current = storeRef.current.map((item) =>
        item.localId === localId ? { ...item, ...patch } : item,
      );
      commit();
    },
    [commit],
  );

  const findItem = useCallback(
    (localId: string) => storeRef.current.find((item) => item.localId === localId),
    [],
  );

  const runItem = useCallback(
    async (localId: string) => {
      const item = findItem(localId);
      if (!item) return;

      try {
        patchItem(localId, { status: "compressing" });
        const compressed = await imageCompression(item.file, {
          maxSizeMB: 8,
          maxWidthOrHeight: 4000,
          useWebWorker: true,
          preserveExif: true,
        });

        let exifFields = {};
        try {
          const raw = await exifr.parse(item.file, { pick: EXIF_PICK as unknown as string[] });
          if (raw) exifFields = mapExif(raw);
        } catch {
          // No EXIF available (film scans, screenshots, etc.) - not fatal.
        }

        patchItem(localId, { status: "uploading" });
        const current = findItem(localId);
        const result = await uploadPhoto(compressed, {
          ...exifFields,
          force: current?.force ? "1" : undefined,
        });

        if (!result.ok) {
          if (result.existingId) {
            patchItem(localId, { status: "duplicate", error: result.error, existingId: result.existingId });
          } else {
            patchItem(localId, { status: "failed", error: result.error });
          }
          return;
        }

        patchItem(localId, { status: "tagging", photo: result.photo });

        let finalPhoto = result.photo;
        try {
          const suggestion = await tagPhoto(result.photo.storageKey);
          if (suggestion.ok) {
            const patch: PatchPhotoInput = {};
            if (result.photo.tags.length === 0 && suggestion.tags.length > 0) patch.tags = suggestion.tags;
            if (!result.photo.caption && suggestion.caption) patch.caption = suggestion.caption;
            if (!result.photo.location && suggestion.location) patch.location = suggestion.location;
            if (Object.keys(patch).length > 0) {
              const patched = await patchPhoto(result.photo.id, patch);
              if (patched.ok) finalPhoto = patched.photo;
            }
          }
        } catch {
          // AI tagging failures are non-fatal: the draft still gets its own fields.
        }

        patchItem(localId, { status: "ready", photo: finalPhoto });
      } catch (err) {
        patchItem(localId, { status: "failed", error: err instanceof Error ? err.message : "Upload failed" });
      }
    },
    [findItem, patchItem],
  );

  const pumpRef = useRef<() => void>(() => {});
  const pump = useCallback(() => {
    const claimed = new Set<string>();
    while (activeCountRef.current < MAX_CONCURRENT) {
      const next = storeRef.current.find((item) => item.status === "queued" && !claimed.has(item.localId));
      if (!next) break;
      claimed.add(next.localId);
      activeCountRef.current += 1;
      void runItem(next.localId).finally(() => {
        activeCountRef.current -= 1;
        pumpRef.current();
      });
    }
  }, [runItem]);
  useEffect(() => {
    pumpRef.current = pump;
  }, [pump]);

  // Preview URLs are otherwise only revoked in `remove()`; release whatever
  // is still queued/in-flight when the component using this hook unmounts.
  useEffect(() => {
    return () => {
      for (const item of storeRef.current) {
        try {
          URL.revokeObjectURL(item.previewUrl);
        } catch {
          // Ignore - nothing we can do if revocation fails.
        }
      }
    };
  }, []);

  const add = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      const newItems: QueueItem[] = files.map((file) => ({
        localId: nextLocalId(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "queued",
      }));
      storeRef.current = [...storeRef.current, ...newItems];
      commit();
      // Defer processing to a microtask so callers observe the "queued"
      // state synchronously right after add() before anything starts.
      void Promise.resolve().then(pump);
    },
    [commit, pump],
  );

  const retry = useCallback(
    (localId: string) => {
      patchItem(localId, { status: "queued", error: undefined });
      void Promise.resolve().then(pump);
    },
    [patchItem, pump],
  );

  const uploadAnyway = useCallback(
    (localId: string) => {
      patchItem(localId, { status: "queued", error: undefined, force: true });
      void Promise.resolve().then(pump);
    },
    [patchItem, pump],
  );

  const remove = useCallback(
    async (localId: string) => {
      const item = findItem(localId);
      if (!item) return;
      if (item.photo) {
        let result: DeletePhotoResult;
        try {
          result = await deletePhoto(item.photo.id);
        } catch (err) {
          patchItem(localId, {
            error: `Couldn't remove: ${err instanceof Error ? err.message : "request failed"}`,
          });
          return;
        }
        if (!result.ok) {
          patchItem(localId, { error: `Couldn't remove: ${result.error}` });
          return;
        }
      }
      try {
        URL.revokeObjectURL(item.previewUrl);
      } catch {
        // Ignore - nothing we can do if revocation fails.
      }
      const timer = timersRef.current.get(localId);
      if (timer) {
        clearTimeout(timer);
        timersRef.current.delete(localId);
      }
      storeRef.current = storeRef.current.filter((i) => i.localId !== localId);
      commit();
    },
    [commit, findItem, patchItem],
  );

  const publish = useCallback(
    async (localId: string) => {
      const item = findItem(localId);
      if (!item?.photo) return;
      const result = await patchPhoto(item.photo.id, { published: true });
      if (result.ok) {
        patchItem(localId, { status: "published", photo: result.photo, error: undefined });
      } else {
        patchItem(localId, { error: `Couldn't publish: ${result.error}` });
      }
    },
    [findItem, patchItem],
  );

  const publishAll = useCallback(async () => {
    const readyIds = storeRef.current.filter((item) => item.status === "ready").map((item) => item.localId);
    await Promise.all(readyIds.map((localId) => publish(localId)));
  }, [publish]);

  const flashSaved = useCallback(
    (localId: string) => {
      const existing = timersRef.current.get(localId);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        timersRef.current.delete(localId);
        patchItem(localId, { saved: false });
      }, SAVED_FLASH_MS);
      timersRef.current.set(localId, timer);
    },
    [patchItem],
  );

  const updatePhoto = useCallback(
    async (localId: string, partial: PatchPhotoInput) => {
      const item = findItem(localId);
      if (!item?.photo || Object.keys(partial).length === 0) return;
      const previousPhoto = item.photo;
      // Merge the change into the displayed photo right away so a Toggle,
      // Select, or TagInput reflects the click instantly instead of waiting
      // on the round trip.
      patchItem(localId, { photo: { ...previousPhoto, ...partial } as Photo, error: undefined });
      const result = await patchPhoto(previousPhoto.id, partial);
      if (result.ok) {
        patchItem(localId, { photo: result.photo, saved: true });
        flashSaved(localId);
      } else {
        // Revert only the fields this call touched, against whatever the
        // photo looks like *now* - another field may have changed (e.g. an
        // in-flight AI tagging patch) since the optimistic merge above.
        const current = findItem(localId);
        const base = current?.photo ?? previousPhoto;
        const reverted = { ...base } as Record<string, unknown>;
        for (const key of Object.keys(partial)) {
          reverted[key] = (previousPhoto as Record<string, unknown>)[key];
        }
        patchItem(localId, { photo: reverted as Photo, error: `Couldn't save changes: ${result.error}` });
      }
    },
    [findItem, patchItem, flashSaved],
  );

  return { items, add, retry, remove, uploadAnyway, publish, publishAll, updatePhoto };
}
