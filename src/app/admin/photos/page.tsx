"use client";

import React, { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Format = "DIGITAL" | "FILM_35MM" | "FILM_120" | "FILM_120MM";

type Photo = {
  id: string;
  title: string;
  slug: string;
  cloudinaryId: string;
  format: Format;
  tags: string[];
  featured: boolean;
  location: string | null;
  caption: string | null;
  camera: string | null;
  lens: string | null;
  focalLength: string | null;
  aperture: string | null;
  shutterSpeed: string | null;
  iso: string | null;
  filmStock: string | null;
  filmFormat: string | null;
  createdAt: string;
};

type EditState = {
  title: string;
  location: string;
  tags: string;
  caption: string;
  camera: string;
  lens: string;
  focalLength: string;
  aperture: string;
  shutterSpeed: string;
  iso: string;
  filmStock: string;
  filmFormat: string;
  format: Format;
  featured: boolean;
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function cloudinaryThumb(id: string) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  return `https://res.cloudinary.com/${cloud}/image/upload/w_200,h_200,c_fill,q_auto,f_auto/${id}`;
}

function photoToEditState(p: Photo): EditState {
  return {
    title: p.title,
    location: p.location ?? "",
    tags: p.tags.join(", "),
    caption: p.caption ?? "",
    camera: p.camera ?? "",
    lens: p.lens ?? "",
    focalLength: p.focalLength ?? "",
    aperture: p.aperture ?? "",
    shutterSpeed: p.shutterSpeed ?? "",
    iso: p.iso ?? "",
    filmStock: p.filmStock ?? "",
    filmFormat: p.filmFormat ?? "",
    format: p.format,
    featured: p.featured,
  };
}

// ─── Styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "0.5px solid rgba(255,255,255,0.1)",
  padding: "0.5rem 0.65rem",
  color: "#F0F2F4",
  fontFamily: "var(--font-mono)",
  fontSize: "11px",
  outline: "none",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <label
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "8px",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "rgba(240,242,244,0.3)",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function PhotoRow({
  photo,
  onUpdate,
  onDelete,
}: {
  photo: Photo;
  onUpdate: (id: string, patch: Partial<Photo>) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [edit, setEdit] = useState<EditState>(photoToEditState(photo));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">(
    "idle",
  );

  const isFilm = edit.format !== "DIGITAL";

  const toggleFeatured = async () => {
    const next = !photo.featured;
    onUpdate(photo.id, { featured: next });
    await fetch(`/api/admin/photo/${photo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured: next }),
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch(`/api/admin/photo/${photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: edit.title,
          location: edit.location || null,
          tags: edit.tags.split(",").map((tag) => tag.trim()),
          caption: edit.caption || null,
          camera: edit.camera || null,
          lens: edit.lens || null,
          focalLength: edit.focalLength || null,
          aperture: edit.aperture || null,
          shutterSpeed: edit.shutterSpeed || null,
          iso: edit.iso || null,
          filmStock: edit.filmStock || null,
          filmFormat: edit.filmFormat || null,
          format: edit.format,
          featured: edit.featured,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const { photo: updated } = await res.json();
      onUpdate(photo.id, updated);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${photo.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/photo/${photo.id}`, { method: "DELETE" });
      onDelete(photo.id);
    } catch {
      setDeleting(false);
    }
  };

  const handleAiTag = async () => {
    setAiLoading(true);
    try {
      const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const imageUrl = `https://res.cloudinary.com/${cloud}/image/upload/${photo.cloudinaryId}`;
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      if (!res.ok) throw new Error("AI tagging failed");
      const suggestion = await res.json();
      setEdit((e) => ({
        ...e,
        tags: suggestion.tags?.join(", ") ?? e.tags,
        location: suggestion.location || e.location,
        caption: suggestion.caption || e.caption,
      }));
    } catch {
      // silently fail
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div style={{ borderBottom: "0.5px solid rgba(255,255,255,0.06" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "48px 1fr auto auto auto auto",
          alignItems: "center",
          gap: "1rem",
          padding: "0.75rem 1rem",
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "rgba(255,255,255,0.02)")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        onClick={() => setExpanded((x) => !x)}
      >
        <img
          src={cloudinaryThumb(photo.cloudinaryId)}
          alt={photo.title}
          style={{
            width: "48px",
            height: "48px",
            objectFit: "cover",
            display: "block",
            flexShrink: 0,
          }}
        />

        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "14px",
              fontWeight: 300,
              color: "#F0F2F4",
              marginBottom: "2px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {photo.title}
          </p>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              letterSpacing: "0.1em",
              color: "rgba(240,242,244,0.3)",
            }}
          >
            {photo.format.replace("_", " ").toLowerCase()}
            {photo.location ? ` · ${photo.location}` : ""}
            {photo.tags.length > 0
              ? ` · ${photo.tags.slice(0, 3).join(", ")}`
              : ""}
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFeatured();
          }}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "8px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "0.25rem 0.6rem",
            background: photo.featured
              ? "rgba(93,187,138,0.15)"
              : "transparent",
            border: `0.5px solid ${photo.featured ? "rgba(93,187,138,0.4)" : "rgba(255,255,255,0.1)"}`,
            color: photo.featured ? "#5DBB8A" : "rgba(240,242,244,0.3)",
            cursor: "pointer",
            transition: "all 0.2s",
            whiteSpace: "nowrap",
          }}
        >
          {photo.featured ? "★ Featured" : "☆ Feature"}
        </button>

        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            color: "rgba(240,242,244,0.25)",
            whiteSpace: "nowrap",
          }}
        >
          {photo.tags.length} tag{photo.tags.length !== 1 ? "s" : ""}
        </span>

        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            color: "rgba(240,242,244,0.2)",
            whiteSpace: "nowrap",
          }}
        >
          {new Date(photo.createdAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>

        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "rgba(240,242,244,0.2)",
            transition: "transform 0.2s",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▾
        </span>
      </div>

      {expanded && (
        <div
          style={{
            padding: "1.25rem 1rem 1.5rem",
            background: "rgba(255,255,255,0.015)",
            borderTop: "0.5px solid rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "160px 1fr",
              gap: "1.5rem",
            }}
          >
            <div>
              <img
                src={cloudinaryThumb(photo.cloudinaryId)}
                alt={photo.title}
                style={{
                  width: "100%",
                  aspectRatio: "1",
                  objectFit: "cover",
                  display: "block",
                  marginBottom: "0.75rem",
                }}
              />

              <button
                onClick={handleAiTag}
                disabled={aiLoading}
                style={{
                  width: "100%",
                  fontFamily: "var(--font-mono)",
                  fontSize: "8px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  padding: "0.5rem",
                  background: "transparent",
                  border: "0.5px solid rgba(255,255,255,0.12)",
                  color: aiLoading
                    ? "rgba(240,242,244,0.3)"
                    : "rgba(240,242,244,0.5)",
                  cursor: aiLoading ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  marginBottom: "0.4rem",
                }}
                onMouseEnter={(e) =>
                  !aiLoading && (e.currentTarget.style.color = "#F0F2F4")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = aiLoading
                    ? "rgba(240,242,244,0.3)"
                    : "rgba(240,242,244,0.5)")
                }
              >
                {aiLoading ? "Thinking..." : "✦ AI Tags"}
              </button>

              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  width: "100%",
                  fontFamily: "var(--font-mono)",
                  fontSize: "8px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  padding: "0.5rem",
                  background: "transparent",
                  border: "0.5px solid rgba(224,112,112,0.2)",
                  color: "rgba(224,112,112,0.5)",
                  cursor: deleting ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) =>
                  !deleting && (e.currentTarget.style.color = "#E07070")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "rgba(224,112,112,0.5)")
                }
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "0.75rem",
                }}
              >
                <Field label="Title">
                  <input
                    value={edit.title}
                    onChange={(e) =>
                      setEdit((x) => ({ ...x, title: e.target.value }))
                    }
                    style={inputStyle}
                  />
                </Field>
                <Field label="Format">
                  <select
                    value={edit.format}
                    onChange={(e) =>
                      setEdit((x) => ({
                        ...x,
                        format: e.target.value as Format,
                      }))
                    }
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    <option value="DIGITAL">Digital</option>
                    <option value="FILM_35MM">35mm</option>
                    <option value="FILM_120">120</option>
                  </select>
                </Field>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                }}
              >
                <Field label="Location">
                  <input
                    value={edit.location}
                    onChange={(e) =>
                      setEdit((x) => ({ ...x, location: e.target.value }))
                    }
                    style={inputStyle}
                    placeholder="Norway"
                  />
                </Field>
                <Field label="Tags (comma separated)">
                  <input
                    value={edit.tags}
                    onChange={(e) =>
                      setEdit((x) => ({ ...x, tags: e.target.value }))
                    }
                    style={inputStyle}
                    placeholder="landscape, waterfall"
                  />
                </Field>
              </div>

              <Field label="Caption">
                <textarea
                  value={edit.caption}
                  onChange={(e) =>
                    setEdit((x) => ({ ...x, caption: e.target.value }))
                  }
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </Field>

              <div
                style={{
                  borderTop: "0.5px solid rgba(255,255,255,0.06)",
                  paddingTop: "0.75rem",
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "8px",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "rgba(240,242,244,0.25)",
                    marginBottom: "0.5rem",
                  }}
                >
                  {isFilm ? "Film data" : "EXIF data"}
                </p>
                {!isFilm ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "0.5rem",
                    }}
                  >
                    <Field label="Camera">
                      <input
                        value={edit.camera}
                        onChange={(e) =>
                          setEdit((x) => ({ ...x, camera: e.target.value }))
                        }
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Lens">
                      <input
                        value={edit.lens}
                        onChange={(e) =>
                          setEdit((x) => ({ ...x, lens: e.target.value }))
                        }
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Focal length">
                      <input
                        value={edit.focalLength}
                        onChange={(e) =>
                          setEdit((x) => ({
                            ...x,
                            focalLength: e.target.value,
                          }))
                        }
                        style={inputStyle}
                        placeholder="50mm"
                      />
                    </Field>
                    <Field label="Aperture">
                      <input
                        value={edit.aperture}
                        onChange={(e) =>
                          setEdit((x) => ({ ...x, aperture: e.target.value }))
                        }
                        style={inputStyle}
                        placeholder="2.8"
                      />
                    </Field>
                    <Field label="Shutter speed">
                      <input
                        value={edit.shutterSpeed}
                        onChange={(e) =>
                          setEdit((x) => ({
                            ...x,
                            shutterSpeed: e.target.value,
                          }))
                        }
                        style={inputStyle}
                        placeholder="1/250"
                      />
                    </Field>
                    <Field label="ISO">
                      <input
                        value={edit.iso}
                        onChange={(e) =>
                          setEdit((x) => ({ ...x, iso: e.target.value }))
                        }
                        style={inputStyle}
                        placeholder="400"
                      />
                    </Field>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "0.5rem",
                    }}
                  >
                    <Field label="Camera">
                      <input
                        value={edit.camera}
                        onChange={(e) =>
                          setEdit((x) => ({ ...x, camera: e.target.value }))
                        }
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Film stock">
                      <input
                        value={edit.filmStock}
                        onChange={(e) =>
                          setEdit((x) => ({ ...x, filmStock: e.target.value }))
                        }
                        style={inputStyle}
                        placeholder="Kodak Portra 400"
                      />
                    </Field>
                    <Field label="Film format">
                      <input
                        value={edit.filmFormat}
                        onChange={(e) =>
                          setEdit((x) => ({ ...x, filmFormat: e.target.value }))
                        }
                        style={inputStyle}
                        placeholder="135 / 120"
                      />
                    </Field>
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "0.25rem",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={edit.featured}
                    onChange={(e) =>
                      setEdit((x) => ({ ...x, featured: e.target.checked }))
                    }
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "9px",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "rgba(240,242,244,0.4)",
                    }}
                  >
                    Featured on homepage
                  </span>
                </label>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "9px",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    padding: "0.6rem 1.25rem",
                    background:
                      saveStatus === "saved"
                        ? "rgba(93,187,138,0.15)"
                        : "rgba(240,242,244,0.08)",
                    border: `0.5px solid ${saveStatus === "saved" ? "rgba(93,187,138,0.4)" : saveStatus === "error" ? "rgba(224,112,112,0.4)" : "rgba(255,255,255,0.15)"}`,
                    color:
                      saveStatus === "saved"
                        ? "#5DBB8A"
                        : saveStatus === "error"
                          ? "#E07070"
                          : "#F0F2F4",
                    cursor: saving ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {saving
                    ? "Saving…"
                    : saveStatus === "saved"
                      ? "Saved ✓"
                      : saveStatus === "error"
                        ? "Error"
                        : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────

export default function AdminPhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "featured" | "untagged">("all");

  useEffect(() => {
    fetch("/api/admin/photos")
      .then((res) => res.json())
      .then((data) => {
        setPhotos(data.photos ?? []);
        setLoading(false);
      });
  }, []);

  const handleUpdate = (id: string, patch: Partial<Photo>) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  };

  const handleDelete = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const filtered = photos.filter((p) => {
    const matchesSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.location?.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "featured"
          ? p.featured
          : filter === "untagged"
            ? p.tags.length === 0
            : true;
    return matchesSearch && matchesFilter;
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080A0C",
        padding: "2rem",
        color: "#F0F2F4",
      }}
    >
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "28px",
                fontWeight: 300,
                letterSpacing: "0.1em",
                marginBottom: "0.25rem",
              }}
            >
              Photos
            </h1>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "rgba(240,242,244,0.3)",
              }}
            >
              {photos.length} photo{photos.length !== 1 ? "s" : ""} total
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <a
              href="/admin/bulk-upload"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "rgba(240,242,244,0.4)",
                textDecoration: "none",
                padding: "0.5rem 0.85rem",
                border: "0.5px solid rgba(255,255,255,0.1)",
              }}
            >
              + Bulk upload
            </a>
            <a
              href="/admin/upload"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "rgba(240,242,244,0.4)",
                textDecoration: "none",
                padding: "0.5rem 0.85rem",
                border: "0.5px solid rgba(255,255,255,0.1)",
              }}
            >
              + Single upload
            </a>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, location, tag..."
            style={{ ...inputStyle, flex: 1, minWidth: "200px" }}
          />
          {(["all", "featured", "untagged"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: filter === f ? "#F0F2F4" : "rgba(240,242,244,0.35)",
                textDecoration: "none",
                padding: "0.5rem 0.85rem",
                border: `0.5px solid ${filter === f ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}`,
                background:
                  filter === f ? "rgba(240,242,244,0.08)" : "transparent",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {f}
            </button>
          ))}
        </div>
        {loading ? (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "rgba(240,242,244,0.2)",
              textAlign: "center",
              padding: "4rem",
            }}
          >
            Loading...
          </p>
        ) : filtered.length === 0 ? (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "rgba(240,242,244,0.2)",
              textAlign: "center",
              padding: "4rem",
            }}
          >
            {search || filter !== "all"
              ? "No photos match that filter"
              : "No photos yet"}
          </p>
        ) : (
          <div style={{ border: "0.5px solid rgba(255,255,255,0.07)" }}>
            {filtered.map((photo) => (
              <PhotoRow
                key={photo.id}
                photo={photo}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
