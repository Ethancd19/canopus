"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useCollections } from "@/components/admin/useCollections";

export function Collections() {
  const { collections, loading, error, create } = useCollections();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreate = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setCreating(true);
    setFormError(null);
    const result = await create(trimmed);
    setCreating(false);
    if (result.ok) {
      setTitle("");
      setShowForm(false);
    } else {
      setFormError(result.error || "Couldn't create collection.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[12px] text-muted">Group photos into curated sets.</p>
        <Button variant="primary" size="md" onClick={() => setShowForm((v) => !v)}>
          New collection
        </Button>
      </div>

      {showForm && (
        <div className="flex flex-col gap-2 rounded-sm border border-text/10 p-4">
          <div className="flex items-center gap-3">
            <div className="w-64">
              <Input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Collection title"
                aria-label="Collection title"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreate();
                }}
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              loading={creating}
              disabled={!title.trim()}
              onClick={() => void handleCreate()}
            >
              Create
            </Button>
          </div>
          {formError && <p className="font-mono text-[12px] text-danger">{formError}</p>}
        </div>
      )}

      {error && <p className="font-mono text-[12px] text-danger">{error}</p>}

      {loading ? (
        <p className="font-mono text-[13px] text-muted">Loading collections</p>
      ) : collections.length === 0 ? (
        <p className="font-mono text-[13px] text-muted">
          No collections yet. Create one to group photos into a set.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-text/10">
          {collections.map((collection) => (
            <li key={collection.id}>
              <Link
                href={`/admin/collections/${collection.id}`}
                className="flex items-center gap-4 px-2 py-3 hover:bg-navy-light/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-[15px] font-light text-text">{collection.title}</p>
                  <p className="truncate font-mono text-[11px] text-muted">/work/{collection.slug}</p>
                </div>
                <span className="w-20 shrink-0 text-right font-mono text-[11px] text-muted">
                  {collection._count.photos} {collection._count.photos === 1 ? "photo" : "photos"}
                </span>
                {collection.published ? (
                  <Badge tone="published">Published</Badge>
                ) : (
                  <Badge tone="draft">Draft</Badge>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
