import type { Photo as PrismaPhoto } from "@/generated/prisma/client";

export type Photo = Pick<
  PrismaPhoto,
  | "id"
  | "title"
  | "slug"
  | "cloudinaryId"
  | "storageKey"
  | "blurDataUrl"
  | "format"
  | "tags"
  | "width"
  | "height"
  | "aspectRatio"
  | "location"
  | "caption"
  | "camera"
  | "lens"
  | "focalLength"
  | "aperture"
  | "shutterSpeed"
  | "iso"
  | "filmStock"
  | "filmFormat"
>;
