import { OBJECT_SITUATION_LABELS } from "../objectConstants";
import type { ObjectSituation } from "../objectTypes";

const tones: Record<ObjectSituation, string> = {
  apreendido: "border-warning/35 bg-warning/15 text-warning",
  liberado: "border-success/30 bg-success/12 text-success",
  incinerado: "border-destructive/35 bg-destructive/15 text-destructive",
  disposicao_justica: "border-purple/35 bg-purple/15 text-purple",
  pendente_identificacao: "border-warning/35 bg-warning/15 text-warning",
};

export function ObjectStatusBadge({ situation }: { situation: ObjectSituation | null }) {
  if (!situation) return null;

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${tones[situation]}`}
    >
      <span className="truncate">{OBJECT_SITUATION_LABELS[situation]}</span>
    </span>
  );
}
