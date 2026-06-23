"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Passwort muss mindestens 8 Zeichen haben."); return; }
    if (password !== confirm) { setError("Passwörter stimmen nicht überein."); return; }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, email, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? "Fehler beim Zurücksetzen."); return; }
    router.push("/login?reset=1");
  }

  if (!token || !email) {
    return (
      <div className="text-center space-y-3">
        <p className="text-sm text-red-600">Ungültiger Reset-Link.</p>
        <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
          Neuen Link anfordern
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-600">
        Neues Passwort für <span className="font-medium">{email}</span>
      </p>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Neues Passwort</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Min. 8 Zeichen"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Passwort bestätigen</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Passwort wiederholen"
        />
      </div>
      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
      >
        {loading ? "Wird gespeichert…" : "Passwort speichern"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Zeitabrechnung</h1>
          <p className="text-slate-500 mt-1 text-sm">Neues Passwort setzen</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Suspense fallback={<p className="text-sm text-slate-400 text-center">Laden…</p>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
