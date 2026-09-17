"use client";

import { useEffect, useRef, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { PhotoFields } from "@/components/admin/PhotoFields";
import { photoSrc } from "@/lib/photo-url";
import type { PatchPhotoInput, Photo } from "@/lib/admin-api";

type ActionResult = { ok: boolean; error?: string };

type Props = {
  photo: Photo | null;
  onClose: () => void;
  onSave: (partial: PatchPhotoInput) => Promise<ActionResult>;
  onDelete: () => Promise<ActionResult>;
  onTogglePublished: () => Promise<ActionResult>;
  suggestions?: string[];
};

type FooterMode = "default" | "confirmDelete" | "confirmDiscard";

/**
 * Edits one photo in a side drawer. Stays mounted with `photo` toggling
 * between a row and `null` so the Drawer's own slide animation can play on
 * both open and close; `displayPhoto` keeps showing the last photo while it
 * closes instead of flashing empty.
 */
export function PhotoDrawer({ photo, onClose, onSave, onDelete, onTogglePublished, suggestions }: Props) {
  // Adjusting state in response to a prop change (rather than synchronizing
  // with an external system) belongs during render, not in an effect - see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  const [lastPhoto, setLastPhoto] = useState<Photo | null>(photo);
  const [displayPhoto, setDisplayPhoto] = useState<Photo | null>(photo);
  const [draft, setDraft] = useState<Photo | null>(photo);
  const [dirty, setDirty] = useState(false);
  const [footerMode, setFooterMode] = useState<FooterMode>("default");
  const [pending, setPending] = useState<PatchPhotoInput>({});
  const [footerError, setFooterError] = useState<string | null>(null);

  const open = photo !== null;

  if (photo && photo !== lastPhoto) {
    const isNewPhoto = photo.id !== lastPhoto?.id;
    setLastPhoto(photo);
    setDisplayPhoto(photo);
    // Only reset the edit draft when switching to a *different* photo - an
    // external update to the same row (e.g. publishing while other fields
    // are dirty) should not silently discard unsaved edits.
    if (isNewPhoto) {
      setDraft(photo);
      setPending({});
      setDirty(false);
      setFooterMode("default");
      setFooterError(null);
    }
  }

  const handleFieldChange = (partial: PatchPhotoInput) => {
    setPending((prev) => ({ ...prev, ...partial }));
    setDraft((prev) => (prev ? ({ ...prev, ...partial } as Photo) : prev));
    setDirty(true);
  };

  const handleSave = () => {
    if (Object.keys(pending).length === 0) return;
    const partial = pending;
    void (async () => {
      const result = await onSave(partial);
      if (result.ok) {
        setPending({});
        setDirty(false);
        setFooterError(null);
      } else {
        // Keep the draft/pending/dirty state as-is so the edits (and the
        // Save button) survive a failed save.
        setFooterError(`Couldn't save changes: ${result.error}`);
      }
    })();
  };

  const handleDelete = () => {
    void (async () => {
      const result = await onDelete();
      if (!result.ok) {
        setFooterError(`Couldn't delete photo: ${result.error}`);
        setFooterMode("default");
      }
      // On success the parent clears `photo`, which unmounts this drawer's
      // content on its own - no local state to reset here.
    })();
  };

  const handleTogglePublished = () => {
    const action = displayPhoto?.published ? "unpublish" : "publish";
    void (async () => {
      const result = await onTogglePublished();
      setFooterError(result.ok ? null : `Couldn't ${action}: ${result.error}`);
    })();
  };

  const handleSaveRef = useRef(handleSave);
  useEffect(() => {
    handleSaveRef.current = handleSave;
  });

  const handleRequestClose = () => {
    if (dirty) {
      setFooterMode("confirmDiscard");
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveRef.current();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!displayPhoto || !draft) {
    return (
      <Drawer open={false} onClose={onClose} title="">
        {null}
      </Drawer>
    );
  }

  const footer = (
    <div className="flex flex-col gap-2">
      {footerMode === "default" && footerError && (
        <p className="font-mono text-[12px] text-danger">{footerError}</p>
      )}
      <div className="flex items-center justify-between gap-3">
        {footerMode === "confirmDiscard" ? (
          <>
            <p className="font-mono text-[12px] text-muted">Discard unsaved changes?</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setFooterMode("default")}>
                Keep editing
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  // Reset the draft *before* closing - otherwise reopening
                  // this same photo (same object reference, so the
                  // render-phase resync below sees no change) would silently
                  // resurrect the discarded edits with Save enabled.
                  setDraft(displayPhoto);
                  setPending({});
                  setDirty(false);
                  setFooterMode("default");
                  onClose();
                }}
              >
                Discard
              </Button>
            </div>
          </>
        ) : footerMode === "confirmDelete" ? (
          <>
            <p className="font-mono text-[12px] text-danger">Delete this photo? This also removes the file.</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setFooterMode("default")}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete}>
                Confirm delete
              </Button>
            </div>
          </>
        ) : (
          <>
            <Button variant="danger" size="sm" onClick={() => setFooterMode("confirmDelete")}>
              Delete photo
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleTogglePublished}>
                {displayPhoto.published ? "Unpublish" : "Publish"}
              </Button>
              <Button variant="primary" size="sm" disabled={!dirty} onClick={handleSave}>
                Save changes
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <Drawer open={open} onClose={handleRequestClose} title={displayPhoto.title} footer={footer}>
      <div className="flex flex-col gap-5">
        <div
          className="aspect-[3/2] w-full rounded-sm overflow-hidden bg-navy-light bg-cover bg-center"
          style={displayPhoto.blurDataUrl ? { backgroundImage: `url(${displayPhoto.blurDataUrl})` } : undefined}
        >
          <img src={photoSrc(displayPhoto, 960)} alt="" className="h-full w-full object-cover" />
        </div>
        <PhotoFields photo={draft} onChange={handleFieldChange} suggestions={suggestions} />
      </div>
    </Drawer>
  );
}
