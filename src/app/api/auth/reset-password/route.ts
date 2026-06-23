import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { token, email, password } = await req.json();

  if (!token || !email || !password || password.length < 8) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const rows = await sql`
    SELECT * FROM verification_tokens
    WHERE identifier = ${email.toLowerCase()} AND token = ${token} AND expires > NOW()
  `;

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Link ungültig oder abgelaufen. Bitte erneut anfordern." },
      { status: 400 }
    );
  }

  const hash = await bcrypt.hash(password, 12);
  await sql`UPDATE users SET password_hash = ${hash} WHERE email = ${email.toLowerCase()}`;
  await sql`DELETE FROM verification_tokens WHERE identifier = ${email.toLowerCase()} AND token = ${token}`;

  return NextResponse.json({ ok: true });
}
