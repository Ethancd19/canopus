import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { name, email, subject, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    await resend.emails.send({
      from: "Canopus Contact <contact@bycanopus.com>",
      to: ["ethan@bycanopus.com"],
      replyTo: email,
      subject: subject
        ? `[Canopus] ${subject} — from ${name}`
        : `[Canopus] Message from ${name}`,
      html: `
        <div style="font-family: monospace; font-size: 13px; color: #1a1a1a; max-width: 600px;">
          <p style="margin-bottom: 0.5rem;"><strong>From:</strong> ${name} (${email})</p>
          ${subject ? `<p style="margin-bottom: 0.5rem;"><strong>Subject:</strong> ${subject}</p>` : ""}
          <hr style="border: none; border-top: 1px solid #eee; margin: 1rem 0;" />
          <p style="white-space: pre-wrap; line-height: 1.7;">${message}</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
