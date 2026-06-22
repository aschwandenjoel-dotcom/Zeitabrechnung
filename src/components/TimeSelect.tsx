"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  value: string; // "HH:MM"
  onChange: (v: string) => void;
  placeholder?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const ITEM_H = 36; // px per row

export default function TimeSelect({ value, onChange, placeholder = "Uhrzeit" }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const minRef = useRef<HTMLDivElement>(null);

  const selHour = value ? parseInt(value.split(":")[0]) : null;
  const selMin = value ? parseInt(value.split(":")[1]) : null;

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Scroll to selected item when opening
  useEffect(() => {
    if (!open) return;
    if (selHour !== null && hourRef.current) {
      hourRef.current.scrollTop = selHour * ITEM_H - ITEM_H * 2;
    }
    if (selMin !== null && minRef.current) {
      minRef.current.scrollTop = selMin * ITEM_H - ITEM_H * 2;
    }
  }, [open, selHour, selMin]);

  function pickHour(h: number) {
    const m = selMin ?? 0;
    onChange(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
  }

  function pickMin(m: number) {
    const h = selHour ?? 0;
    onChange(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {value ? (
          <span className="font-medium text-slate-800">{value} Uhr</span>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-white border border-slate-200 rounded-xl shadow-xl flex overflow-hidden w-44">
          {/* Stunden */}
          <div className="flex flex-col flex-1 border-r border-slate-100">
            <div className="text-center text-xs font-semibold text-slate-400 py-1.5 border-b border-slate-100 bg-slate-50">
              Std
            </div>
            <div
              ref={hourRef}
              className="overflow-y-auto"
              style={{ height: ITEM_H * 5 }}
            >
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => pickHour(h)}
                  style={{ height: ITEM_H }}
                  className={`w-full text-sm font-medium transition-colors ${
                    selHour === h
                      ? "bg-blue-600 text-white"
                      : "text-slate-700 hover:bg-blue-50"
                  }`}
                >
                  {h.toString().padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>

          {/* Minuten */}
          <div className="flex flex-col flex-1">
            <div className="text-center text-xs font-semibold text-slate-400 py-1.5 border-b border-slate-100 bg-slate-50">
              Min
            </div>
            <div
              ref={minRef}
              className="overflow-y-auto"
              style={{ height: ITEM_H * 5 }}
            >
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => pickMin(m)}
                  style={{ height: ITEM_H }}
                  className={`w-full text-sm font-medium transition-colors ${
                    selMin === m
                      ? "bg-blue-600 text-white"
                      : "text-slate-700 hover:bg-blue-50"
                  }`}
                >
                  {m.toString().padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
