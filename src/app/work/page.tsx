import { getPublishedPhotos, getPublishedCollections } from "@/lib/public-queries";
import WorkClient from "@/components/WorkClient";

export const revalidate = 60;

export default async function WorkPage() {
  const [photos, collections] = await Promise.all([
    getPublishedPhotos(),
    getPublishedCollections(),
  ]);

  return <WorkClient photos={photos} collections={collections} />;
}
