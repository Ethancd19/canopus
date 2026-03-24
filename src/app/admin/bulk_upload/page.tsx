"use client";

import React, { useState, useCallback } from "react";
import imageCompression from "browser-image-compression";
import exifr from "exifr";

// ─── Types ────────────────────────────────────────────────────────────────────
type Format = "DIGITAL" | "FILM_35MM" | "FILM_120MM";

type PhotoEntry = {
  id: string;
  file: File;
  preview: string;
  // Cloudinary results
  cloudinaryId: string;
  width: number;
  height: number;
  // Editable fields
  title: string;
  slug: string;
  format: Format;
  location: string;
  tags: string;
  featured: boolean;
  // EXIF data
  camera: string;
  lens: string;
  focalLength: string;
  aperture: string;
  shutterSpeed: string;
  iso: string;
  filmStock: string;
  filmFormat: string;
  // Upload state
  uploadState: "pending" | "compressing" | "uploading" | "done" | "error";
  uploadError: string;
};

type saveState = "idle" | "saving" | "done" | "error";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSlug(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}

function makeTitle(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
}

async function readExif(file: File) {
  try {
    const data = await exifr.parse(file, {
      pick: [
        "Make",
        "Model",
        "LensModel",
        "FocalLength",
        "FNumber",
        "ExposureTime",
        "ISO",
      ],
    });
    if (!data) return {};
    return {
      camera: [data.Make, data.Model].filter(Boolean).join(" ") || "",
      lens: data.LensModel || "",
      focalLength: data.FocalLength ? `${Math.round(data.FocalLength)}mm` : "",
      aperture: data.FNumber ? `f/${data.FNumber}` : "",
      shutterSpeed: data.ExposureTime
        ? data.ExposureTime < 1
          ? `1/${Math.round(1 / data.ExposureTime)}`
          : `${data.ExposureTime}s`
        : "",
      iso: data.ISO ? String(data.ISO) : "",
    };
  } catch {
    return {};
  }
}

async function uploadToCloudinary(
  file: File,
): Promise<{ public_id: string; width: number; height: number }> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 8,
    maxWidthOrHeight: 4000,
    useWebWorker: true,
    preserveExif: true,
  });

  const formData = new FormData();
  formData.append("file", compressed);
  formData.append("upload_preset", "canopus");
  formData.append("folder", "canopus");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || "Cloudinary upload failed");
  }
  return res.json();
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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
          color: "rgba(240,242,244,0.5)",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Per-photo card ───────────────────────────────────────────────────────────

