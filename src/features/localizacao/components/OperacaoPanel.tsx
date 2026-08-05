import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Route as RouteIcon, UsersRound } from "lucide-react";
import type { DiligenciaListRecord } from "../localizacaoTypes";
import { DiligenciaProgressTrail } from "./DiligenciaProgressTrail";
import { DiligenciaStatusBadge } from "./DiligenciaStatusBadge";

function formatDate(value: string | null) {
  if (!value) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function OperacaoPanel({
  diligencia,
  routeVisible = true,
  onToggleRoute,
}: {
  diligencia: DiligenciaListRecord | null;
  routeVisible?: boolean;
  onToggleRoute?: () => void;
}) {
  if (!diligencia) {
    return (
      <aside className="flex min-h-[535px] flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-center">
        <RouteIcon className="h-8 w-8 text-muted-foreground" />
        <h2 className="mt-3 text-sm font-bold">Nenhuma operação selecionada</h2>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
          Selecione uma diligência na tabela ou no mapa para acompanhar os dados da equipe.
        </p>
      </aside>
    );
  }

  return (
    <aside className="flex min-h-[535px] flex-col overflow-hidden rounded-xl border border-border bg-card">
      <header className="border-b border-border px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-operational">
          Operação em andamento
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <strong className="font-mono text-sm">{diligencia.codigo}</strong>
          <DiligenciaStatusBadge status={diligencia.status} />
        </div>
      </header>
      <div className="flex-1 divide-y divide-border px-5">
        <div className="py-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Destino
          </span>
          <strong className="mt-1.5 block text-sm">{diligencia.destino}</strong>
          <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {diligencia.bairro ?? "Bairro não informado"}
          </span>
        </div>
        <div className="py-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Equipe responsável
          </span>
          <span className="mt-2 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-operational/30 bg-operational/10 text-operational">
              <UsersRound className="h-4 w-4" />
            </span>
            <strong className="text-sm">{diligencia.equipe_nome ?? "Equipe não definida"}</strong>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Saída
            </span>
            <strong className="mt-1 block text-xs">{formatDate(diligencia.saida_em)}</strong>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Chegada
            </span>
            <strong className="mt-1 block text-xs">{formatDate(diligencia.chegada_em)}</strong>
          </div>
        </div>
        <div className="py-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Progresso da diligência
          </span>
          <div className="mt-3 overflow-hidden">
            <DiligenciaProgressTrail status={diligencia.status} compact />
          </div>
        </div>
      </div>
      <div
        className={`grid gap-2 border-t border-border p-4 ${onToggleRoute ? "grid-cols-2" : ""}`}
      >
        <Link
          to="/localizacao/diligencias/$diligenciaId"
          params={{ diligenciaId: diligencia.id }}
          className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider hover:border-operational/40 hover:text-operational"
        >
          Abrir detalhes <ArrowRight className="h-4 w-4" />
        </Link>
        {onToggleRoute ? (
          <button
            type="button"
            onClick={onToggleRoute}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-operational px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--operational-contrast)] hover:opacity-90"
          >
            <RouteIcon className="h-4 w-4" /> {routeVisible ? "Ocultar rota" : "Mostrar rota"}
          </button>
        ) : null}
      </div>
    </aside>
  );
}
