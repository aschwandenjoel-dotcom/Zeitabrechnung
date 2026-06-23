import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL ist nicht gesetzt. Bitte .env.local prüfen.");
}

export const sql = neon(process.env.DATABASE_URL);

export async function initDb() {
  // Auth.js-Tabellen (users, accounts, sessions, verification_tokens)
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      name          TEXT,
      email         TEXT UNIQUE,
      email_verified TIMESTAMPTZ,
      image         TEXT,
      password_hash TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS accounts (
      id                  TEXT PRIMARY KEY,
      user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type                TEXT NOT NULL,
      provider            TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      refresh_token       TEXT,
      access_token        TEXT,
      expires_at          BIGINT,
      token_type          TEXT,
      scope               TEXT,
      id_token            TEXT,
      session_state       TEXT,
      UNIQUE(provider, provider_account_id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id            TEXT PRIMARY KEY,
      session_token TEXT UNIQUE NOT NULL,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires       TIMESTAMPTZ NOT NULL
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
