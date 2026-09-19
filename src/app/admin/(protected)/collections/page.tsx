import { Collections } from "@/components/admin/Collections";

export default function CollectionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-light text-text">Collections</h1>
      <Collections />
    </div>
  );
}
