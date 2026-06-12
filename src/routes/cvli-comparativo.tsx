import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarRange, CheckCircle2, FileSpreadsheet, Target } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AppLayout } from "@/components/AppLayout";
import { buildCvliMonthlyComparison, type CvliMetric } from "@/lib/cvliMetrics";
import { listInqueritos, type InqueritoRecord } from "@/lib/repositories/inqueritosRepository";

export const Route = createFileRoute("/cvli-comparativo")({
  head: () => ({
    meta: [
      { title: "CVLI — Comparativo Mensal — SIPI" },
      {
        name: "description",
        content: "Comparativo mensal de registros e elucidações de CVLI por ano.",
      },
    ],
  }),
  component: CvliComparativoPage,
});

function CvliComparativoPage() {
  const [inqueritos, setInqueritos] = useState<InqueritoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState("todos");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const data = await listInqueritos();
        if (!cancelled) setInqueritos(data);
      } catch {
        if (!cancelled) {
          setError("Não foi possível carregar o comparativo CVLI.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const comparison = useMemo(() => buildCvliMonthlyComparison(inqueritos), [inqueritos]);
  const visibleYears = useMemo(
    () =>
      selectedYear === "todos"
        ? comparison.years
        : comparison.years.filter((year) => String(year) === selectedYear),
    [comparison.years, selectedYear],
  );
  const summary = useMemo(() => {
    const metrics = visibleYears.map((year) => comparison.totals[year]).filter(Boolean);
    const registros = metrics.reduce((total, metric) => total + metric.registros, 0);
    const elucidados = metrics.reduce((total, metric) => total + metric.elucidados, 0);
    const taxa = registros === 0 ? 0 : Number(((elucidados / registros) * 100).toFixed(1));

    return { registros, elucidados, taxa };
  }, [comparison.totals, visibleYears]);

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1600px]">
        <header className="mb-5 border-b border-border/70 pb-5">
          <Link
            to="/"
            className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-success transition hover:text-success/80"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Dashboard
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-info/40 bg-info/10 text-info shadow-[0_0_18px_rgba(14,165,233,0.12)]">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-info">
                  Inteligência operacional
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-normal text-foreground">
                  CVLI — Comparativo Mensal
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Registros e elucidações organizados por mês e ano.
                </p>
              </div>
            </div>

            <label className="flex w-full flex-col gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground sm:w-52">
              Filtrar por ano
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none transition focus:border-success/60 focus:ring-2 focus:ring-success/15"
              >
                <option value="todos">Todos os anos</option>
                {comparison.years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryMetric
            label="Registros"
            value={summary.registros}
            icon={<CalendarRange className="h-4 w-4" />}
            tone="info"
          />
          <SummaryMetric
            label="Elucidados"
            value={summary.elucidados}
            icon={<CheckCircle2 className="h-4 w-4" />}
            tone="success"
          />
          <SummaryMetric
            label="Taxa de elucidação"
            value={`${formatRate(summary.taxa)}%`}
            icon={<Target className="h-4 w-4" />}
            tone={getRateTone(summary.taxa)}
          />
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-col gap-2 border-b border-border bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.16em] text-info">
                CVLI — Comparativo Mensal
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Fonte: inquéritos ativos acessíveis ao usuário atual.
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {visibleYears.length} ano(s) exibido(s)
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Carregando dados reais do CVLI...
            </div>
          ) : error ? (
            <div className="p-12 text-center text-sm text-destructive">{error}</div>
          ) : visibleYears.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Nenhum registro CVLI com data de referência foi encontrado.
            </div>
          ) : (
            <CvliComparisonTable comparison={comparison} years={visibleYears} />
          )}
        </section>
      </div>
    </AppLayout>
  );
}

function CvliComparisonTable({
  comparison,
  years,
}: {
  comparison: ReturnType<typeof buildCvliMonthlyComparison>;
  years: number[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-background/45">
            <th
              rowSpan={2}
              className="sticky left-0 z-10 w-44 border-r border-border bg-card px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground"
            >
              Mês
            </th>
            {years.map((year) => (
              <th
                key={year}
                colSpan={3}
                className="border-r border-border px-4 py-3 text-center text-sm font-black text-foreground last:border-r-0"
              >
                {year}
              </th>
            ))}
          </tr>
          <tr className="border-b border-border bg-muted/25">
            {years.flatMap((year) => [
              <th
                key={`${year}-registros`}
                className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
              >
                Registros
              </th>,
              <th
                key={`${year}-elucidados`}
                className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
              >
                Elucidados
              </th>,
              <th
                key={`${year}-taxa`}
                className="border-r border-border px-3 py-2 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground last:border-r-0"
              >
                %
              </th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {comparison.rows.map((row) => (
            <tr
              key={row.monthIndex}
              className="border-b border-border/60 transition-colors hover:bg-success/[0.035]"
            >
              <th className="sticky left-0 z-10 border-r border-border bg-card px-4 py-3 text-left font-semibold text-foreground">
                {row.month}
              </th>
              {years.flatMap((year) =>
                renderMetricCells(`${row.monthIndex}-${year}`, row.byYear[year]),
              )}
            </tr>
          ))}
          <tr className="border-t-2 border-success/45 bg-success/[0.07] font-black">
            <th className="sticky left-0 z-10 border-r border-success/30 bg-[color-mix(in_oklab,var(--card)_92%,var(--success))] px-4 py-4 text-left text-success">
              TOTAL
            </th>
            {years.flatMap((year) =>
              renderMetricCells(`total-${year}`, comparison.totals[year], true),
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function renderMetricCells(key: string, metric: CvliMetric, emphasized = false) {
  const valueClass = emphasized ? "font-black text-foreground" : "font-semibold text-foreground";

  return [
    <td key={`${key}-registros`} className={`px-3 py-3 text-right tabular-nums ${valueClass}`}>
      {metric.registros}
    </td>,
    <td key={`${key}-elucidados`} className={`px-3 py-3 text-right tabular-nums ${valueClass}`}>
      {metric.elucidados}
    </td>,
    <td
      key={`${key}-taxa`}
      className={`border-r border-border px-3 py-3 text-right font-black tabular-nums last:border-r-0 ${getRateTextClass(metric.taxa)}`}
    >
      {formatRate(metric.taxa)}%
    </td>,
  ];
}

function SummaryMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  tone: "success" | "warning" | "destructive" | "info";
}) {
  const tones = {
    success: "border-success/30 text-success bg-success/[0.055]",
    warning: "border-warning/30 text-warning bg-warning/[0.055]",
    destructive: "border-destructive/30 text-destructive bg-destructive/[0.055]",
    info: "border-info/30 text-info bg-info/[0.055]",
  };

  return (
    <div className={`rounded-lg border px-4 py-3 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.14em]">{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-black tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function formatRate(rate: number) {
  return rate.toString().replace(".", ",");
}

function getRateTone(rate: number) {
  if (rate >= 70) return "success" as const;
  if (rate >= 40) return "warning" as const;
  return "destructive" as const;
}

function getRateTextClass(rate: number) {
  if (rate >= 70) return "text-success";
  if (rate >= 40) return "text-warning";
  return "text-destructive";
}
