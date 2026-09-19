import { FeaturedOrder } from "@/components/admin/FeaturedOrder";

export default function FeaturedPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-light text-text">Featured order</h1>
      <FeaturedOrder />
    </div>
  );
}
