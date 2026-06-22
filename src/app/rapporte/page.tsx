"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { getEntries, formatDuration, formatChf } from "@/lib/storage";
import { TimeEntry, HOURLY_RATE } from "@/lib/types";

const MONTHS = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

export default function RapportePage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const now = new Date();
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1); // 1-12
  const selectedMonth = `${selYear}-${selMonth.toString().padStart(2, "0")}`;

  useEffect(() => {
    getEntries().then(setEntries);
  }, []);

  const monthStart = startOfMonth(parseISO(selectedMonth + "-01"));
  const monthEnd = endOfMonth(monthStart);

  const monthEntries = entries.filter((e) =>
    isWithinInterval(parseISO(e.date), { start: monthStart, end: monthEnd })
  );

  const totalMinutes = monthEntries.reduce((s, e) => s + e.durationMinutes, 0);
  const totalChf = parseFloat(formatChf(totalMinutes, HOURLY_RATE));

  const grouped = new Map<string, TimeEntry[]>();
  for (const e of [...monthEntries].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))) {
    const group = grouped.get(e.date) ?? [];
    group.push(e);
    grouped.set(e.date, group);
  }

  async function handlePdfExport() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const monthLabel = format(monthStart, "MMMM yyyy", { locale: de });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Stundenrapport", 20, y);
    y += 8;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(monthLabel, 20, y);
    y += 6;
    doc.text(`Ansatz: ${HOURLY_RATE} CHF/h`, 20, y);
    y += 12;

    doc.setDrawColor(200);
    doc.line(20, y, pageW - 20, y);
    y += 6;

    doc.setFontSize(9);
    doc.setTextColor(50);

    for (const [date, dayEntries] of Array.from(grouped.entries())) {
      const dayMinutes = dayEntries.reduce((s, e) => s + e.durationMinutes, 0);
      const dateLabel = format(parseISO(date), "EE, d. MMM yyyy", { locale: de });

      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30);
      doc.text(dateLabel, 20, y);
      doc.text(
        `${formatDuration(dayMinutes)}  ·  ${formatChf(dayMinutes, HOURLY_RATE)} CHF`,
        pageW - 20,
        y,
        { align: "right" }
      );
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80);

      for (const e of dayEntries) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`  ${e.startTime}–${e.endTime}`, 20, y);
        doc.text(e.description || "—", 55, y);
        doc.text(formatDuration(e.durationMinutes), pageW - 20, y, { align: "right" });
        y += 5;
      }
      y += 3;
    }

    doc.setDrawColor(200);
    doc.line(20, y, pageW - 20, y);
    y += 8;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30);
    doc.text("Total", 20, y);
    doc.text(`${formatDuration(totalMinutes)}`, pageW - 60, y, { align: "right" });
    doc.text(`${totalChf.toFixed(2)} CHF`, pageW - 20, y, { align: "right" });

    doc.save(`Stundenrapport_${selectedMonth}.pdf`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Rapporte</h1>
        <div className="flex gap-2">
          <select
            value={selMonth}
            onChange={(e) => setSelMonth(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={selYear}
            onChange={(e) => setSelYear(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Zusammenfassung */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs text-slate-400 mb-1">Einträge</p>
          <p className="text-2xl font-bold text-slate-800">{monthEntries.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs text-slate-400 mb-1">Stunden</p>
          <p className="text-2xl font-bold text-blue-600">{formatDuration(totalMinutes)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs text-slate-400 mb-1">Betrag</p>
          <p className="text-2xl font-bold text-emerald-600">{totalChf.toFixed(2)} CHF</p>
        </div>
      </div>

      {/* PDF Export */}
      {monthEntries.length > 0 && (
        <button
          onClick={handlePdfExport}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          PDF-Rapport herunterladen — {format(monthStart, "MMMM yyyy", { locale: de })}
        </button>
      )}

      {/* Tagesübersicht */}
      {monthEntries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
          Keine Einträge für {format(monthStart, "MMMM yyyy", { locale: de })}.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">Datum</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500">Zeit</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500">Beschreibung</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">Dauer</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">CHF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.from(grouped.entries()).map(([date, dayEntries]) =>
                dayEntries.map((e, i) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 text-slate-600">
                      {i === 0 ? format(parseISO(date), "d. MMM", { locale: de }) : ""}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-400">
                      {e.startTime}–{e.endTime}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">{e.description || "—"}</td>
                    <td className="px-5 py-2.5 text-right text-slate-600">{formatDuration(e.durationMinutes)}</td>
                    <td className="px-5 py-2.5 text-right text-slate-600">{formatChf(e.durationMinutes, HOURLY_RATE)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={3} className="px-5 py-3 font-semibold text-slate-700">Total</td>
                <td className="px-5 py-3 text-right font-semibold text-blue-600">{formatDuration(totalMinutes)}</td>
                <td className="px-5 py-3 text-right font-semibold text-emerald-600">{totalChf.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
