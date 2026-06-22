import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL ist nicht gesetzt. Bitte .env.local prüfen.");
}

export const sql = neon(process.env.DATABASE_URL);

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS entries (
      id            TEXT PRIMARY KEY,
      date          TEXT NOT NULL,
      start_time    TEXT NOT NULL,
      end_time      TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      description   TEXT NOT NULL DEFAULT ''
    )
  `;
}
