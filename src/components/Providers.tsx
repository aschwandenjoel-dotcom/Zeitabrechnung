"use client";

import { SessionProvider } from "next-auth/react";
import { TimerProvider } from "@/lib/TimerContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TimerProvider>{children}</TimerProvider>
    </SessionProvider>
  );
}
