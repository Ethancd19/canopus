import { NextResponse } from "next/server";
import { Resend } from "resend";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  try {
    const { name, email, subject, message } = await request.json();
    if (!name || !email || !message) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 },
      );
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = subject ? escapeHtml(subject) : "";
    const safeMessage = escapeHtml(message);
    await resend.emails.send({
      from: "Canopus Contact <contact@bycanopus.com>",
      to: ["ethan@bycanopus.com"],
      replyTo: email,
      subject: subject
        ? `[Canopus] ${subject} — from ${name}`
        : `[Canopus] Message from ${name}`,
      html: `
        <div style="font-family: monospace; font-size: 13px; color: #1a1a1a; max-width: 600px;">
          <p><strong>From:</strong> ${safeName} (${safeEmail})</p>
          ${safeSubject ? `<p><strong>Subject:</strong> ${safeSubject}</p>` : ""}
          <hr style="border: none; border-top: 1px solid #eee; margin: 1rem 0;" />
          <p style="white-space: pre-wrap; line-height: 1.7;">${safeMessage}</p>
        </div>
      `,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: "Failed to send message" },
      { status: 500 },
    );
  }
}
