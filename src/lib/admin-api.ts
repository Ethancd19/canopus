/**
 * Typed client helpers for the `/api/admin/*` endpoints, used by the upload
 * queue and (eventually) the library drawer. Every call goes through
 * `adminFetch` so an expired session redirects to the login page instead of
 * the caller misreading an empty 401 body as data.
 */
import { adminFetch } from "@/lib/admin-fetch";
import type { Photo as PrismaPhoto } from "@/generated/prisma/client";
import type { ExifFields } from "@/lib/exif";
import type { TagSuggestion } from "@/lib/tagging";

export type Photo = PrismaPhoto;
export type PhotoFormat = Photo["format"];

export type UploadFields = ExifFields & {
  format?: PhotoFormat;
  /** Pass "1" to bypass the duplicate check on the server. */
  force?: "1";
};

export type UploadPhotoResult =
  | { ok: true; photo: Photo }
  | { ok: false; error: string; existingId?: string };

export type PatchPhotoInput = Partial<{
  title: string;
  slug: string;
  format: PhotoFormat;
  tags: string[];
  featured: boolean;
  order: number;
  published: boolean;
  caption: string;
  location: string;
  takenAt: string;
  camera: string;
  lens: string;
  focalLength: string;
  aperture: string;
  shutterSpeed: string;
  iso: string;
  filmStock: string;
  filmFormat: string;
}>;

export type PatchPhotoResult = { ok: true; photo: Photo } | { ok: false; error: string };

export type DeletePhotoResult = { ok: true } | { ok: false; error: string };

export type TagPhotoResult = ({ ok: true } & TagSuggestion) | { ok: false; error: string };

export type ListPhotosResult = { ok: true; photos: Photo[] } | { ok: false; error: string };

/** Uploads a (already-compressed) file plus any known EXIF/format text fields. */
export async function uploadPhoto(file: File, fields: UploadFields = {}): Promise<UploadPhotoResult> {
  const form = new FormData();
  form.append("file", file, file.name);
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string" && value !== "") form.append(key, value);
  }
  const res = await adminFetch("/api/admin/uploads", { method: "POST", body: form });
  return (await res.json()) as UploadPhotoResult;
}

/** Patches the editable fields of a photo row. */
export async function patchPhoto(id: string, data: PatchPhotoInput): Promise<PatchPhotoResult> {
  const res = await adminFetch(`/api/admin/photo/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return (await res.json()) as PatchPhotoResult;
}

/** Deletes a photo row (and its stored object, server-side). */
export async function deletePhoto(id: string): Promise<DeletePhotoResult> {
  const res = await adminFetch(`/api/admin/photo/${id}`, { method: "DELETE" });
  return (await res.json()) as DeletePhotoResult;
}

/** Asks the AI tagger for tags/location/caption suggestions for a stored image. */
export async function tagPhoto(storageKey: string): Promise<TagPhotoResult> {
  const res = await adminFetch("/api/admin/tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storageKey }),
  });
  return (await res.json()) as TagPhotoResult;
}

/** Lists every photo row, newest first. */
export async function listPhotos(): Promise<ListPhotosResult> {
  const res = await adminFetch("/api/admin/photos");
  return (await res.json()) as ListPhotosResult;
}
