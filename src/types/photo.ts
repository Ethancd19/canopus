import type { Photo as PrismaPhoto } from "@prisma/client";

export type Photo = Pick<
  PrismaPhoto,
  | "id"
  | "title"
  | "slug"
  | "cloudinaryId"
  | "format"
  | "tags"
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
