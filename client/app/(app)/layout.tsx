import type { ReactNode } from "react";
import { BottomNav } from "@/components/app-shell/BottomNav";
import { Sidebar } from "@/components/app-shell/Sidebar";
import { Topbar } from "@/components/app-shell/Topbar";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-4 pb-24 sm:p-6 sm:pb-24 md:p-8 md:pb-8">
          <RequireAuth>{children}</RequireAuth>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
