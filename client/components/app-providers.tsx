"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import { NotificationsProvider } from "@/lib/useNotifications";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <NotificationsProvider>
        {children}
        <Toaster position="bottom-right" theme="system" toastOptions={{ duration: 4000 }} />
      </NotificationsProvider>
    </AuthProvider>
  );
}
