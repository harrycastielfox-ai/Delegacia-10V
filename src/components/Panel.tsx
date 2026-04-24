import type { ReactNode } from "react";

interface Props {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  accent?: "success" | "warning" | "destructive" | "muted";
  children: ReactNode;
  className?: string;
}

const accentColor = {
  success: "var(--success)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
  muted: "var(--muted-foreground)",
};

export function Panel({ title, icon, action, accent = "muted", children, className = "" }: Props) {
  return (
    <div
      className={`bg-card border border-border rounded-xl overflow-hidden ${className}`}
      style={{ borderColor: `color-mix(in oklab, ${accentColor[accent]} 25%, var(--border))` }}
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-2.5">
          {icon}
          <h3
            className="text-xs font-bold tracking-[0.15em]"
            style={{ color: accentColor[accent] }}
          >
            {title}
          </h3>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
