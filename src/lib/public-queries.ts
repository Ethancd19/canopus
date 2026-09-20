import { db } from "@/lib/db";
import type { Photo } from "@/types/photo";

export const PUBLIC_PHOTO_SELECT = {
  id: true,
  title: true,
  slug: true,
  storageKey: true,
  blurDataUrl: true,
  format: true,
  tags: true,
  width: true,
  height: true,
  aspectRatio: true,
  location: true,
  caption: true,
  camera: true,
  lens: true,
  focalLength: true,
  aperture: true,
  shutterSpeed: true,
  iso: true,
  filmStock: true,
  filmFormat: true,
} as const satisfies Record<keyof Photo, true>;

export async function getFeaturedPhotos(): Promise<Photo[]> {
  return db.photo.findMany({
    where: { featured: true, published: true },
    orderBy: { order: "asc" },
    select: PUBLIC_PHOTO_SELECT,
  });
}

export async function getPublishedPhotos(): Promise<Photo[]> {
  return db.photo.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    select: PUBLIC_PHOTO_SELECT,
  });
}

export type PublicCollectionSummary = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  count: number;
  cover: Photo | null;
};

export async function getPublishedCollections(): Promise<PublicCollectionSummary[]> {
  const collections = await db.collection.findMany({
    where: { published: true },
    orderBy: { order: "asc" },
    include: {
      cover: { select: { ...PUBLIC_PHOTO_SELECT, published: true } },
      photos: {
        take: 1,
        orderBy: { order: "asc" },
        where: { photo: { published: true } },
        select: { photo: { select: PUBLIC_PHOTO_SELECT } },
      },
      _count: { select: { photos: { where: { photo: { published: true } } } } },
    },
  });

  return collections.map((collection) => {
    let cover: Photo | null = null;
    if (collection.cover && collection.cover.published) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { published, ...rest } = collection.cover;
      cover = rest;
    } else if (collection.photos.length > 0) {
      cover = collection.photos[0].photo;
    }

    return {
      id: collection.id,
      slug: collection.slug,
      title: collection.title,
      description: collection.description,
      count: collection._count.photos,
      cover,
    };
  });
}

export type PublicCollection = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  photos: Photo[];
};

export async function getPublishedCollection(
  slug: string,
): Promise<PublicCollection | null> {
  const collection = await db.collection.findFirst({
    where: { slug, published: true },
    include: {
      photos: {
        where: { photo: { published: true } },
        orderBy: { order: "asc" },
        select: { photo: { select: PUBLIC_PHOTO_SELECT } },
      },
    },
  });

  if (!collection) {
    return null;
  }

  return {
    id: collection.id,
    slug: collection.slug,
    title: collection.title,
    description: collection.description,
    photos: collection.photos.map((member) => member.photo),
  };
}

export async function getPublishedCollectionSlugs(): Promise<string[]> {
  const collections = await db.collection.findMany({
    where: { published: true },
    select: { slug: true },
  });
  return collections.map((c) => c.slug);
}