function PhotoEntryCard({
  entry,
  onChange,
  onRemove,
}: {
  entry: PhotoEntry;
  onChange: (id: string, patch: Partial<PhotoEntry>) => void;
  onRemove: (id: string) => void;
}) {
  const isFilm = entry.format !== "DIGITAL";
  const u = (patch: Partial<PhotoEntry>) => onChange(entry.id, patch);

  const statusColor =
    entry.uploadState === "done"
      ? "#5DBB8A"
      : entry.uploadState === "error"
        ? "#E07070"
        : entry.uploadState === "pending"
          ? "rgba(240,242,244,0.3)"
          : "#F0A750";

  const statusLabel =
    entry.uploadState === "compressing"
      ? "Compressing…"
      : entry.uploadState === "uploading"
        ? "Uploading…"
        : entry.uploadState === "done"
          ? "Uploaded ✓"
          : entry.uploadState === "error"
            ? `Error: ${entry.uploadError}`
            : "Pending";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr",
        gap: "1.5rem",
        padding: "1.25rem",
        border: "0.5px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.02)",
        position: "relative",
      }}
    >
      <button
        onClick={() => onRemove(entry.id)}
        style={{
          position: "absolute",
          top: "0.75rem",
          right: "0.75rem",
          background: "transparent",
          border: "none",
          color: "rgba(240,242,244,0.5)",
          cursor: "pointer",
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          letterSpacing: "0.1em",
          padding: "0.2rem 0.4rem",
          transition: "color 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#E07070")}
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = "rgba(240,242,244,0.5)")
        }
      >
        ✕
      </button>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        <div
          style={{
            aspectRatio: `${entry.width || 1} / ${entry.height || 1}`,
            background: "#0D0F11",
            overflow: "hidden",
            maxHeight: "180px",
          }}
        >
          <img
            src={entry.preview}
            alt={entry.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.1em",
            color: statusColor,
            textAlign: "center",
          }}
        >
          {statusLabel}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          paddingRight: "2rem",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
          }}
        >
          <Field label="Title">
            <input
              value={entry.title}
              onChange={(e) => u({ title: e.target.value })}
              style={inputStyle}
            />
          </Field>
          <Field label="Slug">
            <input
              value={entry.slug}
              onChange={(e) => u({ slug: e.target.value })}
              style={inputStyle}
            />
          </Field>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
          }}
        >
          <Field label="Format">
            <select
              value={entry.format}
              onChange={(e) => u({ format: e.target.value as Format })}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="DIGITAL">Digital</option>
              <option value="FILM_35MM">35mm Film</option>
              <option value="FILM_120MM">120 Film</option>
            </select>
          </Field>
          <Field label="Location">
            <input
              value={entry.location}
              onChange={(e) => u({ location: e.target.value })}
              style={inputStyle}
            />
          </Field>
        </div>

        <Field label="Tags (comma-separated)">
          <input
            value={entry.tags}
            onChange={(e) => u({ tags: e.target.value })}
            style={inputStyle}
            placeholder="landscape, waterfall, nature"
          />
        </Field>

        <div
          style={{
            borderTop: "0.5px solid rgba(255,255,255,0.07)",
            paddingTop: "0.75rem",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "8px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "rgba(240,242,244,0.5)",
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
                  value={entry.camera}
                  onChange={(e) => u({ camera: e.target.value })}
                  style={inputStyle}
                />
              </Field>
              <Field label="Lens">
                <input
                  value={entry.lens}
                  onChange={(e) => u({ lens: e.target.value })}
                  style={inputStyle}
                />
              </Field>
              <Field label="Focal length">
                <input
                  value={entry.focalLength}
                  onChange={(e) => u({ focalLength: e.target.value })}
                  style={inputStyle}
                  placeholder="50mm"
                />
              </Field>
              <Field label="Aperture">
                <input
                  value={entry.aperture}
                  onChange={(e) => u({ aperture: e.target.value })}
                  style={inputStyle}
                  placeholder="2.8"
                />
              </Field>
              <Field label="Shutter speed">
                <input
                  value={entry.shutterSpeed}
                  onChange={(e) => u({ shutterSpeed: e.target.value })}
                  style={inputStyle}
                  placeholder="1/250"
                />
              </Field>
              <Field label="ISO">
                <input
                  value={entry.iso}
                  onChange={(e) => u({ iso: e.target.value })}
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
                  value={entry.camera}
                  onChange={(e) => u({ camera: e.target.value })}
                  style={inputStyle}
                />
              </Field>
              <Field label="Film stock">
                <input
                  value={entry.filmStock}
                  onChange={(e) => u({ filmStock: e.target.value })}
                  style={inputStyle}
                  placeholder="Kodak Portra 400"
                />
              </Field>
              <Field label="Film format">
                <input
                  value={entry.filmFormat}
                  onChange={(e) => u({ filmFormat: e.target.value })}
                  style={inputStyle}
                  placeholder="135 / 120"
                />
              </Field>
            </div>
          )}
        </div>

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
            checked={entry.featured}
            onChange={(e) => u({ featured: e.target.checked })}
          />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "rgba(240,242,244,0.5)",
            }}
          >
            Featured on homepage
          </span>
        </label>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BulkUploadPage() {
  const [entries, setEntries] = useState<PhotoEntry[]>([]);
  const [saveState, setSaveState] = useState<saveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [savedCount, setSavedCount] = useState(0);

  const onFilesChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (!files.length) return;

      const newEntries: PhotoEntry[] = await Promise.all(
        files.map(async (file) => {
          const exif = await readExif(file);
          return {
            id: crypto.randomUUID(),
            file,
            preview: URL.createObjectURL(file),
            cloudinaryId: "",
            width: 0,
            height: 0,
            title: makeTitle(file.name),
            slug: makeSlug(file.name),
            format: "DIGITAL" as Format,
            location: "",
            tags: "",
            featured: false,
            camera: exif.camera ?? "",
            lens: exif.lens ?? "",
            focalLength: exif.focalLength ?? "",
            aperture: exif.aperture ?? "",
            shutterSpeed: exif.shutterSpeed ?? "",
            iso: exif.iso ?? "",
            filmStock: "",
            filmFormat: "",
            uploadState: "pending",
            uploadError: "",
          };
        }),
      );
      setEntries((prev) => [...prev, ...newEntries]);

      e.target.value = "";

      for (const entry of newEntries) {
        uploadEntry(entry.id, entry.file);
      }
    },
    [],
  );

  const uploadEntry = useCallback(async (id: string, file: File) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, uploadState: "compressing" } : e)),
    );

    try {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, uploadState: "uploading" } : e)),
      );
      const result = await uploadToCloudinary(file);
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                uploadState: "done",
                cloudinaryId: result.public_id,
                width: result.width,
                height: result.height,
              }
            : e,
        ),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, uploadState: "error", uploadError: msg } : e,
        ),
      );
    }
  }, []);

  const patchEntry = useCallback((id: string, patch: Partial<PhotoEntry>) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    );
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleSaveAll = async () => {
    const ready = entries.filter((e) => e.uploadState === "done" && e.title);
    if (!ready.length) return;

    setSaveState("saving");
    setSaveError("");
    let saved = 0;

    for (const entry of ready) {
      try {
        const res = await fetch("/api/admin/photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: entry.title,
            slug: entry.slug,
            cloudinaryId: entry.cloudinaryId,
            format: entry.format,
            width: entry.width,
            height: entry.height,
            aspectRatio: entry.width / entry.height,
            location: entry.location || null,
            caption: null,
            featured: entry.featured,
            tags: entry.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
            camera: entry.camera || null,
            lens: entry.lens || null,
            focalLength: entry.focalLength || null,
            aperture: entry.aperture || null,
            shutterSpeed: entry.shutterSpeed || null,
            iso: entry.iso || null,
            filmStock: entry.filmStock || null,
            filmFormat: entry.filmFormat || null,
          }),
        });

        if (!res.ok) throw new Error(`Failed to save ${entry.title}`);

        saved++;
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Save failed";
        setEntries((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, uploadError: msg } : e)),
        );
      }
    }

    setSavedCount((c) => c + saved);
    setSaveState(saved === ready.length ? "done" : "error");
    if (saved < ready.length) {
      setSaveError(`${saved}/${ready.length} saved. Check errors above.`);
    }
  };

  const readyCount = entries.filter(
    (e) => e.uploadState === "done" && e.title,
  ).length;
  console.log(
    "readyCount:",
    readyCount,
    entries.map((e) => e.uploadState),
  );
  const pendingCount = entries.filter(
    (e) =>
      e.uploadState === "pending" ||
      e.uploadState === "compressing" ||
      e.uploadState === "uploading",
  ).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080A0C",
        padding: "2rem",
        color: "#F0F2F4",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2.5rem",
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
              Bulk Upload
            </h1>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "rgba(240, 242, 244, 0.3)",
              }}
            >
              Select Multiple photos. They will upload automatically.
            </p>
          </div>

          <div
            style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
          >
            <a
              href="/admin/upload"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "rgba(240,242,244,0.3)",
                textDecoration: "none",
              }}
            >
              ← Single upload
            </a>
            <a
              href="/admin/photos"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "rgba(240,242,244,0.3)",
                textDecoration: "none",
              }}
            >
              Admin home
            </a>
          </div>
        </div>

        <label
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            padding: "3rem 2rem",
            border: "0.5px dashed rgba(255, 255, 255, 0.15)",
            cursor: "pointer",
            marginBottom: "2rem",
            transition: "border-color 0.2s, background 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor =
              "rgba(255,255,255,0.3)";
            (e.currentTarget as HTMLElement).style.background =
              "rgba(255,255,255,0.02)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor =
              "rgba(255,255,255,0.15)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "18px",
              fontWeight: 300,
              color: "rgba(240, 242, 244, 0.5)",
            }}
          >
            Click to select photos
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(240, 242, 244, 0.5)",
            }}
          >
            JPG, PNG, WEBP · Multiple files supported
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onFilesChange}
            style={{ display: "none" }}
          />
        </label>

        {entries.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.75rem 1rem",
              background: "rgba(255,255,255,0.03)",
              border: "0.5px solid rgba(255,255,255,0.07)",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ display: "flex", gap: "2rem" }}>
              <Stat label="Total" value={String(entries.length)} />
              <Stat
                label="Uploaded"
                value={String(readyCount)}
                color="#5FBB8A"
              />
              {pendingCount > 0 && (
                <Stat
                  label="Pending"
                  value={String(pendingCount)}
                  color="#F0A750"
                />
              )}
              {savedCount > 0 && (
                <Stat
                  label="Saved"
                  value={String(savedCount)}
                  color="#5DBB8A"
                />
              )}
            </div>
            <div
              style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
            >
              {saveError && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    color: "#E07070",
                  }}
                >
                  {saveError}
                </span>
              )}
              <button
                onClick={handleSaveAll}
                disabled={readyCount === 0 || saveState === "saving"}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  padding: "0.65rem 1.25rem",
                  background:
                    readyCount === 0 ? "transparent" : "rgba(240,242,244,0.08)",
                  border: `0.5px solid ${readyCount === 0 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.2)"}`,
                  color: readyCount === 0 ? "rgba(240,242,244,0.2)" : "#F0F2F4",
                  cursor:
                    readyCount === 0 || saveState === "saving"
                      ? "not-allowed"
                      : "pointer",
                  transition: "all 0.2s",
                }}
              >
                {saveState === "saving"
                  ? "Saving..."
                  : `Save ${readyCount} photo${readyCount > 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          {entries.map((entry) => (
            <PhotoEntryCard
              key={entry.id}
              entry={entry}
              onChange={patchEntry}
              onRemove={removeEntry}
            />
          ))}
        </div>

        {entries.length === 0 && (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              textAlign: "center",
              color: "rgba(240,242,244,0.5)",
              padding: "3rem",
            }}
          >
            No photos selected yet.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color = "rgba(240,242,244,0.5)",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "8px",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "rgba(240,242,244,0.25)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "14px",
          color,
        }}
      >
        {value}
      </span>
    </div>
  );
}
