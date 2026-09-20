import { getFeaturedPhotos } from "@/lib/public-queries";
import HomeClient from "@/components/HomeClient";

export const revalidate = 60;

export default async function Home() {
  const photos = await getFeaturedPhotos();

  return <HomeClient photos={photos} />;
}
