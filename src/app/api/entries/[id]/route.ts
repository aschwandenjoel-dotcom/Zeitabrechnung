import { NextResponse } from "next/server";
import { sql, initDb } from "@/lib/db";
import { TimeEntry } from "@/lib/types";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  await initDb();
  const { id } = await ctx.params;
  await sql`DELETE FROM entries WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  await initDb();
  const { id } = await ctx.params;
  const e: TimeEntry = await req.json();
  await sql`
    UPDATE entries
    SET date = ${e.date},
        start_time = ${e.startTime},
        end_time = ${e.endTime},
        duration_minutes = ${e.durationMinutes},
        description = ${e.description}
    WHERE id = ${id}
  `;
  return NextResponse.json(e);
}
