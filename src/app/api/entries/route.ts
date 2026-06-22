import { NextResponse } from "next/server";
import { sql, initDb } from "@/lib/db";
import { TimeEntry } from "@/lib/types";

export async function GET() {
  await initDb();
  const rows = await sql`
    SELECT id, date, start_time, end_time, duration_minutes, description
    FROM entries
    ORDER BY date DESC, start_time DESC
  `;
  const entries: TimeEntry[] = rows.map((r) => ({
    id: r.id,
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    durationMinutes: r.duration_minutes,
    description: r.description,
  }));
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  await initDb();
  const e: TimeEntry = await req.json();
  await sql`
    INSERT INTO entries (id, date, start_time, end_time, duration_minutes, description)
    VALUES (${e.id}, ${e.date}, ${e.startTime}, ${e.endTime}, ${e.durationMinutes}, ${e.description})
  `;
  return NextResponse.json(e, { status: 201 });
}
