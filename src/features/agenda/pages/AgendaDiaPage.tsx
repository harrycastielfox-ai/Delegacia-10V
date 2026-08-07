import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListOrdered,
  Search,
  UserX,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { useAppProfile } from "@/components/AppProfileContext";
import { canManageAgenda } from "@/lib/authz";
import {
  getAgendaOverviewStats,
  listAgendamentosPeriodo,
} from "@/lib/repositories/agendaRepository";
import { AgendamentoLinha } from "../components/AgendamentoLinha";
import {
  QUALIFICACAO_LABELS,
  QUALIFICACOES_VULNERAVEIS,
  formatDiaExtenso,
  inicioDoDia,
  somarDias,
} from "../agendaConstants";
import type { AgendaOverviewStats, AgendamentoRecord, Qualificacao } from "../agendaTypes";

const EMPTY_STATS: AgendaOverviewStats = {
  hoje: 0,
  amanha: 0,
  semana: 0,
  intimacaoPendente: 0,
  naoCompareceuMes: 0,
  porQualificacao: {},
};

/**
 * Avisa quando vítima e autor do mesmo fato estão marcados em horários que se
 * cruzam — os dois acabam na mesma sala de espera. É só aviso: em acareação o
 * encontro é proposital.
 */
function detectarEncontrosDeRisco(agendamentos: AgendamentoRecord[]) {
  const ativos = agendamentos.filter(
    (item) => item.status !== "cancelado" && item.status !== "remarcado",
  );
  const avisos: Array<{ chave: string; vulneravel: string; autor: string; horario: string }> = [];

  ativos.forEach((a) => {
    if (!QUALIFICACOES_VULNERAVEIS.includes(a.qualificacao)) return;
    const vinculo = a.numero_bo?.trim() || a.inquerito_id;
    if (!vinculo) return;

    const inicioA = new Date(a.data_hora).getTime();
    const fimA = inicioA + a.duracao_minutos * 60_000;

    ativos.forEach((b) => {
      if (b.qualificacao !== "autor") return;
      const vinculoB = b.numero_bo?.trim() || b.inquerito_id;
      if (vinculoB !== vinculo) return;

      const inicioB = new Date(b.data_hora).getTime();
      const fimB = inicioB + b.duracao_minutos * 60_000;
      if (inicioA >= fimB || inicioB >= fimA) return;

      avisos.push({
        chave: `${a.id}-${b.id}`,
        vulneravel: a.pessoa_nome,
        autor: b.pessoa_nome,
        horario: new Intl.DateTimeFormat("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(Math.max(inicioA, inicioB))),
      });
    });
  });

  return avisos;
}

export default function AgendaDiaPage() {
  const profile = useAppProfile();
  const podeMarcar = canManageAgenda(profile);
  const [dia, setDia] = useState(() => inicioDoDia(new Date()));
  const [agendamentos, setAgendamentos] = useState<AgendamentoRecord[]>([]);
  const [stats, setStats] = useState<AgendaOverviewStats>(EMPTY_STATS);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelado = false;
    void getAgendaOverviewStats()
      .then((data) => {
        if (!cancelado) setStats({ ...EMPTY_STATS, ...data });
      })
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setErro("");

    void listAgendamentosPeriodo({
      inicio: dia.toISOString(),
      fim: somarDias(dia, 1).toISOString(),
    })
      .then((data) => {
        if (!cancelado) setAgendamentos(data);
      })
      .catch((causa) => {
        console.error("[AgendaDiaPage] Falha ao carregar a agenda", causa);
        if (!cancelado) setErro("Não foi possível carregar a agenda deste dia.");
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [dia]);

  const filtrados = useMemo(() => {
    const alvo = busca.trim().toLocaleLowerCase("pt-BR");
    if (!alvo) return agendamentos;
    return agendamentos.filter((item) =>
      [item.pessoa_nome, item.natureza ?? "", item.numero_bo ?? "", item.responsavel_nome ?? ""]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(alvo),
    );
  }, [agendamentos, busca]);

  const avisos = useMemo(() => detectarEncontrosDeRisco(agendamentos), [agendamentos]);
  const ehHoje = inicioDoDia(new Date()).getTime() === dia.getTime();

  const porQualificacaoDoDia = useMemo(() => {
    const ativos = agendamentos.filter(
      (item) => item.status !== "cancelado" && item.status !== "remarcado",
    );
    const contagem = new Map<Qualificacao, number>();
    ativos.forEach((item) => {
      contagem.set(item.qualificacao, (contagem.get(item.qualificacao) ?? 0) + 1);
    });
    return Array.from(contagem.entries()).sort((a, b) => b[1] - a[1]);
  }, [agendamentos]);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-gradient-to-br from-card/80 to-card/40 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-info/25 bg-info/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-info">
            MÓDULO AGENDAMENTO
          </div>
          <h1 className="text-3xl font-black tracking-tight">AGENDAMENTO</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Quem foi convocado, para que horário e por qual fato — vítimas, testemunhas e autores
            marcados para serem ouvidos.
          </p>
        </div>
        {podeMarcar ? (
          <Link
            to="/agenda/novo"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-info/60 bg-info/10 px-5 text-sm font-bold text-info shadow-[0_0_0_1px_transparent] transition hover:-translate-y-0.5 hover:bg-info hover:text-[var(--info-contrast,white)] hover:shadow-[0_10px_30px_color-mix(in_oklab,var(--info)_35%,transparent)]"
          >
            <CalendarPlus className="h-4 w-4" /> Marcar atendimento
          </Link>
        ) : null}
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="HOJE"
          value={stats.hoje}
          hint="Atendimentos ativos"
          icon={CalendarDays}
          tone="info"
        />
        <StatCard
          label="AMANHÃ"
          value={stats.amanha}
          hint="Já marcados"
          icon={Clock3}
          tone="primary"
          onClick={() => setDia(somarDias(inicioDoDia(new Date()), 1))}
        />
        <StatCard
          label="INTIMAÇÃO PENDENTE"
          value={stats.intimacaoPendente}
          hint="Ainda não avisados"
          icon={AlertTriangle}
          tone="warning"
        />
        <StatCard
          label="FALTAS NO MÊS"
          value={stats.naoCompareceuMes}
          hint="Não compareceram"
          icon={UserX}
          tone="destructive"
        />
      </section>

      {avisos.length ? (
        <section className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 shadow-[0_0_24px_color-mix(in_oklab,var(--destructive)_14%,transparent)]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="min-w-0">
              <h2 className="text-sm font-black text-destructive">
                Vítima e autor no mesmo horário
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Os dois vão esperar na mesma sala. Se não for acareação, separe os horários.
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                {avisos.map((aviso) => (
                  <li key={aviso.chave}>
                    <strong>{aviso.vulneravel}</strong> e <strong>{aviso.autor}</strong> por volta
                    das {aviso.horario}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <header className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDia((atual) => somarDias(atual, -1))}
                aria-label="Dia anterior"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-info/40 hover:text-info"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <strong className="block text-sm font-black capitalize">
                  {formatDiaExtenso(dia)}
                </strong>
                <span className="text-[11px] text-muted-foreground">
                  {ehHoje ? "Hoje" : null}
                  {ehHoje && filtrados.length ? " · " : null}
                  {filtrados.length
                    ? `${filtrados.length} atendimento(s)`
                    : loading
                      ? "Carregando..."
                      : "Nenhum atendimento"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDia((atual) => somarDias(atual, 1))}
                aria-label="Próximo dia"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-info/40 hover:text-info"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              {!ehHoje ? (
                <button
                  type="button"
                  onClick={() => setDia(inicioDoDia(new Date()))}
                  className="ml-1 rounded-lg border border-info/35 bg-info/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-info transition hover:bg-info/20"
                >
                  Hoje
                </button>
              ) : null}
            </div>

            <label className="relative w-full sm:max-w-xs">
              <span className="sr-only">Buscar nesta agenda</span>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Nome, B.O. ou natureza..."
                className="h-10 w-full rounded-lg border border-border bg-background/70 pl-9 pr-3 text-sm outline-none transition focus:border-info/50"
              />
            </label>
          </header>

          {erro ? (
            <p className="m-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {erro}
            </p>
          ) : null}

          <div className="space-y-2 p-4">
            {loading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Carregando agenda...
              </p>
            ) : filtrados.length ? (
              filtrados.map((agendamento, indice) => (
                <AgendamentoLinha
                  key={agendamento.id}
                  agendamento={agendamento}
                  ordem={indice + 1}
                  mostrarResponsavel
                />
              ))
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border p-6 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-info/25 bg-info/10 text-info">
                  <CalendarDays className="h-7 w-7" />
                </span>
                <strong className="mt-3 text-sm">Nada marcado para este dia</strong>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                  {busca
                    ? "Nenhum atendimento corresponde à busca."
                    : "Quando alguém for convocado para este dia, aparece aqui em ordem de horário."}
                </p>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <article className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-info">
              Resumo do dia
            </h2>
            {porQualificacaoDoDia.length ? (
              <ul className="mt-4 space-y-3">
                {porQualificacaoDoDia.map(([qualificacao, total]) => {
                  const maior = porQualificacaoDoDia[0][1];
                  return (
                    <li key={qualificacao}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold">{QUALIFICACAO_LABELS[qualificacao]}</span>
                        <span className="font-mono font-black tabular-nums text-info">{total}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted/40">
                        <div
                          className="h-full rounded-full bg-info transition-all duration-500"
                          style={{ width: `${Math.max(8, (total / maior) * 100)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Sem convocações neste dia ainda.
              </p>
            )}
          </article>

          <Link
            to="/agenda/cronograma"
            className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-info/40 hover:bg-info/5"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-info/25 bg-info/10 text-info">
              <ListOrdered className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block text-sm">Ver cronograma completo</strong>
              <span className="block text-[11px] text-muted-foreground">
                {stats.semana} nos próximos 7 dias
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-info" />
          </Link>
        </aside>
      </div>
    </div>
  );
}
