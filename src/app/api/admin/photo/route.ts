import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  console.log("Photo API route hit");
  try {
    const body = await request.json();
    console.log("Body received:", JSON.stringify(body, null, 2));

    const photo = await db.photo.create({
      data: {
        title: body.title,
        slug: body.slug,
        cloudinaryId: body.cloudinaryId,
        format: body.format,
        width: Number(body.width),
        height: Number(body.height),
        aspectRatio: Number(body.aspectRatio),
        tags: body.tags ?? [],
        featured: body.featured ?? false,
        location: body.location ?? null,
        caption: body.caption ?? null,
        camera: body.camera ?? null,
        lens: body.lens ?? null,
        focalLength: body.focalLength ?? null,
        aperture: body.aperture ?? null,
        shutterSpeed: body.shutterSpeed ?? null,
        iso: body.iso ?? null,
        filmStock: body.filmStock ?? null,
        filmFormat: body.filmFormat ?? null,
      },
    });

    console.log("Photo saved:", photo.id);
    return NextResponse.json({ ok: true, photo });
  } catch (err) {
    console.error("Photo save error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
