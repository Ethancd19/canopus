"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { BulkMessage } from "@/components/admin/useLibrary";
import type { BulkPhotosPayload, BulkPhotosResult } from "@/lib/admin-api";
import type { BulkAction } from "@/lib/bulk";

export type CollectionOption = { id: string; title: string };

type Props = {
  count: number;
  allTags: string[];
  collections: CollectionOption[];
  onAction: (action: BulkAction, payload?: BulkPhotosPayload) => Promise<BulkPhotosResult>;
  onClear: () => void;
  message: BulkMessage | null;
  onDismissMessage: () => void;
};

/**
 * Sticky bottom bar. Shown whenever there's a selection *or* a leftover
 * result/error message from the last bulk action - the caller keeps
 * rendering it (keyed on `useLibrary().selectionEpoch`) so a message can
 * outlive the selection that produced it. `count === 0` collapses the bar
 * down to just the message line and a "Dismiss" button. Owns its own
 * per-action pending value (tag text, tag-to-remove, collection) and the
 * two-step delete confirm; every action funnels through `onAction`, which
 * the caller wires to `useLibrary().bulk`. The actual message text is owned
 * by `useLibrary` (not here) so it survives `bulk()` clearing the selection.
 */
export function BulkBar({ count, allTags, collections, onAction, onClear, message, onDismissMessage }: Props) {
  const [tagValue, setTagValue] = useState("");
  const [removeTagValue, setRemoveTagValue] = useState("");
  const [collectionValue, setCollectionValue] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  // `allTags`/`collections` load asynchronously and are typically empty on
  // the bar's first render, so fall back to the first option at render time
  // instead of syncing a default into state via an effect.
  const removeTag = removeTagValue || allTags[0] || "";
  const collectionId = collectionValue || collections[0]?.id || "";

  if (count === 0 && !message) return null;

  const run = async (action: BulkAction, payload?: BulkPhotosPayload) => {
    setConfirmingDelete(false);
    setBusy(true);
    await onAction(action, payload);
    setBusy(false);
  };

  // Any control other than the delete confirm/cancel pair backs out of a
  // pending delete confirmation - so clicking Publish (say) while "Confirm
  // delete N" is showing cancels the delete rather than silently deleting.
  const withCancelConfirm = (fn: () => void) => () => {
    setConfirmingDelete(false);
    fn();
  };

  return (
    <div className="fixed bottom-0 left-[200px] right-0 border-t border-text/10 bg-navy-mid px-8 py-3">
      <div className="flex flex-wrap items-center gap-3 gap-y-2">
        {count > 0 && (
          <>
            <p className="font-mono text-[12px] text-text">{count} selected</p>

            <Button variant="secondary" size="sm" disabled={busy} onClick={withCancelConfirm(() => void run("publish"))}>
              Publish
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={withCancelConfirm(() => void run("unpublish"))}
            >
              Unpublish
            </Button>

            <div className="flex items-center gap-1.5">
              <div className="w-36">
                <Input
                  value={tagValue}
                  onChange={(e) => setTagValue(e.target.value)}
                  placeholder="Add tag"
                  aria-label="Tag to add"
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy || !tagValue.trim()}
                onClick={withCancelConfirm(() => void run("addTag", { tag: tagValue.trim() }))}
              >
                Apply
              </Button>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="w-36">
                <Select
                  aria-label="Tag to remove"
                  value={removeTag}
                  onChange={(e) => setRemoveTagValue(e.target.value)}
                >
                  {allTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy || !removeTag}
                onClick={withCancelConfirm(() => void run("removeTag", { tag: removeTag }))}
              >
                Apply
              </Button>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="w-40">
                <Select
                  aria-label="Add to collection"
                  value={collectionId}
                  onChange={(e) => setCollectionValue(e.target.value)}
                >
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy || !collectionId}
                onClick={withCancelConfirm(() => void run("addToCollection", { collectionId }))}
              >
                Apply
              </Button>
            </div>

            <div className="flex items-center gap-1.5">
              {confirmingDelete ? (
                <>
                  <Button variant="danger" size="sm" disabled={busy} onClick={() => void run("delete")}>
                    Confirm delete {count}
                  </Button>
                  <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmingDelete(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button variant="danger" size="sm" disabled={busy} onClick={() => setConfirmingDelete(true)}>
                  Delete {count}
                </Button>
              )}
            </div>

            <Button variant="ghost" size="sm" disabled={busy} onClick={withCancelConfirm(onClear)}>
              Clear
            </Button>
          </>
        )}

        {message && (
          <div className="flex items-center gap-2">
            <p className={`font-mono text-[12px] ${message.tone === "error" ? "text-danger" : "text-muted"}`}>
              {message.text}
            </p>
            <Button variant="ghost" size="sm" onClick={onDismissMessage}>
              Dismiss
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
