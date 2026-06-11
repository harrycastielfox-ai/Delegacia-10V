import { type LucideIcon } from "lucide-react";

type Tone = "success" | "info" | "primary" | "warning" | "destructive" | "purple" | "muted";

const toneVar: Record<Tone, string> = {
  success: "var(--success)",
  info: "var(--info)",
  primary: "var(--primary)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
  purple: "var(--purple)",
  muted: "var(--muted-foreground)",
};

interface Props {
  label: string;
  value: string | number;
  hint: string;
  secondaryHint?: string;
  icon: LucideIcon;
  tone: Tone;
  onClick?: () => void;
}

export function StatCard({ label, value, hint, secondaryHint, icon: Icon, tone, onClick }: Props) {
  return (
    <div
      className={`stat-card stat-card-border h-full p-5 ${onClick ? "cursor-pointer" : ""}`}
      style={{ ["--stat-color" as never]: toneVar[tone] }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <span
          className="text-[10px] font-bold tracking-[0.15em]"
          style={{ color: toneVar[tone] }}
        >
          {label}
        </span>
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: `color-mix(in oklab, ${toneVar[tone]} 15%, transparent)`,
            color: toneVar[tone],
          }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-4xl font-bold tabular-nums" style={{ color: toneVar[tone] }}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-2">{hint}</div>
      {secondaryHint ? <div className="mt-1 text-xs text-muted-foreground">{secondaryHint}</div> : null}
    </div>
  );
}
