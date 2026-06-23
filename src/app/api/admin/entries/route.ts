import { NextResponse } from "next/server";
import { sql, initDb } from "@/lib/db";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response(null, { status: 401 });
  if (session.user.role !== "admin") return new Response(null, { status: 403 });

  await initDb();

  const rows = await sql`
    SELECT
      e.id, e.date, e.start_time, e.end_time, e.duration_minutes, e.description,
      u.id   AS user_id,
      u.name AS user_name,
      u.email AS user_email,
      u.image AS user_image
    FROM entries e
    JOIN users u ON u.id = e.user_id
    ORDER BY e.date DESC, e.start_time DESC
  `;

  return NextResponse.json(rows);
}
