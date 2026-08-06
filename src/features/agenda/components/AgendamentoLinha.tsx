import { Link } from "@tanstack/react-router";
import { AlertTriangle, Phone } from "lucide-react";
import {
  AGENDAMENTO_STATUS_LABELS,
  INTIMACAO_STATUS_LABELS,
  QUALIFICACAO_LABELS,
  TIPO_ATENDIMENTO_LABELS,
  ehPassado,
  formatHora,
} from "../agendaConstants";
import type { AgendamentoRecord } from "../agendaTypes";
import { AgendamentoStatusBadge } from "./AgendamentoStatusBadge";

/**
 * A linha numerada que o escrivão lê de relance:
 *   1 — 09:00 · Maria da Silva · Vítima — Agressão
 *
 * O número é a ordem no dia, não um identificador. É assim que a lista é
 * conferida em voz alta no balcão.
 */
export function AgendamentoLinha({
  agendamento,
  ordem,
  mostrarResponsavel = false,
}: {
  agendamento: AgendamentoRecord;
  ordem: number;
  mostrarResponsavel?: boolean;
}) {
  const encerrado = agendamento.status === "cancelado" || agendamento.status === "remarcado";
  const atrasado =
    !encerrado &&
    agendamento.status !== "compareceu" &&
    agendamento.status !== "nao_compareceu" &&
    ehPassado(agendamento.data_hora);
  const intimacaoPendente =
    agendamento.intimacao_status === "pendente" ||
    agendamento.intimacao_status === "nao_localizado";

  return (
    <Link
      to="/agenda/$agendamentoId"
      params={{ agendamentoId: agendamento.id }}
      className={`group flex items-start gap-3 rounded-xl border bg-card/70 p-3 transition hover:border-info/45 hover:bg-info/5 ${
        encerrado ? "border-border/60 opacity-60" : "border-border"
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-xs font-black tabular-nums text-muted-foreground">
        {ordem}
      </span>

      <span className="flex w-14 shrink-0 flex-col items-start">
        <strong
          className={`font-mono text-sm tabular-nums ${atrasado ? "text-warning" : "text-info"}`}
        >
          {formatHora(agendamento.data_hora)}
        </strong>
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
          {agendamento.duracao_minutos}min
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <strong className={`truncate text-sm ${encerrado ? "line-through" : ""}`}>
            {agendamento.pessoa_nome}
          </strong>
          <span className="inline-flex items-center rounded-md border border-info/30 bg-info/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-info">
            {QUALIFICACAO_LABELS[agendamento.qualificacao]}
          </span>
        </span>

        <span className="mt-1 block truncate text-xs text-muted-foreground">
          {agendamento.natureza || TIPO_ATENDIMENTO_LABELS[agendamento.tipo_atendimento]}
          {agendamento.numero_bo ? ` · B.O. ${agendamento.numero_bo}` : ""}
          {mostrarResponsavel && agendamento.responsavel_nome
            ? ` · ${agendamento.responsavel_nome}`
            : ""}
        </span>

        <span className="mt-1.5 flex flex-wrap items-center gap-2">
          {agendamento.pessoa_telefone ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Phone className="h-3 w-3 text-info" />
              {agendamento.pessoa_telefone}
            </span>
          ) : null}
          {intimacaoPendente && !encerrado ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-warning/35 bg-warning/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-warning">
              <AlertTriangle className="h-2.5 w-2.5" />
              {INTIMACAO_STATUS_LABELS[agendamento.intimacao_status]}
            </span>
          ) : null}
          {atrasado ? (
            <span className="text-[9px] font-bold uppercase tracking-wide text-warning">
              Horário passou — confirme o comparecimento
            </span>
          ) : null}
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <AgendamentoStatusBadge status={agendamento.status} />
        <span className="hidden text-[9px] uppercase tracking-wide text-muted-foreground sm:block">
          {agendamento.status === "agendado" || agendamento.status === "confirmado"
            ? "Abrir"
            : AGENDAMENTO_STATUS_LABELS[agendamento.status]}
        </span>
      </span>
    </Link>
  );
}
