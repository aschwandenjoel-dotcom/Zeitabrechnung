import { TimeEntry } from "./types";

export async function getEntries(): Promise<TimeEntry[]> {
  try {
    const res = await fetch("/api/entries", { cache: "no-store" });
    if (!res.ok) throw new Error(`API Fehler: ${res.status}`);
    return res.json();
  } catch (e) {
    console.error("getEntries fehlgeschlagen:", e);
    return [];
  }
}

export async function saveEntry(entry: TimeEntry): Promise<void> {
  await fetch("/api/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
}

export async function updateEntry(entry: TimeEntry): Promise<void> {
  await fetch(`/api/entries/${entry.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
}

export async function deleteEntry(id: string): Promise<void> {
  await fetch(`/api/entries/${id}`, { method: "DELETE" });
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function calcDuration(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function formatChf(minutes: number, rate: number): string {
  return ((minutes / 60) * rate).toFixed(2);
}
