import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const photos = await db.photo.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ ok: true, photos });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
