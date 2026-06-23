import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL ist nicht gesetzt. Bitte .env.local prüfen.");
}

export const sql = neon(process.env.DATABASE_URL);

export async function initDb() {
  // Auth.js-Tabellen (Spaltennamen exakt nach @auth/neon-adapter erwartet)
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name          TEXT,
      email         TEXT UNIQUE,
      "emailVerified" TIMESTAMPTZ,
      image         TEXT,
      password_hash TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS accounts (
      id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "userId"             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type                 TEXT NOT NULL,
      provider             TEXT NOT NULL,
      "providerAccountId"  TEXT NOT NULL,
      refresh_token        TEXT,
      access_token         TEXT,
      expires_at           BIGINT,
      token_type           TEXT,
      scope                TEXT,
      id_token             TEXT,
      session_state        TEXT,
      UNIQUE(provider, "providerAccountId")
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "sessionToken" TEXT UNIQUE NOT NULL,
      "userId"       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires        TIMESTAMPTZ NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier TEXT NOT NULL,
      token      TEXT NOT NULL,
      expires    TIMESTAMPTZ NOT NULL,
      UNIQUE(identifier, token)
    )
  `;

  // Einträge-Tabelle mit user_id
  await sql`
    CREATE TABLE IF NOT EXISTS entries (
      id               TEXT PRIMARY KEY,
      user_id          TEXT REFERENCES users(id) ON DELETE CASCADE,
      date             TEXT NOT NULL,
      start_time       TEXT NOT NULL,
      end_time         TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      description      TEXT NOT NULL DEFAULT ''
    )
  `;

  // Migration: user_id-Spalte zu bestehenden Einträgen ergänzen
  await sql`
    ALTER TABLE entries ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE
  `;
}
