import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const photo = await db.photo.update({
      where: { id: params.id },
      data: body,
    });
    return NextResponse.json({ ok: true, photo });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    await db.photo.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
