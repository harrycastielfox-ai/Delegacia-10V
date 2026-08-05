import { DILIGENCIA_STATUS_LABELS, DILIGENCIA_STATUS_TONE } from "../localizacaoConstants";
import type { DiligenciaStatus } from "../localizacaoTypes";

const toneVariables = {
  operational: "var(--operational)",
  success: "var(--success)",
  warning: "var(--warning)",
  info: "var(--info)",
  "muted-foreground": "var(--muted-foreground)",
} as const;

export function DiligenciaStatusBadge({ status }: { status: DiligenciaStatus }) {
  const tone = DILIGENCIA_STATUS_TONE[status];
  const color = toneVariables[tone];

  return (
    <span
      className="inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
      style={{
        color,
        borderColor: `color-mix(in oklab, ${color} 42%, var(--border))`,
        backgroundColor: `color-mix(in oklab, ${color} 11%, transparent)`,
      }}
    >
      {DILIGENCIA_STATUS_LABELS[status]}
    </span>
  );
}
