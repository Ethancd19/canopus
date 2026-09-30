import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedCollection, getSportsGenres } from "@/lib/public-queries";
import { getSportsGenre, SPORTS_GENRES } from "@/lib/site";
import SportsGenreClient from "@/components/sports/SportsGenreClient";

export const revalidate = 60;
export const dynamicParams = false;

export async function generateStaticParams() {
  return SPORTS_GENRES.map((genre) => ({ genre: genre.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ genre: string }>;
}): Promise<Metadata> {
  const { genre: slug } = await params;
  const genre = getSportsGenre(slug);
  if (!genre) return {};

  const collection = await getPublishedCollection(slug);
  return {
    title: `${genre.title} · Sports & Events · Canopus`,
    description: collection?.description ?? genre.blurb,
  };
}

export default async function SportsGenrePage({
  params,
}: {
  params: Promise<{ genre: string }>;
}) {
  const { genre: slug } = await params;
  const genre = getSportsGenre(slug);
  if (!genre) notFound();

  const [collection, genres] = await Promise.all([
    getPublishedCollection(slug),
    getSportsGenres(),
  ]);

  return (
    <SportsGenreClient
      genre={genre}
      description={collection?.description ?? null}
      photos={collection?.photos ?? []}
      others={genres.filter((g) => g.slug !== slug)}
    />
  );
}
