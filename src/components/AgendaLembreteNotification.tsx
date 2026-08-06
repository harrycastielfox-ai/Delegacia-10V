import { Link } from "@tanstack/react-router";
import { CalendarClock, X } from "lucide-react";
import { useEffect, useState } from "react";
import { QUALIFICACAO_LABELS, chaveDoDia, formatHora } from "@/features/agenda/agendaConstants";
import type { AgendamentoRecord } from "@/features/agenda/agendaTypes";
import { listMeusLembretes } from "@/lib/repositories/agendaRepository";

const CHECK_KEY = "sipi:agenda-lembrete-next-check-at";
const PRIMEIRA_CHECAGEM_MS = 6_000;
const REPETIR_MS = 4 * 60 * 60 * 1000;

export function AgendaLembreteNotification() {
  const [itens, setItens] = useState<AgendamentoRecord[]>([]);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    let timeoutId: number;

    async function carregar() {
      try {
        const registros = await listMeusLembretes();
        if (!registros.length) return;
        setItens(registros);
        setVisivel(true);
      } catch (erro) {
        if (import.meta.env.DEV) {
          console.warn("[AgendaLembrete] falha ao carregar lembretes", erro);
        }
      }
    }

    function agendarProxima() {
      let proxima = Number(sessionStorage.getItem(CHECK_KEY));
      if (!proxima) {
        proxima = Date.now() + PRIMEIRA_CHECAGEM_MS;
        sessionStorage.setItem(CHECK_KEY, String(proxima));
      }

      const restante = Math.max(0, proxima - Date.now());
      timeoutId = window.setTimeout(() => {
        sessionStorage.setItem(CHECK_KEY, String(Date.now() + REPETIR_MS));
        void carregar();
        agendarProxima();
      }, restante);
    }

    agendarProxima();
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!visivel || !itens.length) return null;

  const hoje = chaveDoDia(new Date());
  const deHoje = itens.filter((item) => chaveDoDia(item.data_hora) === hoje);
  const deAmanha = itens.filter((item) => chaveDoDia(item.data_hora) !== hoje);
  // Amanhã é o que o servidor precisa antecipar; hoje ele já está vivendo.
  const foco = deAmanha.length ? deAmanha : deHoje;
  const ehAmanha = deAmanha.length > 0;
  const dataFoco = new Date(foco[0].data_hora);
  const preview = foco.slice(0, 4);
  const extras = foco.length - preview.length;

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-in slide-in-from-bottom-4 fade-in fixed bottom-4 right-4 z-50 w-[340px] max-w-[calc(100vw-2rem)] rounded-xl border border-info/50 bg-card/95 p-4 shadow-[0_0_0_1px_color-mix(in_oklab,var(--info)_25%,transparent),0_18px_45px_rgba(0,0,0,0.4)] duration-300"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-info/40 bg-info/15 text-info">
          <CalendarClock className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.1em] text-info">
            {ehAmanha ? "Amanhã na sua agenda" : "Hoje na sua agenda"}
          </p>
          <p className="mt-1 text-sm text-foreground">
            {ehAmanha ? "Amanhã, " : "Hoje, "}
            {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(
              dataFoco,
            )}
            , você marcou <strong>{foco.length}</strong> {foco.length === 1 ? "pessoa" : "pessoas"}
          </p>

          <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
            {preview.map((item, indice) => (
              <li key={item.id} className="truncate">
                <Link
                  to="/agenda/$agendamentoId"
                  params={{ agendamentoId: item.id }}
                  className="transition-colors hover:text-info"
                >
                  {indice + 1} — {formatHora(item.data_hora)} ·{" "}
                  <strong className="text-foreground">{item.pessoa_nome}</strong> ·{" "}
                  {QUALIFICACAO_LABELS[item.qualificacao]}
                  {item.natureza ? ` — ${item.natureza}` : ""}
                </Link>
              </li>
            ))}
          </ol>
          {extras > 0 ? (
            <p className="mt-1 text-[11px] text-muted-foreground">+{extras} outra(s)</p>
          ) : null}

          <Link
            to="/agenda/cronograma"
            className="mt-2 inline-block text-[11px] font-semibold text-info hover:underline"
          >
            Ver cronograma completo →
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setVisivel(false)}
          aria-label="Fechar lembrete"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
