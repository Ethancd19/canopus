import { NextResponse } from "next/server";

export function apiOk<T extends object>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, ...data }, init);
}

export function apiError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export function handleRouteError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error("[api] route error:", err);
  return apiError(message, 500);
}
