import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Server-only. Redirects to the login page when no admin session exists. */
export async function requireAdminPage(): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
}
