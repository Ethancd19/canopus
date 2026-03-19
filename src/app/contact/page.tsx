import { db } from "@/lib/db";
import ContactClient from "@/components/ContactClient";

export default async function ContactPage() {
  const photos = await db.photo.findMany({
    where: { featured: true },
    orderBy: { order: "asc" },
    take: 8,
    select: {
      id: true,
      cloudinaryId: true,
      title: true,
      location: true,
      aspectRatio: true,
    },
  });

  return <ContactClient photos={photos} />;
}
