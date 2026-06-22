"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { getEntries, saveEntry, deleteEntry, generateId, calcDuration, formatDuration, formatChf } from "@/lib/storage";
import { TimeEntry, HOURLY_RATE } from "@/lib/types";
import TimeSelect from "@/components/TimeSelect";
import { useTimer } from "@/lib/TimerContext";

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function HomePage() {
  const { running, paused, elapsed, start, pause, resume, stop } = useTimer();

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [form, setForm] = useState(() => {
    const now = new Date();
    const t = format(now, "HH:mm");
    return { date: format(now, "yyyy-MM-dd"), startTime: t, endTime: t, description: "" };
  });
  const [formError, setFormError] = useState("");

  const today = format(new Date(), "yyyy-MM-dd");
  const todayEntries = entries.filter((e) => e.date === today);
  const todayMinutes = todayEntries.reduce((s, e) => s + e.durationMinutes, 0);

  async function reload() {
    setEntries(await getEntries());
  }

  useEffect(() => { reload(); }, []);

  function handleStop() {
    const result = stop();
    if (!result) return;
    // Stopp füllt das Formular vor — kein Auto-Save
    setForm({
      date: result.date,
      startTime: result.startTime,
      endTime: result.endTime,
      description: "",
    });
    setFormError("");
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const { date, startTime, endTime, description } = form;
    if (!date || !startTime || !endTime || !description.trim()) {
      setFormError("Alle Felder ausfüllen.");
      return;
    }
    const dur = calcDuration(startTime, endTime);
    if (dur <= 0) {
      setFormError("Endzeit muss nach Startzeit liegen.");
      return;
    }
    await saveEntry({ id: generateId(), date, startTime, endTime, durationMinutes: dur, description: description.trim() });
    await reload();
    const now = new Date();
    const t = format(now, "HH:mm");
    setForm({ date: format(now, "yyyy-MM-dd"), startTime: t, endTime: t, description: "" });
  }

  async function handleDelete(id: string) {
    await deleteEntry(id);
    await reload();
  }

  return (
    <div className="space-y-8">
      {/* Timer */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
        <div className={`text-5xl font-mono font-bold mb-6 transition-colors ${paused ? "text-amber-500" : "text-slate-800"}`}>
          {formatElapsed(elapsed)}
        </div>

        <div className="flex items-center justify-center gap-3">
          {!running ? (
            <button
              onClick={start}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl text-lg transition-colors"
            >
              ▶ Start
            </button>
          ) : (
            <>
              {!paused ? (
                <button
                  onClick={pause}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-xl text-lg transition-colors"
                >
                  ⏸ Pause
                </button>
              ) : (
                <button
                  onClick={resume}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl text-lg transition-colors"
                >
                  ▶ Weiter
                </button>
              )}
              <button
                onClick={handleStop}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-xl text-lg transition-colors"
              >
                ■ Stopp
              </button>
            </>
          )}
        </div>

        {paused && (
          <p className="mt-3 text-sm text-amber-600 font-medium">Pausiert</p>
        )}
      </section>

      {/* Manueller Eintrag */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-700 mb-4">Eintrag erfassen</h2>
        <form onSubmit={handleManualSubmit} noValidate className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Datum</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Von</label>
              <TimeSelect value={form.startTime} onChange={(v) => setForm({ ...form, startTime: v })} placeholder="Von" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Bis</label>
              <TimeSelect value={form.endTime} onChange={(v) => setForm({ ...form, endTime: v })} placeholder="Bis" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Beschreibung</label>
            <input
              type="text"
              placeholder="Was wurde gemacht?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {formError && <p className="text-red-500 text-sm">{formError}</p>}
          <button
            type="submit"
            className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors"
          >
            + Eintrag speichern
          </button>
        </form>
      </section>

      {/* Heute */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-700">
            Heute — {format(new Date(), "EEEE, d. MMMM", { locale: de })}
          </h2>
          {todayMinutes > 0 && (
            <div className="text-right">
              <span className="text-sm font-semibold text-blue-600">{formatDuration(todayMinutes)}</span>
              <span className="text-xs text-slate-400 ml-2">= {formatChf(todayMinutes, HOURLY_RATE)} CHF</span>
            </div>
          )}
        </div>
        {todayEntries.length === 0 ? (
          <p className="text-slate-400 text-sm">Noch keine Einträge heute.</p>
        ) : (
          <ul className="space-y-2">
            {todayEntries.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 group">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400">{e.startTime}–{e.endTime}</span>
                  <span className="text-sm text-slate-700">
                    {e.description || <em className="text-slate-400">ohne Beschreibung</em>}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-500">{formatDuration(e.durationMinutes)}</span>
                  <button onClick={() => handleDelete(e.id)} className="text-slate-300 hover:text-red-500 transition-colors text-sm">✕</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
