import { CollectionDetail } from "@/components/admin/CollectionDetail";

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CollectionDetail id={id} />;
}
