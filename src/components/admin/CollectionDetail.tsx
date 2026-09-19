"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Reorder, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Toggle } from "@/components/ui/Toggle";
import { useCollection } from "@/components/admin/useCollection";
import { PhotoPicker } from "@/components/admin/PhotoPicker";
import { photoSrc } from "@/lib/photo-url";
import type { Photo } from "@/lib/admin-api";

function thumbStyle(photo: Photo) {
  return photo.blurDataUrl ? { backgroundImage: `url(${photo.blurDataUrl})` } : undefined;
}

export function CollectionDetail({ id }: { id: string }) {
  const {
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
    removePhoto,
    addPhotos,
    remove,
  } = useCollection(id);
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (notFound) {
    return (
      <div className="flex flex-col gap-3">
        <p className="font-mono text-[13px] text-danger">Collection not found</p>
        <Link href="/admin/collections" className="w-fit font-mono text-[12px] text-muted hover:text-text">
          Back to collections
        </Link>
      </div>
    );
  }

  if (loading) {
    return <p className="font-mono text-[13px] text-muted">Loading collection</p>;
  }

  if (!collection) {
    return (
      <div className="flex flex-col gap-3">
        {error && <p className="font-mono text-[13px] text-danger">{error}</p>}
        <Link href="/admin/collections" className="w-fit font-mono text-[12px] text-muted hover:text-text">
          Back to collections
        </Link>
      </div>
    );
  }

  const memberIds = members.map((m) => m.photoId);

  const handleDelete = async () => {
    setDeleting(true);
    const result = await remove();
    setDeleting(false);
    if (result.ok) {
      router.push("/admin/collections");
    }
    // On failure `remove()` already set the hook's `error`, shown below; stay
    // in the confirm step so the user can retry without re-clicking Delete.
  };

  return (
    <div className="flex flex-col gap-6 pb-16">
      <Link href="/admin/collections" className="w-fit font-mono text-[12px] text-muted hover:text-text">
        ← Collections
      </Link>

      <div className="flex flex-col gap-2">
        <input
          value={collection.title}
          onChange={(e) => setField({ title: e.target.value })}
          aria-label="Collection title"
          className="w-full border-0 border-b border-transparent bg-transparent font-serif text-2xl font-light text-text outline-none focus:border-text/20"
        />
        <p className="font-mono text-[12px] text-muted">/work/{collection.slug}</p>
      </div>

      <Textarea
        value={collection.description ?? ""}
        onChange={(e) => setField({ description: e.target.value })}
        placeholder="Description"
        aria-label="Description"
      />

      <Toggle checked={collection.published} onChange={(next) => setField({ published: next })} label="Published" tone="copper" />

      {error && <p className="font-mono text-[12px] text-danger">{error}</p>}

      <div className="flex flex-col gap-3">
        <h2 className="font-mono text-[12px] uppercase tracking-[0.15em] text-muted">Cover</h2>
        {members.length === 0 ? (
          <p className="font-mono text-[12px] text-faint">Add photos to choose a cover.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {members.map((member) => (
              <button
                key={member.photoId}
                type="button"
                onClick={() => setField({ coverId: member.photoId })}
                aria-pressed={collection.coverId === member.photoId}
                aria-label={`Set cover to ${member.photo.title}`}
                className={`h-16 w-24 shrink-0 overflow-hidden rounded-sm border-2 bg-navy-light bg-cover bg-center ${
                  collection.coverId === member.photoId ? "border-copper" : "border-transparent"
                }`}
                style={thumbStyle(member.photo)}
              >
                <img src={photoSrc(member.photo, 320)} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-[12px] uppercase tracking-[0.15em] text-muted">Photos</h2>
          <Button variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
            Add photos
          </Button>
        </div>

        {members.length === 0 ? (
          <p className="font-mono text-[13px] text-muted">No photos yet. Add some from the library.</p>
        ) : (
          <Reorder.Group axis="y" values={memberIds} onReorder={move} className="flex flex-col">
            {members.map((member, index) => (
              <Reorder.Item
                key={member.photoId}
                value={member.photoId}
                // Do NOT pass `layout={false}` - see FeaturedOrder.tsx for why.
                transition={reducedMotion ? { layout: { duration: 0 } } : undefined}
                className="flex cursor-grab items-center gap-4 border-b border-text/10 py-3 active:cursor-grabbing"
              >
                <span className="w-6 shrink-0 font-mono text-[12px] text-faint">{index + 1}</span>
                <div
                  className="h-16 w-24 shrink-0 overflow-hidden rounded-sm bg-navy-light bg-cover bg-center"
                  style={thumbStyle(member.photo)}
                >
                  <img
                    src={photoSrc(member.photo, 320)}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    draggable={false}
                  />
                </div>
                <p className="min-w-0 flex-1 truncate font-serif text-[15px] font-light text-text">
                  {member.photo.title}
                </p>
                <Button variant="ghost" size="sm" onClick={() => void removePhoto(member.photoId)}>
                  Remove
                </Button>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button variant="primary" size="md" disabled={!dirty} loading={saving || refreshing} onClick={() => void save()}>
          Save changes
        </Button>
        <Button variant="secondary" size="md" disabled={!dirty || saving || refreshing} onClick={reset}>
          Reset
        </Button>

        <div className="ml-auto">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" loading={deleting} onClick={() => void handleDelete()}>
                Confirm delete
              </Button>
            </div>
          ) : (
            <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
              Delete collection
            </Button>
          )}
        </div>
      </div>

      <PhotoPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        excludeIds={memberIds}
        onAdd={async (ids) => {
          const result = await addPhotos(ids);
          // Keep the picker open on failure (with the error shown inside
          // it) instead of closing it and losing the selection - see
          // PhotoPicker's `onAdd` doc.
          if (result.ok) setPickerOpen(false);
          return result;
        }}
      />
    </div>
  );
}
