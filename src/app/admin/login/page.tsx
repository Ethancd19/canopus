import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/admin");
  return <LoginForm />;
}
