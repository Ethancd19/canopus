/**
 * Typed client helpers for the `/api/admin/*` endpoints, used by the upload
 * queue and (eventually) the library drawer. Every call goes through
 * `adminFetch` so an expired session redirects to the login page instead of
 * the caller misreading an empty 401 body as data.
 */
import { adminFetch } from "@/lib/admin-fetch";
import type { Photo as PrismaPhoto, Collection as PrismaCollection } from "@/generated/prisma/client";
import type { ExifFields } from "@/lib/exif";
import type { TagSuggestion } from "@/lib/tagging";
import type { BulkAction } from "@/lib/bulk";

export type Photo = PrismaPhoto;
export type Collection = PrismaCollection;
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

export type BulkPhotosPayload = { tag?: string; collectionId?: string };

export type BulkPhotosResult = { ok: true; count: number } | { ok: false; error: string };

export type OrderPhotosResult = { ok: true; count: number } | { ok: false; error: string };

export type CollectionWithCover = Collection & { cover: Photo | null; _count: { photos: number } };

export type ListCollectionsResult =
  | { ok: true; collections: CollectionWithCover[] }
  | { ok: false; error: string };

export type CreateCollectionInput = { title: string; description?: string };

export type CreateCollectionResult = { ok: true; collection: Collection } | { ok: false; error: string };

export type CollectionPhotoWithPhoto = { collectionId: string; photoId: string; order: number; photo: Photo };

export type GetCollectionResult =
  | { ok: true; collection: Collection & { cover: Photo | null }; photos: CollectionPhotoWithPhoto[] }
  | { ok: false; error: string };

export type PatchCollectionInput = Partial<{
  title: string;
  slug: string;
  description: string;
  published: boolean;
  coverId: string | null;
  order: number;
}>;

export type PatchCollectionResult = { ok: true; collection: Collection } | { ok: false; error: string };

export type DeleteCollectionResult = { ok: true } | { ok: false; error: string };

export type CollectionPhotosResult = { ok: true; count: number } | { ok: false; error: string };

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

/** Applies a bulk action (publish/unpublish/delete/tag/collection) to a set of photo ids. */
export async function bulkPhotos(
  ids: string[],
  action: BulkAction,
  payload?: BulkPhotosPayload,
): Promise<BulkPhotosResult> {
  const res = await adminFetch("/api/admin/photos/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ? { ids, action, payload } : { ids, action }),
  });
  return (await res.json()) as BulkPhotosResult;
}

/** Reorders photos to match the given id order. */
export async function orderPhotos(ids: string[]): Promise<OrderPhotosResult> {
  const res = await adminFetch("/api/admin/photos/order", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  return (await res.json()) as OrderPhotosResult;
}

/** Lists every collection, with its cover photo and member count. */
export async function listCollections(): Promise<ListCollectionsResult> {
  const res = await adminFetch("/api/admin/collections");
  return (await res.json()) as ListCollectionsResult;
}

/** Creates a collection from a title (and optional description); slug and published default server-side. */
export async function createCollection(input: CreateCollectionInput): Promise<CreateCollectionResult> {
  const res = await adminFetch("/api/admin/collections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await res.json()) as CreateCollectionResult;
}

/** Fetches a collection and its ordered member photos. */
export async function getCollection(id: string): Promise<GetCollectionResult> {
  const res = await adminFetch(`/api/admin/collections/${id}`);
  return (await res.json()) as GetCollectionResult;
}

/** Patches the editable fields of a collection. */
export async function patchCollection(id: string, data: PatchCollectionInput): Promise<PatchCollectionResult> {
  const res = await adminFetch(`/api/admin/collections/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return (await res.json()) as PatchCollectionResult;
}

/** Deletes a collection (its memberships cascade). */
export async function deleteCollection(id: string): Promise<DeleteCollectionResult> {
  const res = await adminFetch(`/api/admin/collections/${id}`, { method: "DELETE" });
  return (await res.json()) as DeleteCollectionResult;
}

/** Replaces a collection's full ordered membership with `ids`. */
export async function setCollectionPhotos(id: string, ids: string[]): Promise<CollectionPhotosResult> {
  const res = await adminFetch(`/api/admin/collections/${id}/photos`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  return (await res.json()) as CollectionPhotosResult;
}

/** Adds photos to a collection, appended after the current order. */
export async function addCollectionPhotos(id: string, ids: string[]): Promise<CollectionPhotosResult> {
  const res = await adminFetch(`/api/admin/collections/${id}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  return (await res.json()) as CollectionPhotosResult;
}

/** Removes photos from a collection. */
export async function removeCollectionPhotos(id: string, ids: string[]): Promise<CollectionPhotosResult> {
  const res = await adminFetch(`/api/admin/collections/${id}/photos`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  return (await res.json()) as CollectionPhotosResult;
}
