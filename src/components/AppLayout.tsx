import { AppSidebar } from "./AppSidebar";
import type { ReactNode } from "react";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <AppSidebar />
      <main className="flex-1 min-w-0 p-6 lg:p-8 overflow-x-hidden">{children}</main>
    </div>
  );
}
