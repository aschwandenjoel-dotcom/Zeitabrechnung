"use client";

import { TimerProvider } from "@/lib/TimerContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <TimerProvider>{children}</TimerProvider>;
}
