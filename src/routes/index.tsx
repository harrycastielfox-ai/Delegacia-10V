import { createFileRoute } from "@tanstack/react-router";
import {
  FileText,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  CalendarX,
  Info,
  AlertOctagon,
  Bell,
  Maximize2,
  ChevronRight,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line,
  ComposedChart,
} from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Panel } from "@/components/Panel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel de Controle — SIPI" },
      { name: "description", content: "Visão operacional dos inquéritos policiais." },
    ],
  }),
  component: Dashboard,
});

const criticalCases = [
  { id: "IPL 2024.0001234-5", days: 12 },
  { id: "IPL 2024.0000987-1", days: 7 },
  { id: "IPL 2024.0000765-3", days: 3 },
];

const alerts = [
  { dot: "warning", text: "7 inquéritos sem atualização há mais de 15 dias", time: "Há 2 horas" },
  { dot: "warning", text: "5 inquéritos sem prazo definido", time: "Há 4 horas" },
  { dot: "warning", text: "3 inquéritos próximos do vencimento (≤ 5 dias)", time: "Há 6 horas" },
];

const situationData = [
  { name: "Em andamento", value: 512, color: "var(--success)" },
  { name: "Finalizados", value: 142, color: "var(--info)" },
  { name: "Outros", value: 30, color: "var(--warning)" },
];
const gravityData = [
  { name: "Alta", value: 98, color: "var(--destructive)" },
  { name: "Média", value: 352, color: "var(--warning)" },
  { name: "Baixa", value: 234, color: "var(--info)" },
];
const teamData = [
  { name: "Equipe 1", value: 256, pct: 37 },
  { name: "Equipe 2", value: 198, pct: 29 },
  { name: "Equipe 3", value: 142, pct: 21 },
  { name: "Outros", value: 88, pct: 13 },
];
const cvliData = [
  { year: "2021", elucidados: 45, registros: 98, taxa: 45.9 },
  { year: "2022", elucidados: 52, registros: 110, taxa: 47.3 },
  { year: "2023", elucidados: 61, registros: 125, taxa: 48.8 },
  { year: "2024", elucidados: 74, registros: 140, taxa: 52.9 },
  { year: "2025", elucidados: 68, registros: 128, taxa: 53.1 },
  { year: "2026", elucidados: 23, registros: 83, taxa: 27.7 },
];

