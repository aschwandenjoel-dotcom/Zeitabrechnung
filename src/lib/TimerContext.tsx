"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface TimerState {
  running: boolean;
  paused: boolean;
  startedAt: number | null;   // ms timestamp
  pausedAt: number | null;    // ms timestamp when paused
  totalPausedMs: number;      // accumulated pause duration
}

const DEFAULT: TimerState = {
  running: false,
  paused: false,
  startedAt: null,
  pausedAt: null,
  totalPausedMs: 0,
};

const KEY = "zeitabrechnung_timer";

function load(): TimerState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function save(s: TimerState) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

function calcElapsed(s: TimerState): number {
  if (!s.running || !s.startedAt) return 0;
  const base = s.paused && s.pausedAt ? s.pausedAt : Date.now();
  return Math.max(0, Math.floor((base - s.startedAt - s.totalPausedMs) / 1000));
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export interface StopResult {
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM (floored to minute)
  endTime: string;    // HH:MM (rounded to nearest minute)
}

interface TimerCtx {
  running: boolean;
  paused: boolean;
  elapsed: number; // seconds
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => StopResult | null;
}

const Ctx = createContext<TimerCtx | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TimerState>(DEFAULT);
  const [elapsed, setElapsed] = useState(0);

  // Restore from localStorage on mount
  useEffect(() => {
    const s = load();
    setState(s);
    setElapsed(calcElapsed(s));
  }, []);

  // Tick every second while running and not paused
  useEffect(() => {
    if (!state.running || state.paused) return;
    const id = setInterval(() => setElapsed(calcElapsed(state)), 1000);
    return () => clearInterval(id);
  }, [state]);

  function update(next: TimerState) {
    setState(next);
    save(next);
    setElapsed(calcElapsed(next));
  }

  function start() {
    update({ running: true, paused: false, startedAt: Date.now(), pausedAt: null, totalPausedMs: 0 });
  }

  function pause() {
    if (!state.running || state.paused) return;
    update({ ...state, paused: true, pausedAt: Date.now() });
  }

  function resume() {
    if (!state.running || !state.paused || !state.pausedAt) return;
    update({
      ...state,
      paused: false,
      pausedAt: null,
      totalPausedMs: state.totalPausedMs + (Date.now() - state.pausedAt),
    });
  }

  function stop(): StopResult | null {
    if (!state.startedAt) return null;

    const startDate = new Date(state.startedAt);
    const endDate = new Date(Math.round(Date.now() / 60000) * 60000); // round to nearest minute

    const result: StopResult = {
      date: `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`,
      startTime: `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`,
      endTime: `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`,
    };

    update(DEFAULT);
    return result;
  }

  return (
    <Ctx.Provider value={{ running: state.running, paused: state.paused, elapsed, start, pause, resume, stop }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTimer must be inside TimerProvider");
  return ctx;
}
