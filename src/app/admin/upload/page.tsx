"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import exifr from "exifr";

type ExifData = {
  camera?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
  filmStock?: string;
  filmFormat?: string;
};

type AiSuggestion = {
  tags: string[];
  location: string;
  caption: string;
};

type UploadState =
  | "idle"
  | "uploading"
  | "tagging"
  | "saving"
  | "done"
  | "error";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState("");

  const [cloudinaryId, setCloudinaryId] = useState("");
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [format, setFormat] = useState<"DIGITAL" | "FILM_35MM" | "FILM_120">(
    "DIGITAL",
  );
  const [location, setLocation] = useState("");
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [featured, setFeatured] = useState(false);
  const [exif, setExif] = useState<ExifData>({});
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
      setSlug(
        f.name
          .replace(/\.[^.]+$/, "")
          .toLowerCase()
          .replace(/\s+/g, "-"),
      );
      setState("idle");
      setAiSuggestion(null);

      try {
        const exifData = await exifr.parse(f, {
          pick: [
            "Make",
            "Model",
            "LensModel",
            "FocalLength",
            "FNumber",
            "ExposureTime",
            "ISO",
            "DateTimeOriginal",
          ],
        });
        if (exifData) {
          setExif({
            camera: [exifData.Make, exifData.Model].filter(Boolean).join(" "),
            lens: exifData.LensModel ?? "",
            focalLength: exifData.FocalLength
              ? `${Math.round(exifData.FocalLength)}mm`
              : "",
            aperture: exifData.FNumber ? String(exifData.FNumber) : "",
            shutterSpeed: exifData.ExposureTime
              ? exifData.ExposureTime < 1
                ? `1/${Math.round(1 / exifData.ExposureTime)}`
                : `${exifData.ExposureTime}s`
              : "",
            iso: exifData.ISO ? String(exifData.ISO) : "",
          });
        }
      } catch {
        // EXIF not available - film scans, screenshots etc won't have it
      }
    },
    [],
  );

  const uploadToCloudinary = async () => {
    if (!file) throw new Error("No file selected");

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
      throw new Error(err?.error?.message ?? "Cloudinary upload failed");
    }
    return res.json();
  };

  const getAiTags = async (imageUrl: string): Promise<AiSuggestion> => {
    const res = await fetch("/api/admin/tags", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageUrl }),
    });

    if (!res.ok) throw new Error("AI tag generation failed");
    return res.json();
  };

  const handleUpload = async () => {
    if (!file || !title) return;
    setState("uploading");
    setError("");

    try {
      console.log("Cloud name:", process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
      const uploaded = await uploadToCloudinary();
      setCloudinaryId(uploaded.public_id);
      setWidth(uploaded.width);
      setHeight(uploaded.height);

      setState("tagging");
      const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const imageUrl = `https://res.cloudinary.com/${cloud}/image/upload/${uploaded.public_id}`;

      try {
        const suggestion = await getAiTags(imageUrl);
        setAiSuggestion(suggestion);
        if (!tags) setTags(suggestion.tags.join(", "));
        if (!location) setLocation(suggestion.location);
        if (!caption) setCaption(suggestion.caption);
      } catch {
        // AI tagging is non-critical, continue without it
      }

      setState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setState("error");
    }
  };

  const handleSave = async () => {
    if (!cloudinaryId) return;
    setState("saving");

    try {
      const res = await fetch("/api/admin/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          cloudinaryId,
          format,
          width,
          height,
          aspectRatio: width / height,
          location: location || null,
          caption: caption || null,
          featured,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          ...exif,
        }),
      });

      if (!res.ok) throw new Error("Failed to save photo");
      setState("done");

      setTimeout(() => {
        setFile(null);
        setPreview(null);
        setCloudinaryId("");
        setTitle("");
        setSlug("");
        setTags("");
        setLocation("");
        setCaption("");
        setExif({});
        setAiSuggestion(null);
        setState("idle");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setState("error");
    }
  };

  const isFilm = format !== "DIGITAL";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080A0C",
        padding: "2rem",
        color: "#F0F2F4",
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "3rem",
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "28px",
              fontWeight: 300,
              letterSpacing: "0.1em",
            }}
          >
            Upload
          </h1>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(240,242,244,0.3)",
              marginTop: "0.25rem",
            }}
          >
            Canopus Admin
          </p>
        </div>
        <button
          onClick={() => router.push("/")}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "rgba(240,242,244,0.4)",
            background: "transparent",
            border: "0.5px solid rgba(255,255,255,0.1)",
            padding: "0.5rem 1rem",
            cursor: "pointer",
          }}
        >
          View site
        </button>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem" }}
      >
        {/* Left: File drop + Preview */}
        <div>
          <label
            style={{
              display: "block",
              border: "0.5px solid rgba(255,255,255,0.1)",
              aspectRatio: "4/3",
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <input
              type="file"
              accept="image/*"
              onChange={onFileChange}
              style={{ display: "none" }}
            />
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.75rem",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "rgba(240,242,244,0.2)",
                  }}
                >
                  Select image
                </span>
              </div>
            )}
          </label>

          {/* AI suggestion preview */}
          {aiSuggestion && (
            <div
              style={{
                marginTop: "1rem",
                padding: "1rem",
                background: "rgba(255,255,255,0.03)",
                border: "0.5px solid rgba(255,255,255,0.08)",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "9px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "rgba(240,242,244,0.3)",
                  marginBottom: "0.5rem",
                }}
              >
                AI Suggestions applied
              </p>
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "rgba(240,242,244,0.5)",
                }}
              >
                {aiSuggestion.tags.join(", ")}
              </p>
            </div>
          )}

          {/* Upload button */}
          {file && !cloudinaryId && (
            <button
              onClick={handleUpload}
              disabled={state === "uploading" || state === "tagging"}
              style={{
                marginTop: "1rem",
                width: "100%",
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                padding: "0.85rem",
                background: "rgba(240,242,244,0.08)",
                border: "0.5px solid rgba(255,255,255,0.15)",
                color: "#F0F2F4",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {state === "uploading"
                ? "Uploading..."
                : state === "tagging"
                  ? "Getting AI tags..."
                  : "Upload to Cloudinary"}
            </button>
          )}

          {cloudinaryId && (
            <div
              style={{
                marginTop: "1rem",
                padding: "0.75rem 1rem",
                background: "rgba(93,187,138,0.08)",
                border: "0.5px solid rgba(93,187,138,0.2)",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  letterSpacing: "0.1em",
                  color: "#5DBB8A",
                }}
              >
                Uploaded to Cloudinary
              </p>
            </div>
          )}
        </div>

        {/* Right: Metadata form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Slug">
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Format">
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as typeof format)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="DIGITAL">Digital</option>
              <option value="FILM_35MM">35mm Film</option>
              <option value="FILM_120">120 Film</option>
            </select>
          </Field>

          <Field label="Tags (comma separated)">
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="landscape, golden hour, cayman"
              style={inputStyle}
            />
          </Field>

          <Field label="Location">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Caption">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </Field>

          {/* EXIF fields */}
          <div
            style={{
              borderTop: "0.5px solid rgba(255,255,255,0.06)",
              paddingTop: "1rem",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(240,242,244,0.3)",
                marginBottom: "0.75rem",
              }}
            >
              {isFilm ? "Film data" : "EXIF data"}
            </p>

            {!isFilm ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <Field label="Camera">
                  <input
                    value={exif.camera ?? ""}
                    onChange={(e) =>
                      setExif((x) => ({ ...x, camera: e.target.value }))
                    }
                    style={inputStyle}
                  />
                </Field>
                <Field label="Lens">
                  <input
                    value={exif.lens ?? ""}
                    onChange={(e) =>
                      setExif((x) => ({ ...x, lens: e.target.value }))
                    }
                    style={inputStyle}
                  />
                </Field>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.75rem",
                  }}
                >
                  <Field label="Focal length">
                    <input
                      value={exif.focalLength ?? ""}
                      onChange={(e) =>
                        setExif((x) => ({ ...x, focalLength: e.target.value }))
                      }
                      placeholder="50mm"
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Aperture">
                    <input
                      value={exif.aperture ?? ""}
                      onChange={(e) =>
                        setExif((x) => ({ ...x, aperture: e.target.value }))
                      }
                      placeholder="2.8"
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Shutter speed">
                    <input
                      value={exif.shutterSpeed ?? ""}
                      onChange={(e) =>
                        setExif((x) => ({ ...x, shutterSpeed: e.target.value }))
                      }
                      placeholder="1/250"
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="ISO">
                    <input
                      value={exif.iso ?? ""}
                      onChange={(e) =>
                        setExif((x) => ({ ...x, iso: e.target.value }))
                      }
                      placeholder="400"
                      style={inputStyle}
                    />
                  </Field>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <Field label="Camera">
                  <input
                    value={exif.camera ?? ""}
                    onChange={(e) =>
                      setExif((x) => ({ ...x, camera: e.target.value }))
                    }
                    style={inputStyle}
                  />
                </Field>
                <Field label="Film stock">
                  <input
                    value={exif.filmStock ?? ""}
                    onChange={(e) =>
                      setExif((x) => ({ ...x, filmStock: e.target.value }))
                    }
                    placeholder="Kodak Portra 400"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Film format">
                  <input
                    value={exif.filmFormat ?? ""}
                    onChange={(e) =>
                      setExif((x) => ({ ...x, filmFormat: e.target.value }))
                    }
                    placeholder="135 / 120"
                    style={inputStyle}
                  />
                </Field>
              </div>
            )}
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              cursor: "pointer",
              marginTop: "0.5rem",
            }}
          >
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "rgba(240,242,244,0.5)",
              }}
            >
              Featured on homepage
            </span>
          </label>

          {/* Save button */}
          {cloudinaryId && (
            <button
              onClick={handleSave}
              disabled={state === "saving" || state === "done"}
              style={{
                marginTop: "0.5rem",
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                padding: "0.85rem",
                background:
                  state === "done"
                    ? "rgba(93,187,138,0.15)"
                    : "rgba(240,242,244,0.08)",
                border: `0.5px solid ${
                  state === "done"
                    ? "rgba(93,187,138,0.3)"
                    : "rgba(255,255,255,0.15)"
                }`,
                color: state === "done" ? "#5DBB8A" : "#F0F2F4",
                cursor: state === "saving" ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {state === "saving"
                ? "Saving..."
                : state === "done"
                  ? "Saved!"
                  : "Save photo"}
            </button>
          )}

          {error && (
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "#E07070",
                letterSpacing: "0.1em",
              }}
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "0.5px solid rgba(255,255,255,0.1)",
  padding: "0.6rem 0.75rem",
  color: "#F0F2F4",
  fontFamily: "var(--font-mono)",
  fontSize: "12px",
  outline: "none",
  transition: "border-color 0.2s",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <label
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
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
