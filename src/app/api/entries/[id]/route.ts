import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { TimeEntry } from "@/lib/types";

const FILE = join(process.cwd(), "data", "entries.json");

function readEntries(): TimeEntry[] {
  if (!existsSync(FILE)) return [];
  return JSON.parse(readFileSync(FILE, "utf-8"));
}

function writeEntries(entries: TimeEntry[]) {
  writeFileSync(FILE, JSON.stringify(entries, null, 2), "utf-8");
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  writeEntries(readEntries().filter((e) => e.id !== id));
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const updated: TimeEntry = await req.json();
  writeEntries(readEntries().map((e) => (e.id === id ? updated : e)));
  return NextResponse.json(updated);
}
