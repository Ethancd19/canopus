"use client";

import { useEffect, useRef } from "react";
import { Dropzone } from "@/components/ui/Dropzone";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PhotoFields } from "@/components/admin/PhotoFields";
import { useUploadQueue, type QueueItem } from "@/components/admin/useUploadQueue";
import { TAG_OPTIONS } from "@/lib/tagging";
import type { PatchPhotoInput } from "@/lib/admin-api";

const DEBOUNCE_MS = 500;

/** Sent immediately on change - only free-text fields get the debounce. */
const IMMEDIATE_FIELDS = new Set<keyof PatchPhotoInput>([
  "tags",
  "format",
  "featured",
  "filmStock",
  "filmFormat",
]);

const PROGRESS_LABEL: Partial<Record<QueueItem["status"], string>> = {
  queued: "Queued",
  compressing: "Compressing",
  uploading: "Uploading",
  tagging: "Tagging with AI",
};

const ACCEPT = "image/jpeg,image/png,image/webp";

export function UploadQueue() {
  const { items, add, retry, remove, uploadAnyway, publish, publishAll, updatePhoto } = useUploadQueue();
  const readyCount = items.filter((item) => item.status === "ready").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl font-light text-text">Upload photos</h1>
        <p className="font-mono text-[12px] text-muted">
          Drop JPEG, PNG, or WebP files. Each becomes a draft you can publish here or from the library.
        </p>
      </div>

      <Dropzone accept={ACCEPT} onFiles={add} compact={items.length > 0}>
        <span className="font-mono text-[13px] text-muted">
          {items.length === 0 ? "Drop photos here, or click to choose files" : "Drop more photos"}
        </span>
      </Dropzone>

      {items.length > 0 && (
        <>
          <div className="flex items-center justify-between border-b border-text/10 pb-3">
            <p className="font-mono text-[12px] text-muted">
              {items.length} {items.length === 1 ? "photo" : "photos"} · {readyCount} ready to publish
            </p>
            <Button variant="primary" size="sm" disabled={readyCount === 0} onClick={() => void publishAll()}>
              Publish all ready ({readyCount})
            </Button>
          </div>

          <ul className="flex flex-col gap-4">
            {items.map((item) => (
              <QueueRow
                key={item.localId}
                item={item}
                onRetry={() => retry(item.localId)}
                onUploadAnyway={() => uploadAnyway(item.localId)}
                onRemove={() => void remove(item.localId)}
                onPublish={() => void publish(item.localId)}
                onFieldChange={(partial) => updatePhoto(item.localId, partial)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function QueueRow({
  item,
  onRetry,
  onUploadAnyway,
  onRemove,
  onPublish,
  onFieldChange,
}: {
  item: QueueItem;
  onRetry: () => void;
  onUploadAnyway: () => void;
  onRemove: () => void;
  onPublish: () => void;
  onFieldChange: (partial: PatchPhotoInput) => void;
}) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<PatchPhotoInput>({});

  // Clear the debounce timer on unmount (and thus when this row is removed,
  // since removal unmounts it) so a stale edit never fires after the fact.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleFieldChange = (partial: PatchPhotoInput) => {
    const immediate: PatchPhotoInput = {};
    const debounced: PatchPhotoInput = {};
    for (const [key, value] of Object.entries(partial)) {
      const target = IMMEDIATE_FIELDS.has(key as keyof PatchPhotoInput) ? immediate : debounced;
      (target as Record<string, unknown>)[key] = value;
    }

    if (Object.keys(immediate).length > 0) {
      onFieldChange(immediate);
    }

    if (Object.keys(debounced).length > 0) {
      pendingRef.current = { ...pendingRef.current, ...debounced };
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        const toSend = pendingRef.current;
        pendingRef.current = {};
        onFieldChange(toSend);
      }, DEBOUNCE_MS);
    }
  };

  return (
    <li className="flex gap-4 border border-text/10 rounded-sm p-4">
      <img src={item.previewUrl} alt="" className="h-24 w-24 shrink-0 rounded-sm object-cover" />

      <div className="flex-1 min-w-0">
        {item.photo ? (
          <PhotoFields photo={item.photo} onChange={handleFieldChange} suggestions={[...TAG_OPTIONS]} />
        ) : (
          <div className="flex flex-col gap-1">
            <p className="font-mono text-[13px] text-text truncate">{item.file.name}</p>
            <p className="font-mono text-[11px] text-faint">Waiting for the upload to finish…</p>
          </div>
        )}
      </div>

      <div className="w-40 shrink-0 flex flex-col items-end gap-2 text-right">
        <StatusColumn item={item} onRetry={onRetry} onUploadAnyway={onUploadAnyway} onRemove={onRemove} onPublish={onPublish} />
      </div>
    </li>
  );
}

function StatusColumn({
  item,
  onRetry,
  onUploadAnyway,
  onRemove,
  onPublish,
}: {
  item: QueueItem;
  onRetry: () => void;
  onUploadAnyway: () => void;
  onRemove: () => void;
  onPublish: () => void;
}) {
  if (item.status === "duplicate") {
    return (
      <>
        <p className="font-mono text-[12px] text-danger">{item.error}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={onUploadAnyway}>
            Upload anyway
          </Button>
          <Button size="sm" variant="ghost" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </>
    );
  }

  if (item.status === "failed") {
    return (
      <>
        <p className="font-mono text-[12px] text-danger">{item.error}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={onRetry}>
            Retry
          </Button>
          <Button size="sm" variant="ghost" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </>
    );
  }

  if (item.status === "ready") {
    return (
      <>
        <Badge tone="draft">Draft</Badge>
        <Button size="sm" variant="secondary" onClick={onPublish}>
          Publish
        </Button>
        {item.error && <p className="font-mono text-[12px] text-danger">{item.error}</p>}
        {item.saved && <span className="font-mono text-[11px] text-muted">Saved</span>}
      </>
    );
  }

  if (item.status === "published") {
    return (
      <>
        <Badge tone="published">Published</Badge>
        {item.error && <p className="font-mono text-[12px] text-danger">{item.error}</p>}
        {item.saved && <span className="font-mono text-[11px] text-muted">Saved</span>}
      </>
    );
  }

  return (
    <>
      <p className="font-mono text-[12px] text-muted">{PROGRESS_LABEL[item.status] ?? item.status}</p>
      {item.saved && <span className="font-mono text-[11px] text-muted">Saved</span>}
    </>
  );
}