function Dashboard() {
  return (
    <AppLayout>
      <PageHeader title="Painel de Controle" subtitle="Visão operacional dos inquéritos policiais" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4 mb-6">
        <StatCard label="TOTAL" value={684} hint="Inquéritos cadastrados" icon={FileText} tone="success" />
        <StatCard label="EM ANDAMENTO" value={512} hint="75% do total" icon={Clock} tone="info" />
        <StatCard label="FINALIZADOS" value={142} hint="21% do total" icon={CheckCircle2} tone="primary" />
        <StatCard label="ALTA PRIORIDADE" value={18} hint="Requer atenção" icon={TrendingUp} tone="warning" />
        <StatCard label="VENCIDOS" value={12} hint="Prazo expirado" icon={AlertTriangle} tone="destructive" />
        <StatCard label="SEM PRAZO" value={23} hint="Sem data limite" icon={CalendarX} tone="purple" />
        <StatCard label="SEM ATUALIZAÇÃO" value={37} hint="+ 15 dias" icon={Info} tone="warning" />
      </div>

      {/* Mid row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <Panel
          title="CASOS CRÍTICOS"
          accent="destructive"
          icon={<AlertOctagon className="h-4 w-4 text-destructive" />}
          action={
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold bg-destructive/20 text-destructive px-2 py-0.5 rounded">
                5
              </span>
              <button className="text-xs text-destructive flex items-center gap-1 hover:underline">
                Ver todos <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          }
        >
          <ul className="space-y-3">
            {criticalCases.map((c) => (
              <li key={c.id} className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{c.id}</div>
                  <div className="text-xs text-muted-foreground">Vencido há {c.days} dias</div>
                </div>
                <span className="text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30 px-2 py-1 rounded">
                  VENCIDO
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="ALERTAS RECENTES"
          accent="warning"
          icon={<Bell className="h-4 w-4 text-warning" />}
          action={
            <button className="text-xs text-warning flex items-center gap-1 hover:underline">
              Ver todos <ChevronRight className="h-3 w-3" />
            </button>
          }
        >
          <ul className="space-y-3">
            {alerts.map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="h-2 w-2 rounded-full bg-warning mt-1.5 shrink-0" />
                <div className="flex-1 text-sm">{a.text}</div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">{a.time}</div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="SITUAÇÃO OPERACIONAL" accent="success">
          <ul className="space-y-3 text-sm">
            <Row label="Inquéritos ativos" value="512" color="var(--success)" />
            <Row label="Vencidos" value="12" color="var(--destructive)" />
            <Row label="Sem atualização (+15 dias)" value="37" color="var(--warning)" />
            <Row label="Sem prazo definido" value="23" color="var(--purple)" />
          </ul>
          <div className="mt-4 p-3 rounded-lg bg-success/5 border border-success/20 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-xs font-semibold">Taxa de resolução</div>
              <div className="text-[11px] text-muted-foreground">142 de 684 finalizados</div>
            </div>
            <div className="relative h-12 w-12">
              <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="var(--success)"
                  strokeWidth="3"
                  strokeDasharray={`${21 * 0.94} 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-success">
                21%
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Donut row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <DonutPanel title="POR SITUAÇÃO" data={situationData} total={684} />
        <Panel
          title="POR EQUIPE"
          accent="success"
          action={
            <button className="text-muted-foreground hover:text-foreground">
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          }
        >
          <ul className="space-y-3.5">
            {teamData.map((t) => (
              <li key={t.name} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-16">{t.name}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full"
                    style={{ width: `${(t.value / 256) * 100}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums text-muted-foreground w-20 text-right">
                  {t.value} ({t.pct}%)
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <DonutPanel title="POR GRAVIDADE" data={gravityData} total={684} />
      </div>

      {/* Bottom row: chart + table */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Panel title="CVLI – COMPARATIVO DE ELUCIDAÇÃO" accent="success" className="xl:col-span-2">
          <div className="flex items-center gap-5 text-xs mb-3">
            <Legend color="var(--success)" label="Elucidados" />
            <Legend color="var(--info)" label="Registros" />
            <Legend color="var(--foreground)" label="Taxa de elucidação (%)" line />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={cvliData} margin={{ top: 20, right: 20, bottom: 0, left: -10 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="year" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis yAxisId="left" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar yAxisId="left" dataKey="elucidados" fill="var(--success)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="registros" fill="var(--info)" radius={[4, 4, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="taxa"
                  stroke="var(--foreground)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--foreground)" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-[11px] text-muted-foreground mt-2">
            Clique nas barras para filtrar os casos do ano selecionado
          </p>
        </Panel>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[10px] tracking-[0.15em] text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-bold">ANO</th>
                <th className="text-right px-4 py-3 font-bold">REGISTROS</th>
                <th className="text-right px-4 py-3 font-bold">ELUCIDADOS</th>
                <th className="text-right px-4 py-3 font-bold">%</th>
              </tr>
            </thead>
            <tbody>
              {cvliData.map((r) => (
                <tr key={r.year} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold">{r.year}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.registros}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.elucidados}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-success font-semibold">
                    {r.taxa.toString().replace(".", ",")}%
                  </td>
                </tr>
              ))}
              <tr className="border-t border-border bg-muted/30 font-bold">
                <td className="px-4 py-3">TOTAL</td>
                <td className="px-4 py-3 text-right tabular-nums">684</td>
                <td className="px-4 py-3 text-right tabular-nums">323</td>
                <td className="px-4 py-3 text-right tabular-nums text-success">47,2%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-foreground/90">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="tabular-nums font-semibold" style={{ color }}>
        {value}
      </span>
    </li>
  );
}

function Legend({ color, label, line }: { color: string; label: string; line?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      {line ? (
        <span className="h-0.5 w-4" style={{ backgroundColor: color }} />
      ) : (
        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      )}
      {label}
    </span>
  );
}

function DonutPanel({
  title,
  data,
  total,
}: {
  title: string;
  data: { name: string; value: number; color: string }[];
  total: number;
}) {
  return (
    <Panel
      title={title}
      accent="success"
      action={
        <button className="text-muted-foreground hover:text-foreground">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      }
    >
      <div className="flex items-center gap-4">
        <div className="relative h-36 w-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={45}
                outerRadius={68}
                paddingAngle={2}
                stroke="none"
              >
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums">{total}</span>
            <span className="text-[10px] text-muted-foreground">Total</span>
          </div>
        </div>
        <ul className="flex-1 space-y-2 text-sm">
          {data.map((d) => {
            const pct = Math.round((d.value / total) * 100);
            return (
              <li key={d.name} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                <span className="flex-1 text-foreground/90">{d.name}</span>
                <span className="tabular-nums text-muted-foreground text-xs">
                  {d.value} ({pct}%)
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Panel>
  );
}
