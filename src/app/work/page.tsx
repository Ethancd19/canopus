import { db } from "@/lib/db";
import WorkClient from "@/components/WorkClient";

export default async function WorkPage() {
  const photos = await db.photo.findMany({
    orderBy: { createdAt: "desc" },
  });

  return <WorkClient photos={photos} />;
}
