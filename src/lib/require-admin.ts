import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api";

/**
 * Returns a 401 Response when no admin session exists, otherwise null.
 * Usage in a route handler:
 *   const denied = await requireAdmin(); if (denied) return denied;
 */
export async function requireAdmin(): Promise<Response | null> {
  const session = await auth();
  if (!session?.user) return apiError("unauthorized", 401);
  return null;
}
