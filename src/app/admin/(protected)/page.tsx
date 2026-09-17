import { Library } from "@/components/admin/Library";

export default function AdminIndex() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-light text-text">Library</h1>
      <Library />
    </div>
  );
}
