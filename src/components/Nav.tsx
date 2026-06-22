"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTimer } from "@/lib/TimerContext";

const links = [
  { href: "/", label: "Timer" },
  { href: "/eintraege", label: "Einträge" },
  { href: "/rapporte", label: "Rapporte" },
];

function formatElapsed(s: number) {
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

export default function Nav() {
  const path = usePathname();
  const { running, paused, elapsed } = useTimer();

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <span className="font-semibold text-slate-800 tracking-tight">Zeitabrechnung</span>

        <div className="flex items-center gap-4">
          {/* Timer-Indikator wenn läuft und nicht auf Timer-Seite */}
          {running && path !== "/" && (
            <div className={`flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-1 rounded-full ${paused ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${paused ? "bg-amber-500" : "bg-red-500 animate-pulse"}`} />
              {formatElapsed(elapsed)}
            </div>
          )}

          <nav className="flex gap-1">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  path === href ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
