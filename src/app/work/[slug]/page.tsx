import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedCollection, getPublishedCollectionSlugs } from "@/lib/public-queries";
import CollectionClient from "@/components/CollectionClient";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getPublishedCollectionSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getPublishedCollection(slug);
  return collection ? { title: `${collection.title} · Canopus`, description: collection.description ?? undefined } : {};
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = await getPublishedCollection(slug);
  if (!collection) notFound();
  return <CollectionClient collection={collection} />;
}
