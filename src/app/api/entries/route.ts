import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { TimeEntry } from "@/lib/types";

const FILE = join(process.cwd(), "data", "entries.json");

function readEntries(): TimeEntry[] {
  if (!existsSync(FILE)) {
    mkdirSync(join(process.cwd(), "data"), { recursive: true });
    writeFileSync(FILE, "[]", "utf-8");
    return [];
  }
  return JSON.parse(readFileSync(FILE, "utf-8"));
}

function writeEntries(entries: TimeEntry[]) {
  writeFileSync(FILE, JSON.stringify(entries, null, 2), "utf-8");
}

export async function GET() {
  return NextResponse.json(readEntries());
}

export async function POST(req: Request) {
  const entry: TimeEntry = await req.json();
  const entries = readEntries();
  entries.push(entry);
  writeEntries(entries);
  return NextResponse.json(entry, { status: 201 });
}
