"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  getEntries,
  saveEntry,
  deleteEntry,
  generateId,
  calcDuration,
  formatDuration,
  formatChf,
} from "@/lib/storage";
import { TimeEntry, HOURLY_RATE } from "@/lib/types";

export default function HomePage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "",
    endTime: "",
    description: "",
  });
  const [formError, setFormError] = useState("");

  const today = format(new Date(), "yyyy-MM-dd");
  const todayEntries = entries.filter((e) => e.date === today);
  const todayMinutes = todayEntries.reduce((s, e) => s + e.durationMinutes, 0);

  useEffect(() => {
    setEntries(getEntries());
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  function formatElapsed(seconds: number) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  function handleStart() {
    const now = new Date();
    setStartedAt(now);
    setElapsed(0);
    setRunning(true);
  }

  function handleStop() {
    setRunning(false);
    if (!startedAt) return;
    const now = new Date();
    const durationMinutes = Math.round((now.getTime() - startedAt.getTime()) / 60000);
    if (durationMinutes < 1) return;

    const entry: TimeEntry = {
      id: generateId(),
      date: format(startedAt, "yyyy-MM-dd"),
      startTime: format(startedAt, "HH:mm"),
      endTime: format(now, "HH:mm"),
      durationMinutes,
      description: "",
    };
    saveEntry(entry);
    setEntries(getEntries());
    setElapsed(0);
    setStartedAt(null);
  }

  function handleManualSubmit(e: React.FormEvent) {
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
    const entry: TimeEntry = {
      id: generateId(),
      date,
      startTime,
      endTime,
      durationMinutes: dur,
      description: description.trim(),
    };
    saveEntry(entry);
    setEntries(getEntries());
    setForm({ date: format(new Date(), "yyyy-MM-dd"), startTime: "", endTime: "", description: "" });
  }

  function handleDelete(id: string) {
    deleteEntry(id);
    setEntries(getEntries());
  }

  return (
    <div className="space-y-8">
      {/* Timer */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
        <div className="text-5xl font-mono font-bold text-slate-800 mb-6">
          {formatElapsed(elapsed)}
        </div>
        {!running ? (
          <button
            onClick={handleStart}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl text-lg transition-colors"
          >
            ▶ Start
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold px-8 py-3 rounded-xl text-lg transition-colors"
          >
            ■ Stopp
          </button>
        )}
        {running && startedAt && (
          <p className="mt-3 text-sm text-slate-500">
            Gestartet um {format(startedAt, "HH:mm")} Uhr
          </p>
        )}
      </section>

      {/* Manueller Eintrag */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-700 mb-4">Manueller Eintrag</h2>
        <form onSubmit={handleManualSubmit} className="space-y-3">
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
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Bis</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
            + Eintrag hinzufügen
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
              <li
                key={e.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400">
                    {e.startTime}–{e.endTime}
                  </span>
                  <span className="text-sm text-slate-700">
                    {e.description || <em className="text-slate-400">ohne Beschreibung</em>}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-500">{formatDuration(e.durationMinutes)}</span>
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
