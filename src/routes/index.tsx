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
  Gavel,
  Shield,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line,
  ComposedChart,
  BarChart,
} from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Panel } from "@/components/Panel";
import {
  META,
  PANORAMA,
  POR_STATUS,
  POR_PRIORIDADE,
  POR_GRAVIDADE,
  CVLI_ANUAL,
  CVLI_MENSAL,
  POR_BAIRRO,
  EQUIPES,
  PROCEDIMENTOS,
  PENDENTES_ESPECIFICOS,
} from "@/data/sipi";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel — DT Itabela / 23ª COORPIN" },
      { name: "description", content: "Dashboard executivo da Delegacia Territorial de Itabela." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const finalizados = PANORAMA.relatorioEnviado;
  const total = PANORAMA.totalCadastrados;

  return (
    <AppLayout>
      <PageHeader
        title="Painel de Controle"
        subtitle={`${META.unidade} — atualizado em ${META.atualizadoEm}`}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4 mb-6">
        <StatCard label="TOTAL" value={total} hint="Procedimentos cadastrados" icon={FileText} tone="success" />
        <StatCard label="EM ANDAMENTO" value={PANORAMA.emAndamento} hint={`${Math.round((PANORAMA.emAndamento / total) * 100)}% do total`} icon={Clock} tone="info" />
        <StatCard label="CONCLUÍDOS" value={finalizados} hint={`${PANORAMA.taxaConclusao}% taxa atual`} icon={CheckCircle2} tone="primary" />
        <StatCard label="PRIOR. ALTA" value={PANORAMA.prioridadeAlta} hint="Requer atenção" icon={TrendingUp} tone="warning" />
        <StatCard label="PRAZO CRÍTICO" value={PANORAMA.prazoCritico} hint="< 3 dias" icon={AlertTriangle} tone="destructive" />
        <StatCard label="RÉU PRESO" value={PANORAMA.reuPreso} hint="Casos com prisão" icon={Shield} tone="purple" />
        <StatCard label="MED. PROTETIVAS" value={PANORAMA.medidasProtetivas} hint="Ativas" icon={Gavel} tone="warning" />
      </div>

      {/* Mid row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <Panel
          title="ALERTAS CRÍTICOS"
          accent="destructive"
          icon={<AlertOctagon className="h-4 w-4 text-destructive" />}
        >
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold">Inquéritos em prazo crítico</div>
                <div className="text-xs text-muted-foreground">Menos de 3 dias para vencer</div>
              </div>
              <span className="text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30 px-2 py-1 rounded">
                {PANORAMA.prazoCritico}
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-warning shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold">Casos prioridade ALTA</div>
                <div className="text-xs text-muted-foreground">Demandam ação imediata</div>
              </div>
              <span className="text-[10px] font-bold bg-warning/15 text-warning border border-warning/30 px-2 py-1 rounded">
                {PANORAMA.prioridadeAlta}
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-info shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold">CVLI sem relatar</div>
                <div className="text-xs text-muted-foreground">IP de homicídios pendentes</div>
              </div>
              <span className="text-[10px] font-bold bg-info/15 text-info border border-info/30 px-2 py-1 rounded">
                188
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-purple shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold">Crimes Sexuais sem relatar</div>
                <div className="text-xs text-muted-foreground">Aguardando conclusão</div>
              </div>
              <span className="text-[10px] font-bold bg-purple/15 text-purple border border-purple/30 px-2 py-1 rounded">
                25
              </span>
            </li>
          </ul>
        </Panel>

        <Panel title="PENDÊNCIAS POR CATEGORIA" accent="warning" icon={<Bell className="h-4 w-4 text-warning" />}>
          <ul className="space-y-3">
            {PENDENTES_ESPECIFICOS.map((p) => (
              <li key={p.label} className="flex items-start gap-3">
                <span className="h-2 w-2 rounded-full bg-warning mt-1.5 shrink-0" />
                <div className="flex-1 text-sm">{p.label}</div>
                <div className="text-sm font-bold tabular-nums text-warning">{p.value}</div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="META DE CONCLUSÃO" accent="success">
          <ul className="space-y-3 text-sm">
            <Row label="Procedimentos cadastrados" value={String(total)} color="var(--info)" />
            <Row label="Relatórios enviados" value={String(finalizados)} color="var(--success)" />
            <Row label="Em andamento" value={String(PANORAMA.emAndamento)} color="var(--warning)" />
            <Row label="Relatados não enviados" value={String(PANORAMA.relatadosNaoEnviados)} color="var(--purple)" />
          </ul>
          <div className="mt-4 p-3 rounded-lg bg-success/5 border border-success/20 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-xs font-semibold">Taxa de conclusão atual</div>
              <div className="text-[11px] text-muted-foreground">
                Meta: {PANORAMA.metaConclusao}% — atual {PANORAMA.taxaConclusao}%
              </div>
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
                  strokeDasharray={`${(PANORAMA.taxaConclusao / 100) * 94} 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-success">
                {Math.round(PANORAMA.taxaConclusao)}%
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Donut row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <DonutPanel title="POR STATUS DE DILIGÊNCIA" data={POR_STATUS} total={POR_STATUS.reduce((a, b) => a + b.value, 0)} />
        <DonutPanel title="POR PRIORIDADE" data={POR_PRIORIDADE} total={POR_PRIORIDADE.reduce((a, b) => a + b.value, 0)} />
        <Panel
          title="PROCEDIMENTOS POR TIPO"
          accent="success"
          action={<Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />}
        >
          <ul className="space-y-3.5">
            {PROCEDIMENTOS.map((t) => (
              <li key={t.sigla} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-12 font-bold">{t.sigla}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full"
                    style={{ width: `${(t.total / 623) * 100}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums text-muted-foreground w-20 text-right">
                  {t.total}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 text-[11px] text-muted-foreground">
            IP: Inquéritos · APF: Flagrantes · TCO: Termos · BOC: Boletins · AIAI: Ato Infracional
          </div>
        </Panel>
      </div>

      {/* CVLI Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
        <Panel title="CVLI — COMPARATIVO ANUAL" accent="success" className="xl:col-span-2">
          <div className="flex items-center gap-5 text-xs mb-3">
            <Legend color="var(--info)" label="Registros" />
            <Legend color="var(--success)" label="Elucidados" />
            <Legend color="var(--foreground)" label="Taxa de elucidação (%)" line />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={CVLI_ANUAL} margin={{ top: 20, right: 20, bottom: 0, left: -10 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="ano" stroke="var(--muted-foreground)" fontSize={11} />
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
                <Bar yAxisId="left" dataKey="registros" fill="var(--info)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="elucidados" fill="var(--success)" radius={[4, 4, 0, 0]} />
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
        </Panel>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/20">
            <div className="text-[10px] tracking-[0.15em] text-muted-foreground font-bold">
              CVLI — RESUMO ANUAL
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[10px] tracking-[0.15em] text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-bold">ANO</th>
                <th className="text-right px-4 py-3 font-bold">REG</th>
                <th className="text-right px-4 py-3 font-bold">ELUC</th>
                <th className="text-right px-4 py-3 font-bold">%</th>
              </tr>
            </thead>
            <tbody>
              {CVLI_ANUAL.map((r) => (
                <tr key={r.ano} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold">{r.ano}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.registros}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.elucidados}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-success font-semibold">
                    {r.taxa.toString().replace(".", ",")}%
                  </td>
                </tr>
              ))}
              <tr className="border-t border-border bg-muted/30 font-bold">
                <td className="px-4 py-3">TOTAL</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {CVLI_ANUAL.reduce((a, b) => a + b.registros, 0)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {CVLI_ANUAL.reduce((a, b) => a + b.elucidados, 0)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-success">61,1%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* CVLI mensal + Bairros */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
        <Panel title="CVLI — REGISTROS MENSAIS (2023–2026)" accent="info">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CVLI_MENSAL} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={10} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="r2023" fill="var(--muted-foreground)" name="2023" />
                <Bar dataKey="r2024" fill="var(--info)" name="2024" />
                <Bar dataKey="r2025" fill="var(--warning)" name="2025" />
                <Bar dataKey="r2026" fill="var(--destructive)" name="2026" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="ANÁLISE POR LOCALIDADE" accent="warning">
          <div className="overflow-auto max-h-72">
            <table className="w-full text-sm">
              <thead className="text-[10px] tracking-[0.15em] text-muted-foreground sticky top-0 bg-card">
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-bold">BAIRRO</th>
                  <th className="text-right py-2 font-bold">TOTAL</th>
                  <th className="text-right py-2 font-bold">CVLI</th>
                  <th className="text-right py-2 font-bold">ALTA</th>
                </tr>
              </thead>
              <tbody>
                {POR_BAIRRO.map((b) => (
                  <tr key={b.bairro} className="border-b border-border/50">
                    <td className="py-2.5 font-medium">{b.bairro}</td>
                    <td className="py-2.5 text-right tabular-nums">{b.total}</td>
                    <td className="py-2.5 text-right tabular-nums text-destructive">{b.cvli}</td>
                    <td className="py-2.5 text-right tabular-nums text-warning">{b.alta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Gravidade + Equipe */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Panel title="ANÁLISE POR GRAVIDADE" accent="destructive">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={POR_GRAVIDADE} layout="vertical" margin={{ top: 5, right: 20, bottom: 0, left: 10 }}>
                <CartesianGrid stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={10} width={140} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" fill="var(--destructive)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="DISTRIBUIÇÃO POR EQUIPE"
          accent="success"
          action={<ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        >
          <ul className="space-y-3.5">
            {EQUIPES.map((t) => (
              <li key={t.name} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-44 truncate">{t.name}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full"
                    style={{ width: `${t.pct}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums text-muted-foreground w-20 text-right">
                  {t.value} ({t.pct}%)
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-5 p-3 rounded-lg bg-info/5 border border-info/20">
            <div className="text-xs font-semibold mb-1 flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-info" /> Elucidações CVLI 2025
            </div>
            <div className="text-[11px] text-muted-foreground">
              Equipe IPC Marluan / IPC Rivaldo: <span className="text-success font-bold">21 casos elucidados</span>
            </div>
          </div>
        </Panel>
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
      action={<Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />}
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
                <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                <span className="flex-1 text-foreground/90 text-xs truncate">{d.name}</span>
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
