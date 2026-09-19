"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PhotoDrawer } from "@/components/admin/PhotoDrawer";
import { BulkBar, type CollectionOption } from "@/components/admin/BulkBar";
import { FORMAT_OPTIONS } from "@/components/admin/PhotoFields";
import { useLibrary, type FormatFilter, type StateFilter } from "@/components/admin/useLibrary";
import { photoSrc } from "@/lib/photo-url";
import { listCollections } from "@/lib/admin-api";
import type { Photo, PhotoFormat } from "@/lib/admin-api";

const FORMAT_LABEL: Record<PhotoFormat, string> = Object.fromEntries(
  FORMAT_OPTIONS.map((opt) => [opt.value, opt.label]),
) as Record<PhotoFormat, string>;

const STATE_OPTIONS: { value: StateFilter; label: string }[] = [
  { value: "all", label: "All photos" },
  { value: "drafts", label: "Drafts" },
  { value: "published", label: "Published" },
  { value: "featured", label: "Featured" },
  { value: "untagged", label: "Untagged" },
];

function thumbStyle(photo: Photo) {
  return photo.blurDataUrl ? { backgroundImage: `url(${photo.blurDataUrl})` } : undefined;
}

export function Library() {
  const library = useLibrary();
  const {
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
    setView,
    allTags,
    selected,
    toggleSelected,
    selectAllFiltered,
    clearSelection,
    selectionEpoch,
    bulk,
    bulkMessage,
    clearBulkMessage,
  } = library;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collections, setCollections] = useState<CollectionOption[]>([]);

  // Loaded once for the bulk bar's "Add to collection" picker - failing to
  // load is non-fatal, the picker is just empty until a reload succeeds.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await listCollections();
      if (!cancelled && result.ok) {
        setCollections(result.collections.map((c) => ({ id: c.id, title: c.title })));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPhoto = photos.find((p) => p.id === selectedId) ?? null;
  const draftCount = filtered.filter((p) => !p.published).length;
  const barVisible = selected.size > 0 || bulkMessage !== null;

  return (
    <div className={`flex flex-col gap-6 ${barVisible ? "pb-24" : ""}`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search photos"
            aria-label="Search photos"
          />
        </div>
        <div className="w-40">
          <Select
            aria-label="Format"
            value={format}
            onChange={(e) => setFormat(e.target.value as FormatFilter)}
          >
            <option value="all">All formats</option>
            {FORMAT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-40">
          <Select aria-label="State" value={state} onChange={(e) => setState(e.target.value as StateFilter)}>
            {STATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-1">
          {filtered.length > 0 && (
            <Button variant="ghost" size="sm" onClick={selectAllFiltered}>
              Select all ({filtered.length})
            </Button>
          )}
          <ViewButton active={view === "grid"} onClick={() => setView("grid")}>
            Grid
          </ViewButton>
          <ViewButton active={view === "list"} onClick={() => setView("list")}>
            List
          </ViewButton>
        </div>
      </div>

      <p className="font-mono text-[12px] text-muted">
        {filtered.length} {filtered.length === 1 ? "photo" : "photos"}, {draftCount} {draftCount === 1 ? "draft" : "drafts"}
      </p>

      {error && (
        <p className="flex items-center gap-3 font-mono text-[12px] text-danger">
          Couldn&apos;t load photos: {error}
          <Button variant="ghost" size="sm" onClick={() => void reload()}>
            Try again
          </Button>
        </p>
      )}

      {loading ? (
        <p className="font-mono text-[13px] text-muted">Loading photos</p>
      ) : filtered.length === 0 ? (
        <p className="font-mono text-[13px] text-muted">No photos match. Clear the filters or upload some.</p>
      ) : view === "grid" ? (
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
          {filtered.map((photo) => (
            <div key={photo.id} className="group relative">
              <SelectCheckbox
                title={photo.title}
                checked={selected.has(photo.id)}
                forceVisible={selected.size > 0}
                onToggle={(range) => toggleSelected(photo.id, { range })}
              />
              <button
                type="button"
                onClick={() => setSelectedId(photo.id)}
                className={`flex w-full flex-col gap-2 rounded-sm border bg-transparent p-2 text-left hover:border-text/10 ${
                  selected.has(photo.id) ? "border-ice/40" : "border-transparent"
                }`}
              >
                <div
                  className="aspect-[3/2] w-full overflow-hidden rounded-sm bg-navy-light bg-cover bg-center"
                  style={thumbStyle(photo)}
                >
                  <img src={photoSrc(photo, 640)} alt="" className="h-full w-full object-cover" loading="lazy" />
                </div>
                <p className="truncate font-serif text-[15px] font-light text-text">{photo.title}</p>
                {(!photo.published || photo.featured) && (
                  <div className="flex items-center gap-1.5">
                    {!photo.published && <Badge tone="draft">Draft</Badge>}
                    {photo.featured && <Badge tone="featured">Featured</Badge>}
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-text/10">
          {filtered.map((photo) => (
            <li key={photo.id} className="group relative">
              <SelectCheckbox
                title={photo.title}
                checked={selected.has(photo.id)}
                forceVisible={selected.size > 0}
                onToggle={(range) => toggleSelected(photo.id, { range })}
              />
              <button
                type="button"
                onClick={() => setSelectedId(photo.id)}
                className={`flex w-full items-center gap-4 rounded-sm border bg-transparent px-2 py-3 text-left hover:border-text/10 ${
                  selected.has(photo.id) ? "border-ice/40" : "border-transparent"
                }`}
              >
                <div
                  className="h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-navy-light bg-cover bg-center"
                  style={thumbStyle(photo)}
                >
                  <img src={photoSrc(photo, 640)} alt="" className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-[15px] font-light text-text">{photo.title}</p>
                  <p className="truncate font-mono text-[11px] text-faint">{photo.tags.join(", ") || "—"}</p>
                </div>
                <span className="w-20 shrink-0 font-mono text-[11px] text-muted">{FORMAT_LABEL[photo.format]}</span>
                <span className="flex w-24 shrink-0 items-center justify-end gap-1.5">
                  {!photo.published && <Badge tone="draft">Draft</Badge>}
                  {photo.published && <Badge tone="published">Published</Badge>}
                  {photo.featured && <Badge tone="featured">Featured</Badge>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <PhotoDrawer
        photo={selectedPhoto}
        suggestions={allTags}
        onClose={() => setSelectedId(null)}
        onSave={(partial) => {
          if (!selectedPhoto) return Promise.resolve({ ok: false, error: "not found" });
          return library.update(selectedPhoto.id, partial);
        }}
        onDelete={async () => {
          if (!selectedPhoto) return { ok: false, error: "not found" };
          const result = await library.remove(selectedPhoto.id);
          if (result.ok) setSelectedId(null);
          return result;
        }}
        onTogglePublished={() => {
          if (!selectedPhoto) return Promise.resolve({ ok: false, error: "not found" });
          return library.togglePublished(selectedPhoto.id);
        }}
      />

      <BulkBar
        key={selectionEpoch}
        count={selected.size}
        allTags={allTags}
        collections={collections}
        onAction={bulk}
        onClear={clearSelection}
        message={bulkMessage}
        onDismissMessage={clearBulkMessage}
      />
    </div>
  );
}

function ViewButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <Button variant="ghost" size="sm" aria-pressed={active} onClick={onClick} className={active ? "text-text" : undefined}>
      {children}
    </Button>
  );
}

/**
 * Absolutely-positioned checkbox overlaid on a tile's top-left corner - a
 * sibling of the tile's own `<button>`, not a child of it, so the checkbox
 * stays valid, clickable markup instead of interactive content nested
 * inside interactive content. `stopPropagation` still guards the click in
 * case a future wrapper adds its own onClick.
 */
function SelectCheckbox({
  title,
  checked,
  forceVisible,
  onToggle,
}: {
  title: string;
  checked: boolean;
  forceVisible: boolean;
  onToggle: (range: boolean) => void;
}) {
  return (
    <span
      className={`absolute left-3 top-3 z-10 focus-within:opacity-100 ${
        forceVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      }`}
    >
      <input
        type="checkbox"
        className="h-4 w-4 accent-ice focus-visible:opacity-100"
        aria-label={`Select ${title}`}
        checked={checked}
        onChange={() => {}}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(e.shiftKey);
        }}
      />
    </span>
  );
}
