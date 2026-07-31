import { VEHICLE_SITUATION_LABELS } from "../vehicleConstants";
import type { VehicleSituation } from "../vehicleTypes";

const tones: Record<VehicleSituation, string> = {
  regular: "border-success/30 bg-success/12 text-success",
  apreendido: "border-info/35 bg-info/15 text-info",
  liberado: "border-success/30 bg-success/12 text-success",
  adulterado: "border-destructive/35 bg-destructive/15 text-destructive",
  em_investigacao: "border-warning/35 bg-warning/15 text-warning",
  recuperado: "border-purple/35 bg-purple/15 text-purple",
  periciado: "border-info/35 bg-info/10 text-info",
  pendente_identificacao: "border-warning/35 bg-warning/15 text-warning",
};

export function VehicleStatusBadge({ situation }: { situation: VehicleSituation }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${tones[situation]}`}
    >
      <span className="truncate">{VEHICLE_SITUATION_LABELS[situation]}</span>
    </span>
  );
}
