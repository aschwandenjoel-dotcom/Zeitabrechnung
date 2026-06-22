"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  getEntries,
  deleteEntry,
  updateEntry,
  calcDuration,
  formatDuration,
  formatChf,
} from "@/lib/storage";
import { TimeEntry, HOURLY_RATE } from "@/lib/types";

export default function EintraegePage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ startTime: "", endTime: "", description: "" });
  const [editError, setEditError] = useState("");

  useEffect(() => {
    setEntries(getEntries());
  }, []);

  const sorted = [...entries].sort((a, b) =>
    (b.date + b.startTime).localeCompare(a.date + a.startTime)
  );

  const totalMinutes = entries.reduce((s, e) => s + e.durationMinutes, 0);

  function groupByDate(list: TimeEntry[]) {
    const map = new Map<string, TimeEntry[]>();
    for (const e of list) {
      const group = map.get(e.date) ?? [];
      group.push(e);
      map.set(e.date, group);
    }
    return map;
  }

  const grouped = groupByDate(sorted);

  function handleEdit(e: TimeEntry) {
    setEditId(e.id);
    setEditForm({ startTime: e.startTime, endTime: e.endTime, description: e.description });
    setEditError("");
  }

  function handleEditSave(entry: TimeEntry) {
    setEditError("");
    const dur = calcDuration(editForm.startTime, editForm.endTime);
    if (dur <= 0) {
      setEditError("Endzeit muss nach Startzeit liegen.");
      return;
    }
    updateEntry({
      ...entry,
      startTime: editForm.startTime,
      endTime: editForm.endTime,
      durationMinutes: dur,
      description: editForm.description.trim(),
    });
    setEntries(getEntries());
    setEditId(null);
  }

  function handleDelete(id: string) {
    deleteEntry(id);
    setEntries(getEntries());
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Alle Einträge</h1>
        {totalMinutes > 0 && (
          <div className="text-right">
            <span className="text-sm font-semibold text-blue-600">{formatDuration(totalMinutes)}</span>
            <span className="text-xs text-slate-400 ml-2">= {formatChf(totalMinutes, HOURLY_RATE)} CHF total</span>
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
          Noch keine Einträge vorhanden.
        </div>
      ) : (
        Array.from(grouped.entries()).map(([date, dayEntries]) => {
          const dayMinutes = dayEntries.reduce((s, e) => s + e.durationMinutes, 0);
          return (
            <div key={date} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
                <span className="text-sm font-semibold text-slate-600">
                  {format(new Date(date), "EEEE, d. MMMM yyyy", { locale: de })}
                </span>
                <span className="text-xs text-slate-500">
                  {formatDuration(dayMinutes)} · {formatChf(dayMinutes, HOURLY_RATE)} CHF
                </span>
              </div>
              <ul className="divide-y divide-slate-100">
                {dayEntries.map((e) =>
                  editId === e.id ? (
                    <li key={e.id} className="px-5 py-3 bg-blue-50">
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="flex gap-2">
                          <input
                            type="time"
                            value={editForm.startTime}
                            onChange={(ev) => setEditForm({ ...editForm, startTime: ev.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="time"
                            value={editForm.endTime}
                            onChange={(ev) => setEditForm({ ...editForm, endTime: ev.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <input
                          type="text"
                          value={editForm.description}
                          onChange={(ev) => setEditForm({ ...editForm, description: ev.target.value })}
                          className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      {editError && <p className="text-red-500 text-xs mb-2">{editError}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditSave(e)}
                          className="bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Speichern
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="text-slate-500 text-xs px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </li>
                  ) : (
                    <li key={e.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 group">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-400">
                          {e.startTime}–{e.endTime}
                        </span>
                        <span className="text-sm text-slate-700">
                          {e.description || <em className="text-slate-400">ohne Beschreibung</em>}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">{formatDuration(e.durationMinutes)}</span>
                        <button
                          onClick={() => handleEdit(e)}
                          className="text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  )
                )}
              </ul>
            </div>
          );
        })
      )}
    </div>
  );
}
