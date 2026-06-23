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
      u.id, u.name, u.email, u.image, u.role, u.created_at,
      COUNT(e.id)::int AS entry_count,
      COALESCE(SUM(e.duration_minutes), 0)::int AS total_minutes
    FROM users u
    LEFT JOIN entries e ON e.user_id = u.id
    GROUP BY u.id, u.name, u.email, u.image, u.role, u.created_at
    ORDER BY u.created_at DESC
  `;

  return NextResponse.json(rows);
}
