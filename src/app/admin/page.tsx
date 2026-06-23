"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { formatDuration, formatChf } from "@/lib/storage";
import { HOURLY_RATE } from "@/lib/types";

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  created_at: string;
  entry_count: number;
  total_minutes: number;
}

interface AdminEntry {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  description: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_image: string | null;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [entries, setEntries] = useState<AdminEntry[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated" && session.user.role !== "admin") {
      router.push("/");
      return;
    }
    if (status === "authenticated") {
      Promise.all([
        fetch("/api/admin/users").then((r) => r.json()),
        fetch("/api/admin/entries").then((r) => r.json()),
      ]).then(([u, e]) => {
        setUsers(u);
        setEntries(e);
        setLoading(false);
      });
    }
  }, [status, session, router]);

  if (status === "loading" || loading) {
    return <div className="text-center text-slate-400 py-20">Laden…</div>;
  }

  const visibleEntries = selectedUserId
    ? entries.filter((e) => e.user_id === selectedUserId)
    : entries;

  const selectedUser = selectedUserId ? users.find((u) => u.id === selectedUserId) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin</h1>
        <p className="text-slate-500 text-sm mt-1">Alle registrierten Benutzer und deren Einträge</p>
      </div>

      {/* Benutzer-Übersicht */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Benutzer ({users.length})</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => setSelectedUserId(selectedUserId === u.id ? null : u.id)}
              className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors ${
                selectedUserId === u.id ? "bg-blue-50" : "hover:bg-slate-50"
              }`}
            >
              <div className="flex-shrink-0">
                {u.image ? (
                  <Image src={u.image} alt={u.name ?? ""} width={36} height={36} className="rounded-full" />
                ) : (
                  <span className="w-9 h-9 rounded-full bg-blue-600 text-white text-sm font-semibold flex items-center justify-center">
                    {(u.name ?? u.email)[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{u.name ?? "—"}</p>
                <p className="text-xs text-slate-500 truncate">{u.email}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-slate-800">{u.entry_count} Einträge</p>
                <p className="text-xs text-slate-500">{formatDuration(u.total_minutes)}</p>
              </div>
              {u.role === "admin" && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Admin</span>
              )}
            </button>
          ))}
          {users.length === 0 && (
            <p className="px-5 py-8 text-center text-slate-400 text-sm">Noch keine Benutzer.</p>
          )}
        </div>
      </div>

      {/* Einträge */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">
            {selectedUser
              ? `Einträge von ${selectedUser.name ?? selectedUser.email}`
              : `Alle Einträge (${entries.length})`}
          </h2>
          {selectedUserId && (
            <button
              onClick={() => setSelectedUserId(null)}
              className="text-xs text-blue-600 hover:underline"
            >
              Alle anzeigen
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {visibleEntries.map((e) => (
            <div key={e.id} className="px-5 py-3.5 flex items-center gap-4">
              <div className="w-24 flex-shrink-0">
                <p className="text-xs font-medium text-slate-700">
                  {format(parseISO(e.date), "dd. MMM", { locale: de })}
                </p>
                <p className="text-xs text-slate-400">{e.start_time} – {e.end_time}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 truncate">{e.description}</p>
                {!selectedUserId && (
                  <p className="text-xs text-slate-400 truncate">{e.user_name ?? e.user_email}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-slate-800">{formatDuration(e.duration_minutes)}</p>
                <p className="text-xs text-slate-500">CHF {formatChf(e.duration_minutes, HOURLY_RATE)}</p>
              </div>
            </div>
          ))}
          {visibleEntries.length === 0 && (
            <p className="px-5 py-8 text-center text-slate-400 text-sm">Keine Einträge.</p>
          )}
        </div>
      </div>
    </div>
  );
}
