import { db } from "@/lib/db";
import HomeClient from "@/components/HomeClient";

export const revalidate = 0;

export default async function Home() {
  const photos = await db.photo.findMany({
    where: { featured: true },
    orderBy: { order: "asc" },
  });

  return <HomeClient photos={photos} />;
}
