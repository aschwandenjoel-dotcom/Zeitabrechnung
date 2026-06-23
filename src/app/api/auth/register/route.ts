import { NextResponse } from "next/server";
import { sql, initDb } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { name, email, password } = await req.json();

  if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Name, E-Mail und Passwort (min. 8 Zeichen) erforderlich." },
      { status: 400 }
    );
  }

  await initDb();

  const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Diese E-Mail ist bereits registriert." },
      { status: 409 }
    );
  }

  const hash = await bcrypt.hash(password, 12);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2);

  await sql`
    INSERT INTO users (id, name, email, password_hash)
    VALUES (${id}, ${name.trim()}, ${email.trim().toLowerCase()}, ${hash})
  `;

  return NextResponse.json({ ok: true }, { status: 201 });
}
