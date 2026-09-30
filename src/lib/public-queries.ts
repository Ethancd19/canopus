import { db } from "@/lib/db";
import { SPORTS_GENRES, type SportsGenre } from "@/lib/site";
import type { Photo } from "@/types/photo";

export const PUBLIC_PHOTO_SELECT = {
  id: true,
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

export type SportsGenreSummary = SportsGenre & {
  /** Description from the published collection, if it has one. */
  description: string | null;
  /** Published photos in the genre's collection; 0 when the collection is missing or unpublished. */
  count: number;
  cover: Photo | null;
};

/**
 * One summary per configured sports genre, in SPORTS_GENRES order, whether or
 * not its collection exists yet. Runs one query for all genres.
 */
export async function getSportsGenres(): Promise<SportsGenreSummary[]> {
  const collections = await db.collection.findMany({
    where: { slug: { in: SPORTS_GENRES.map((genre) => genre.slug) }, published: true },
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
  const bySlug = new Map(collections.map((collection) => [collection.slug, collection]));

  return SPORTS_GENRES.map((genre) => {
    const collection = bySlug.get(genre.slug);
    if (!collection) {
      return { ...genre, description: null, count: 0, cover: null };
    }
    let cover: Photo | null = null;
    if (collection.cover && collection.cover.published) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { published, ...rest } = collection.cover;
      cover = rest;
    } else if (collection.photos.length > 0) {
      cover = collection.photos[0].photo;
    }
    return {
      ...genre,
      description: collection.description,
      count: collection._count.photos,
      cover,
    };
  });
}

export async function getPublishedCollectionSlugs(): Promise<string[]> {
  const collections = await db.collection.findMany({
    where: { published: true },
    select: { slug: true },
  });
  return collections.map((c) => c.slug);
}
