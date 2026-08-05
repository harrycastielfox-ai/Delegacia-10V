import {
  CalendarRange,
  CheckCircle2,
  FileChartColumn,
  Filter,
  Navigation,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Panel } from "@/components/Panel";
import { StatCard } from "@/components/StatCard";
import { listDiligenciasPage } from "@/lib/repositories/localizacaoRepository";
import type { DiligenciaListRecord } from "../localizacaoTypes";
import { DiligenciasTable } from "../components/DiligenciasTable";

export default function RelatoriosPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [team, setTeam] = useState("");
  const [records, setRecords] = useState<DiligenciaListRecord[]>([]);
  const [applied, setApplied] = useState({ from: "", to: "", team: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void listDiligenciasPage({
      de: applied.from || undefined,
      ate: applied.to || undefined,
      equipe: applied.team || undefined,
      pageSize: 100,
    })
      .then((result) => {
        if (!cancelled) {
          setRecords(result);
          setError("");
        }
      })
      .catch((cause) => {
        console.error("[RelatoriosPage] Falha ao carregar o relatório", cause);
        if (!cancelled) {
          setRecords([]);
          setError("Não foi possível carregar o relatório de campo.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applied]);

  const teams = useMemo(
    () =>
      Array.from(
        new Set(records.map((item) => item.equipe_nome).filter(Boolean) as string[]),
      ).sort(),
    [records],
  );
  const active = records.filter(
    (item) => item.status !== "concluida" && item.status !== "cancelada",
  ).length;
  const completed = records.filter((item) => item.status === "concluida").length;
  const onSite = records.filter((item) => item.status === "no_local").length;

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApplied({ from, to, team });
  }

  return (
    <div>
      {error ? (
        <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <header className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-operational">
          Documentação operacional
        </p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">Relatórios de campo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consolidação das diligências por período e equipe.
        </p>
      </header>

      <Panel
        title="FILTROS DO RELATÓRIO"
        icon={<Filter className="h-4 w-4 text-operational" />}
        accent="primary"
        className="mb-5"
      >
        <form onSubmit={applyFilters} className="grid gap-3 md:grid-cols-[1fr_1fr_1.2fr_auto]">
          <label>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              De
            </span>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>
          <label>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Até
            </span>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>
          <label>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Equipe
            </span>
            <select
              value={team}
              onChange={(event) => setTeam(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="">Todas as equipes</option>
              {teams.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-operational px-4 text-sm font-bold text-[var(--operational-contrast)]"
          >
            <FileChartColumn className="h-4 w-4" /> Consolidar
          </button>
        </form>
      </Panel>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="TOTAL NO PERÍODO"
          value={records.length}
          hint="Diligências consolidadas"
          icon={CalendarRange}
          tone="primary"
        />
        <StatCard
          label="EM ANDAMENTO"
          value={active}
          hint="Ordens ainda abertas"
          icon={Navigation}
          tone="warning"
        />
        <StatCard
          label="NO LOCAL"
          value={onSite}
          hint="Presença confirmada"
          icon={UsersRound}
          tone="success"
        />
        <StatCard
          label="CONCLUÍDAS"
          value={completed}
          hint="Ações finalizadas"
          icon={CheckCircle2}
          tone="info"
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <header className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider">Resumo do período</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {applied.from || applied.to || applied.team
              ? "Filtros aplicados ao relatório."
              : "Exibindo todas as diligências disponíveis."}
          </p>
        </header>
        {loading ? (
          <div className="py-24 text-center text-sm text-muted-foreground">
            Consolidando dados...
          </div>
        ) : (
          <DiligenciasTable
            diligencias={records}
            onSelect={() => undefined}
            emptyMessage="Nenhuma diligência encontrada para o período."
          />
        )}
      </section>
    </div>
  );
}
