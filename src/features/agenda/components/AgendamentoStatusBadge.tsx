import { AGENDAMENTO_STATUS_LABELS, AGENDAMENTO_STATUS_TONE } from "../agendaConstants";
import type { AgendamentoStatus } from "../agendaTypes";

export function AgendamentoStatusBadge({ status }: { status: AgendamentoStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${AGENDAMENTO_STATUS_TONE[status]}`}
    >
      {AGENDAMENTO_STATUS_LABELS[status]}
    </span>
  );
}
