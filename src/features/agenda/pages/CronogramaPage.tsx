import { CalendarRange, ListOrdered, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { listAgendamentosPeriodo, listResponsaveis } from "@/lib/repositories/agendaRepository";
import { AgendamentoLinha } from "../components/AgendamentoLinha";
import {
  QUALIFICACAO_LABELS,
  chaveDoDia,
  formatDiaExtenso,
  inicioDoDia,
  somarDias,
} from "../agendaConstants";
import type { AgendamentoRecord, ResponsavelOption } from "../agendaTypes";

type Janela = "semana" | "proxima" | "mes";

const JANELAS: Array<{ valor: Janela; label: string; dias: number }> = [
  { valor: "semana", label: "Próximos 7 dias", dias: 7 },
  { valor: "proxima", label: "Próximos 15 dias", dias: 15 },
  { valor: "mes", label: "Próximos 30 dias", dias: 30 },
];

type Agrupamento = "dia" | "responsavel";

export default function CronogramaPage() {
  const [janela, setJanela] = useState<Janela>("semana");
  const [agrupamento, setAgrupamento] = useState<Agrupamento>("dia");
  const [responsavelId, setResponsavelId] = useState("");
  const [responsaveis, setResponsaveis] = useState<ResponsavelOption[]>([]);
  const [agendamentos, setAgendamentos] = useState<AgendamentoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelado = false;
    void listResponsaveis()
      .then((data) => {
        if (!cancelado) setResponsaveis(data);
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

    const dias = JANELAS.find((item) => item.valor === janela)?.dias ?? 7;
    const inicio = inicioDoDia(new Date());

    void listAgendamentosPeriodo({
      inicio: inicio.toISOString(),
      fim: somarDias(inicio, dias).toISOString(),
      responsavelUserId: responsavelId || null,
      limit: 500,
    })
      .then((data) => {
        if (!cancelado) setAgendamentos(data);
      })
      .catch((causa) => {
        console.error("[CronogramaPage] Falha ao carregar o cronograma", causa);
        if (!cancelado) setErro("Não foi possível carregar o cronograma.");
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [janela, responsavelId]);

  const ativos = useMemo(
    () => agendamentos.filter((item) => item.status !== "cancelado"),
    [agendamentos],
  );

  const grupos = useMemo(() => {
    const mapa = new Map<
      string,
      { titulo: string; subtitulo: string; itens: AgendamentoRecord[] }
    >();

    ativos.forEach((item) => {
      const chave =
        agrupamento === "dia"
          ? chaveDoDia(item.data_hora)
          : (item.responsavel_user_id ?? "sem-responsavel");

      const atual = mapa.get(chave);
      if (atual) {
        atual.itens.push(item);
        return;
      }

      mapa.set(chave, {
        titulo:
          agrupamento === "dia"
            ? formatDiaExtenso(new Date(item.data_hora))
            : (item.responsavel_nome ?? "Sem responsável definido"),
        subtitulo: "",
        itens: [item],
      });
    });

    const lista = Array.from(mapa.entries()).map(([chave, grupo]) => ({ chave, ...grupo }));

    if (agrupamento === "dia") {
      lista.sort((a, b) => a.chave.localeCompare(b.chave));
    } else {
      lista.sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
    }

    return lista;
  }, [ativos, agrupamento]);

  const resumoQualificacao = useMemo(() => {
    const contagem = new Map<string, number>();
    ativos.forEach((item) => {
      contagem.set(item.qualificacao, (contagem.get(item.qualificacao) ?? 0) + 1);
    });
    return Array.from(contagem.entries()).sort((a, b) => b[1] - a[1]);
  }, [ativos]);

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-border/70 bg-card/60 p-5 lg:p-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-info/25 bg-info/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-info">
          MÓDULO AGENDA
        </div>
        <h1 className="text-3xl font-black tracking-tight">CRONOGRAMA</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          O que cada um marcou para os próximos dias — quem vai ser ouvido, por quem e sobre qual
          fato.
        </p>
      </header>

      <section className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-3">
        <label className="min-w-0">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Período
          </span>
          <select
            value={janela}
            onChange={(evento) => setJanela(evento.target.value as Janela)}
            className="h-11 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus:border-info/50"
          >
            {JANELAS.map((item) => (
              <option key={item.valor} value={item.valor}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-0">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Responsável
          </span>
          <select
            value={responsavelId}
            onChange={(evento) => setResponsavelId(evento.target.value)}
            className="h-11 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus:border-info/50"
          >
            <option value="">Todos os servidores</option>
            {responsaveis.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-0">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Agrupar por
          </span>
          <select
            value={agrupamento}
            onChange={(evento) => setAgrupamento(evento.target.value as Agrupamento)}
            className="h-11 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus:border-info/50"
          >
            <option value="dia">Dia</option>
            <option value="responsavel">Responsável</option>
          </select>
        </label>
      </section>

      {resumoQualificacao.length ? (
        <section className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/60 p-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Users className="h-3.5 w-3.5 text-info" /> {ativos.length} convocação(ões)
          </span>
          {resumoQualificacao.map(([qualificacao, total]) => (
            <span
              key={qualificacao}
              className="rounded-md border border-info/25 bg-info/8 px-2 py-1 text-[10px] font-semibold text-info"
            >
              {QUALIFICACAO_LABELS[qualificacao as keyof typeof QUALIFICACAO_LABELS] ??
                qualificacao}
              : {total}
            </span>
          ))}
        </section>
      ) : null}

      {erro ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {erro}
        </p>
      ) : null}

      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Montando cronograma...</p>
      ) : grupos.length ? (
        <div className="space-y-5">
          {grupos.map((grupo) => (
            <section key={grupo.chave} className="rounded-2xl border border-border bg-card">
              <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  {agrupamento === "dia" ? (
                    <CalendarRange className="h-4 w-4 shrink-0 text-info" />
                  ) : (
                    <Users className="h-4 w-4 shrink-0 text-info" />
                  )}
                  <h2 className="truncate text-sm font-black capitalize">{grupo.titulo}</h2>
                </div>
                <span className="shrink-0 rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                  {grupo.itens.length}
                </span>
              </header>
              <div className="space-y-2 p-3">
                {grupo.itens.map((agendamento, indice) => (
                  <AgendamentoLinha
                    key={agendamento.id}
                    agendamento={agendamento}
                    ordem={indice + 1}
                    mostrarResponsavel={agrupamento === "dia"}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center">
          <ListOrdered className="h-9 w-9 text-muted-foreground" />
          <strong className="mt-3 text-sm">Nenhuma convocação no período</strong>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
            Assim que alguém for marcado para os próximos dias, o cronograma monta a lista
            automaticamente.
          </p>
        </div>
      )}
    </div>
  );
}
