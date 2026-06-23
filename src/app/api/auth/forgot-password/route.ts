import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "E-Mail fehlt." }, { status: 400 });

  const rows = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`;
  // Immer OK zurückgeben — kein Hinweis ob E-Mail existiert
  if (rows.length === 0) return NextResponse.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 Minuten

  await sql`
    INSERT INTO verification_tokens (identifier, token, expires)
    VALUES (${email.toLowerCase()}, ${token}, ${expires})
    ON CONFLICT (identifier, token) DO UPDATE SET expires = ${expires}
  `;

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}&email=${encodeURIComponent(email.toLowerCase())}`;

  if (process.env.RESEND_API_KEY) {
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Zeitabrechnung <noreply@resend.dev>",
      to: email,
      subject: "Passwort zurücksetzen — Zeitabrechnung",
      html: `
        <p>Hallo,</p>
        <p>Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt.</p>
        <p>
          <a href="${resetUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">
            Passwort zurücksetzen
          </a>
        </p>
        <p>Dieser Link ist 15 Minuten gültig.</p>
        <p>Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.</p>
      `,
    });
  } else {
    // Dev-Fallback: Link in Konsole ausgeben
    console.log("[DEV] Passwort-Reset-Link:", resetUrl);
  }

  return NextResponse.json({ ok: true });
}
