import { ArrowRight, CalendarClock, Search } from "lucide-react";
import { DILIGENCIA_TIPO_LABELS } from "../localizacaoConstants";
import type { DiligenciaListRecord } from "../localizacaoTypes";
import { DiligenciaStatusBadge } from "./DiligenciaStatusBadge";

function formatDate(value: string | null) {
  if (!value) return "Não agendada";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function DiligenciasTable({
  diligencias,
  selectedId,
  onSelect,
  onClearFilters,
  emptyMessage = "Nenhuma diligência encontrada.",
}: {
  diligencias: DiligenciaListRecord[];
  selectedId?: string | null;
  onSelect: (diligencia: DiligenciaListRecord) => void;
  onClearFilters?: () => void;
  emptyMessage?: string;
}) {
  if (!diligencias.length) {
    return (
      <div className="flex min-h-44 flex-col items-center justify-center p-6 text-center">
        <Search className="h-7 w-7 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">{emptyMessage}</p>
        {onClearFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-3 rounded-lg border border-operational/40 bg-operational/10 px-4 py-2 text-xs font-bold text-operational hover:bg-operational/15"
          >
            Limpar filtros
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <th className="px-5 py-3 font-semibold">Código</th>
            <th className="px-4 py-3 font-semibold">Tipo</th>
            <th className="px-4 py-3 font-semibold">Destino</th>
            <th className="px-4 py-3 font-semibold">Equipe</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Agendamento</th>
            <th className="w-12 px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {diligencias.map((diligencia) => (
            <tr
              key={diligencia.id}
              tabIndex={0}
              role="button"
              onClick={() => onSelect(diligencia)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onSelect(diligencia);
              }}
              className={`cursor-pointer border-b border-border text-xs transition-colors last:border-b-0 hover:bg-operational/5 focus-visible:bg-operational/10 focus-visible:outline-none ${
                diligencia.id === selectedId ? "bg-operational/10" : ""
              }`}
            >
              <td className="px-5 py-3.5 font-mono font-bold text-operational">
                {diligencia.codigo}
              </td>
              <td className="px-4 py-3.5 font-medium text-foreground">
                {DILIGENCIA_TIPO_LABELS[diligencia.tipo]}
              </td>
              <td className="max-w-64 px-4 py-3.5">
                <strong className="block truncate font-semibold text-foreground">
                  {diligencia.destino}
                </strong>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {diligencia.bairro ?? "Bairro não informado"}
                </span>
              </td>
              <td className="px-4 py-3.5 text-foreground">
                {diligencia.equipe_nome ?? "Não definida"}
              </td>
              <td className="px-4 py-3.5">
                <DiligenciaStatusBadge status={diligencia.status} />
              </td>
              <td className="px-4 py-3.5 text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" /> {formatDate(diligencia.agendada_para)}
                </span>
              </td>
              <td className="px-4 py-3.5 text-operational">
                <ArrowRight className="h-4 w-4" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
