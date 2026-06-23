"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Zeitabrechnung</h1>
          <p className="text-slate-500 mt-1 text-sm">Passwort zurücksetzen</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {sent ? (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-800">E-Mail gesendet</p>
              <p className="text-sm text-slate-500">
                Falls ein Konto mit dieser Adresse existiert, erhältst du einen Reset-Link. Prüfe auch deinen Spam-Ordner.
              </p>
              <Link href="/login" className="block text-sm text-blue-600 hover:underline mt-4">
                Zurück zum Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-slate-600">
                Gib deine E-Mail-Adresse ein und wir schicken dir einen Link zum Zurücksetzen.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-Mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="deine@email.ch"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
              >
                {loading ? "Wird gesendet…" : "Reset-Link senden"}
              </button>
            </form>
          )}
        </div>

        {!sent && (
          <p className="text-center text-sm text-slate-500 mt-6">
            <Link href="/login" className="text-blue-600 hover:underline">
              Zurück zum Login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
