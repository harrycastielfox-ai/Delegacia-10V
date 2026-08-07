import { Link } from "@tanstack/react-router";
import { CalendarClock, X } from "lucide-react";
import { useEffect, useState } from "react";
import { chaveDoDia, inicioDoDia, somarDias } from "@/features/agenda/agendaConstants";
import type { AgendamentoRecord } from "@/features/agenda/agendaTypes";
import { listAgendamentosPeriodo } from "@/lib/repositories/agendaRepository";

const CHECK_KEY = "sipi:agenda-lembrete-next-check-at";
const PRIMEIRA_CHECAGEM_MS = 6_000;
const REPETIR_MS = 4 * 60 * 60 * 1000;
const STATUS_ATIVOS = new Set(["agendado", "confirmado"]);
const SEM_RESPONSAVEL = "__sem_responsavel__";

interface LinhaEquipe {
  chave: string;
  nome: string;
  total: number;
}

function agruparPorResponsavel(itens: AgendamentoRecord[]): LinhaEquipe[] {
  const contagem = new Map<string, LinhaEquipe>();

  itens.forEach((item) => {
    const chave = item.responsavel_user_id ?? SEM_RESPONSAVEL;
    const nome = item.responsavel_nome ?? "Sem responsável definido";
    const atual = contagem.get(chave);
    if (atual) {
      atual.total += 1;
      return;
    }
    contagem.set(chave, { chave, nome, total: 1 });
  });

  // Quem tem mais gente marcada aparece primeiro — é quem mais precisa se
  // organizar. "Sem responsável" fica sempre por último, é pendência, não prioridade.
  return Array.from(contagem.values()).sort((a, b) => {
    if (a.chave === SEM_RESPONSAVEL) return 1;
    if (b.chave === SEM_RESPONSAVEL) return -1;
    return b.total - a.total;
  });
}

/**
 * Painel de "quem chega hoje" visível pra toda a unidade — não só pra quem
 * marcou. Assim todo mundo sabe o movimento do dia ao entrar no sistema, não
 * só o escrivão que fez a marcação.
 */
export function AgendaLembreteNotification() {
  const [linhas, setLinhas] = useState<LinhaEquipe[]>([]);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    let timeoutId: number;

    async function carregar() {
      try {
        const hoje = inicioDoDia(new Date());
        const registros = await listAgendamentosPeriodo({
          inicio: hoje.toISOString(),
          fim: somarDias(hoje, 1).toISOString(),
          limit: 300,
        });
        const chaveHoje = chaveDoDia(hoje);
        const deHoje = registros.filter(
          (item) => STATUS_ATIVOS.has(item.status) && chaveDoDia(item.data_hora) === chaveHoje,
        );
        if (!deHoje.length) return;
        setLinhas(agruparPorResponsavel(deHoje));
        setVisivel(true);
      } catch (erro) {
        if (import.meta.env.DEV) {
          console.warn("[AgendaLembrete] falha ao carregar a agenda do dia", erro);
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

  if (!visivel || !linhas.length) return null;

  const totalGeral = linhas.reduce((soma, linha) => soma + linha.total, 0);

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
            Hoje na agenda da unidade
          </p>
          <p className="mt-1 text-sm text-foreground">
            <strong>{totalGeral}</strong> {totalGeral === 1 ? "pessoa marcada" : "pessoas marcadas"}{" "}
            no total
          </p>

          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {linhas.map((linha) => (
              <li key={linha.chave} className="truncate">
                <strong className="text-foreground">{linha.nome}</strong> tem{" "}
                <strong className="text-info">{linha.total}</strong>{" "}
                {linha.total === 1 ? "pessoa marcada" : "pessoas marcadas"} para ser
                {linha.total === 1 ? "" : "em"} ouvida{linha.total === 1 ? "" : "s"}
              </li>
            ))}
          </ul>

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
