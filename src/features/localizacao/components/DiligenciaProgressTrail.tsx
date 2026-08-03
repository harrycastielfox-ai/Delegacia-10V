import { Check, CircleDot, MapPin, Navigation } from "lucide-react";
import { DILIGENCIA_PROGRESSO, DILIGENCIA_STATUS_LABELS } from "../localizacaoConstants";
import type { DiligenciaStatus } from "../localizacaoTypes";

const icons = [CircleDot, Navigation, MapPin, Check] as const;

export function DiligenciaProgressTrail({
  status,
  compact = false,
}: {
  status: DiligenciaStatus;
  compact?: boolean;
}) {
  const currentIndex = status === "cancelada" ? -1 : DILIGENCIA_PROGRESSO.indexOf(status);

  return (
    <div className="overflow-x-auto pb-2">
      <ol
        className={`relative flex items-start justify-between px-2 ${compact ? "min-w-0" : "min-w-[520px]"}`}
      >
        <span
          className={`absolute h-px bg-border ${compact ? "left-8 right-8 top-4" : "left-10 right-10 top-5"}`}
          aria-hidden="true"
        />
        {DILIGENCIA_PROGRESSO.map((item, index) => {
          const Icon = icons[index];
          const reached = index <= currentIndex;
          return (
            <li
              key={item}
              className={`relative z-10 flex flex-col items-center text-center ${compact ? "min-w-0 flex-1" : "w-28"}`}
            >
              <span
                className={`flex items-center justify-center rounded-full border bg-card ${compact ? "h-8 w-8" : "h-10 w-10"} ${
                  reached
                    ? "border-operational text-operational shadow-[0_0_16px_color-mix(in_oklab,var(--operational)_22%,transparent)]"
                    : "border-border text-muted-foreground"
                }`}
              >
                <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
              </span>
              <span
                className={`mt-2 font-bold uppercase tracking-wider ${compact ? "text-[7px]" : "text-[10px]"} ${
                  reached ? "text-operational" : "text-muted-foreground"
                }`}
              >
                {DILIGENCIA_STATUS_LABELS[item]}
              </span>
            </li>
          );
        })}
      </ol>
      {status === "cancelada" ? (
        <p className="mt-3 text-center text-xs font-semibold text-destructive">
          Esta diligência foi cancelada.
        </p>
      ) : null}
    </div>
  );
}
