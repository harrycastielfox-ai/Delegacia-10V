import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
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
import { listInqueritos, type InqueritoRecord } from "@/lib/repositories/inqueritosRepository";
import { listRepresentacoes, type RepresentacaoRecord } from "@/lib/repositories/representacoesRepository";

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
  const navigate = Route.useNavigate();
  const [isClient, setIsClient] = useState(false);
  const [updatedAtLabel, setUpdatedAtLabel] = useState("");
  const [nowTs, setNowTs] = useState<number | null>(null);
  const [inqueritos, setInqueritos] = useState<InqueritoRecord[]>([]);
  const [representacoes, setRepresentacoes] = useState<RepresentacaoRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);


  useEffect(() => {
    setIsClient(true);
    setUpdatedAtLabel(new Date().toLocaleDateString("pt-BR"));
    setNowTs(Date.now());
  }, []);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoadError(null);
        const [inqueritosData, representacoesData] = await Promise.all([listInqueritos(), listRepresentacoes()]);
        setInqueritos(inqueritosData);
        setRepresentacoes(representacoesData);
      } catch {
        setLoadError("Não foi possível atualizar os indicadores do dashboard.");
        setInqueritos([]);
        setRepresentacoes([]);
      }
    }

    void loadDashboardData();
  }, []);


  const total = inqueritos.length;
  const totalRepresentacoes = representacoes.length;
  const emAndamento = inqueritos.filter((i) => i.situacao?.toLowerCase().includes("andamento")).length;
  const finalizados = inqueritos.filter((i) => i.relatorio_enviado?.toLowerCase() === "sim" || i.situacao?.toLowerCase().includes("conclu")).length;
  const prioridadeAlta = inqueritos.filter((i) => i.prioridade?.toLowerCase().includes("alta")).length;
  const reuPreso = inqueritos.filter((i) => i.reu_preso?.toLowerCase() === "sim").length;
  const medidasProtetivas = inqueritos.filter((i) => i.medida_protetiva?.toLowerCase() === "sim").length;
  const prazoCritico = inqueritos.filter((i) => {
    if (!i.prazo || nowTs === null) return false;
    const prazoDate = new Date(i.prazo);
    if (Number.isNaN(prazoDate.getTime())) return false;
    const diffDays = (prazoDate.getTime() - nowTs) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 3;
  }).length;
  const taxaConclusao = total === 0 ? 0 : Number(((finalizados / total) * 100).toFixed(1));
  const relatadosNaoEnviados = Math.max(total - finalizados, 0);
  const POR_STATUS = useMemo(
    () => [
      { name: "Em andamento", value: emAndamento, color: "var(--info)" },
      { name: "Concluídos", value: finalizados, color: "var(--success)" },
    ],
    [emAndamento, finalizados],
  );
  const POR_PRIORIDADE = useMemo(
    () => [
      { name: "Alta", value: prioridadeAlta, color: "var(--warning)" },
      { name: "Outras", value: Math.max(total - prioridadeAlta, 0), color: "var(--muted-foreground)" },
    ],
    [prioridadeAlta, total],
  );
  const POR_GRAVIDADE = useMemo(
    () => ["alta", "média", "baixa"].map((g) => ({ name: g.toUpperCase(), value: inqueritos.filter((i) => i.gravidade?.toLowerCase().includes(g)).length })),
    [inqueritos],
  );
  const PROCEDIMENTOS = useMemo(
    () => ["IP", "APF", "TCO", "BOC", "AIAI"].map((sigla) => ({ sigla, total: inqueritos.filter((i) => i.tipo?.toUpperCase().includes(sigla)).length })),
    [inqueritos],
  );
  const totalProcedimentos = useMemo(() => PROCEDIMENTOS.reduce((acc, item) => acc + item.total, 0), [PROCEDIMENTOS]);
  const CVLI_ANUAL = useMemo(() => [{ ano: new Date().getFullYear(), registros: total, elucidados: finalizados, taxa: taxaConclusao }], [total, finalizados, taxaConclusao]);
  const CVLI_MENSAL = useMemo(() => ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map((mes) => ({ mes, r2023: 0, r2024: 0, r2025: 0, r2026: 0 })), []);
  const POR_BAIRRO = useMemo(() => {
    const byBairro = new Map<string, { total: number; cvli: number; alta: number }>();
    inqueritos.forEach((i) => {
      const key = i.bairro || "Não informado";
      const current = byBairro.get(key) || { total: 0, cvli: 0, alta: 0 };
      current.total += 1;
      current.alta += i.prioridade?.toLowerCase().includes("alta") ? 1 : 0;
      byBairro.set(key, current);
    });
    return Array.from(byBairro.entries()).map(([bairro, v]) => ({ bairro, ...v }));
  }, [inqueritos]);
  const EQUIPES = useMemo(() => {
    const byEquipe = new Map<string, number>();
    inqueritos.forEach((i) => byEquipe.set(i.equipe || "Sem equipe", (byEquipe.get(i.equipe || "Sem equipe") || 0) + 1));
    return Array.from(byEquipe.entries()).map(([name, value]) => ({ name, value, pct: total === 0 ? 0 : Math.round((value / total) * 100) }));
  }, [inqueritos, total]);
  const panelFxClass =
    "rounded-xl transition-all duration-300 border border-border/70 hover:border-success/55 hover:shadow-[0_0_0_1px_rgba(34,197,94,0.25),0_14px_28px_-22px_rgba(34,197,94,0.75)]";
  const kpiFxClass =
    "rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(34,197,94,0.25),0_14px_30px_-22px_rgba(34,197,94,0.85)]";

  return (
    <AppLayout>
      <PageHeader title="Painel de Controle" subtitle={`SIPI — atualizado em ${updatedAtLabel || "—"}`} showActions={false} />
      {loadError ? <p className="text-xs text-muted-foreground mb-3">{loadError}</p> : null}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4 mb-6">
        <div className={kpiFxClass}><StatCard label="TOTAL" value={total} hint="Procedimentos cadastrados" icon={FileText} tone="success" onClick={() => navigate({ to: "/inqueritos" })} /></div>
        <div className={kpiFxClass}><StatCard label="EM ANDAMENTO" value={emAndamento} hint={`${total === 0 ? 0 : Math.round((emAndamento / total) * 100)}% do total`} icon={Clock} tone="info" onClick={() => navigate({ to: "/inqueritos", search: { status: "andamento" } })} /></div>
        <div className={kpiFxClass}><StatCard label="CONCLUÍDOS" value={finalizados} hint={`${taxaConclusao}% taxa atual`} icon={CheckCircle2} tone="primary" onClick={() => navigate({ to: "/inqueritos", search: { status: "concluido" } })} /></div>
        <div className={kpiFxClass}><StatCard label="PRIOR. ALTA" value={prioridadeAlta} hint="Requer atenção" icon={TrendingUp} tone="warning" onClick={() => navigate({ to: "/inqueritos", search: { prioridade: "alta" } })} /></div>
        <div className={kpiFxClass}><StatCard label="PRAZO CRÍTICO" value={prazoCritico} hint="< 3 dias" icon={AlertTriangle} tone="destructive" onClick={() => navigate({ to: "/inqueritos", search: { prazo: "critico" } })} /></div>
        <div className={kpiFxClass}><StatCard label="RÉU PRESO" value={reuPreso} hint="Casos com prisão" icon={Shield} tone="purple" /></div>
        <div className={kpiFxClass}><StatCard label="MED. PROTETIVAS" value={medidasProtetivas} hint="Ativas" icon={Gavel} tone="warning" /></div>
      </div>

      {/* Mid row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className={panelFxClass}><Panel
          title="ALERTAS CRÍTICOS"
          accent="destructive"
          icon={<AlertOctagon className="h-4 w-4 text-destructive" />}
        >
          <ul className="space-y-3">
            <li className="flex items-center gap-3 rounded-md px-1.5 py-1 transition-colors duration-200 hover:bg-success/10">
              <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold">Inquéritos em prazo crítico</div>
                <div className="text-xs text-muted-foreground">Menos de 3 dias para vencer</div>
              </div>
              <span className="text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30 px-2 py-1 rounded">
                {prazoCritico}
              </span>
            </li>
            <li className="flex items-center gap-3 rounded-md px-1.5 py-1 transition-colors duration-200 hover:bg-success/10">
              <span className="h-2 w-2 rounded-full bg-warning shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold">Casos prioridade ALTA</div>
                <div className="text-xs text-muted-foreground">Demandam ação imediata</div>
              </div>
              <span className="text-[10px] font-bold bg-warning/15 text-warning border border-warning/30 px-2 py-1 rounded">
                {prioridadeAlta}
              </span>
            </li>
            <li className="flex items-center gap-3 rounded-md px-1.5 py-1 transition-colors duration-200 hover:bg-success/10">
              <span className="h-2 w-2 rounded-full bg-info shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold">CVLI sem relatar</div>
                <div className="text-xs text-muted-foreground">IP de homicídios pendentes</div>
              </div>
              <span className="text-[10px] font-bold bg-info/15 text-info border border-info/30 px-2 py-1 rounded">
                {0}
              </span>
            </li>
            <li className="flex items-center gap-3 rounded-md px-1.5 py-1 transition-colors duration-200 hover:bg-success/10">
              <span className="h-2 w-2 rounded-full bg-purple shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold">Crimes Sexuais sem relatar</div>
                <div className="text-xs text-muted-foreground">Aguardando conclusão</div>
              </div>
              <span className="text-[10px] font-bold bg-purple/15 text-purple border border-purple/30 px-2 py-1 rounded">
                {0}
              </span>
            </li>
          </ul>
        </Panel></div>

        <div className={panelFxClass}><Panel title="PENDÊNCIAS POR CATEGORIA" accent="warning" icon={<Bell className="h-4 w-4 text-warning" />}>
          <ul className="space-y-3">
            {[{ label: "Representações", value: totalRepresentacoes }, { label: "Em andamento", value: emAndamento }, { label: "Concluídos", value: finalizados }, { label: "Alertas/Prazos", value: prazoCritico }].map((p) => (
              <li key={p.label} className="flex items-start gap-3 rounded-md px-1.5 py-1 transition-colors duration-200 hover:bg-success/10">
                <span className="h-2 w-2 rounded-full bg-warning mt-1.5 shrink-0" />
                <div className="flex-1 text-sm">{p.label}</div>
                <div className="text-sm font-bold tabular-nums text-warning">{p.value}</div>
              </li>
            ))}
          </ul>
        </Panel></div>

        <div className={panelFxClass}><Panel title="META DE CONCLUSÃO" accent="success">
          <ul className="space-y-3 text-sm">
            <Row label="Procedimentos cadastrados" value={String(total)} color="var(--info)" />
            <Row label="Relatórios enviados" value={String(finalizados)} color="var(--success)" />
            <Row label="Em andamento" value={String(emAndamento)} color="var(--warning)" />
            <Row label="Relatados não enviados" value={String(relatadosNaoEnviados)} color="var(--purple)" />
          </ul>
          <div className="mt-4 p-3 rounded-lg bg-success/5 border border-success/20 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-xs font-semibold">Taxa de conclusão atual</div>
              <div className="text-[11px] text-muted-foreground">
                Meta: 100% — atual {taxaConclusao}%
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
                  strokeDasharray={`${(taxaConclusao / 100) * 94} 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-success">
                {Math.round(taxaConclusao)}%
              </div>
            </div>
          </div>
        </Panel></div>
      </div>

      {/* Donut row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className={panelFxClass}><DonutPanel isClient={isClient} title="POR STATUS DE DILIGÊNCIA" data={POR_STATUS} total={POR_STATUS.reduce((a, b) => a + b.value, 0)} /></div>
        <div className={panelFxClass}><DonutPanel isClient={isClient} title="POR PRIORIDADE" data={POR_PRIORIDADE} total={POR_PRIORIDADE.reduce((a, b) => a + b.value, 0)} /></div>
        <div className={panelFxClass}><Panel
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
                    style={{ width: `${totalProcedimentos === 0 ? 0 : (t.total / totalProcedimentos) * 100}%` }}
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
        </Panel></div>
      </div>

      {/* CVLI Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
        <div className={panelFxClass}><Panel title="CVLI — COMPARATIVO ANUAL" accent="success" className="xl:col-span-2">
          <div className="flex items-center gap-5 text-xs mb-3">
            <Legend color="var(--info)" label="Registros" />
            <Legend color="var(--success)" label="Elucidados" />
            <Legend color="var(--foreground)" label="Taxa de elucidação (%)" line />
          </div>
          <div className="h-[220px] min-h-[220px]">
            {isClient && CVLI_ANUAL.length > 0 ? (
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
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Nenhum dado disponível.</div>
            )}
          </div>
        </Panel></div>

        <div className="bg-card border border-border rounded-xl overflow-hidden transition-all duration-300 hover:border-success/55 hover:shadow-[0_0_0_1px_rgba(34,197,94,0.25),0_14px_28px_-22px_rgba(34,197,94,0.75)]">
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
                <tr key={r.ano} className="border-t border-border transition-colors duration-200 hover:bg-success/10">
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
                <td className="px-4 py-3 text-right tabular-nums text-success">
                  {taxaConclusao.toString().replace(".", ",")}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* CVLI mensal + Bairros */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
        <div className={panelFxClass}><Panel title="CVLI — REGISTROS MENSAIS (2023–2026)" accent="info">
          <div className="h-[220px] min-h-[220px]">
            {isClient && CVLI_MENSAL.length > 0 ? (
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
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Nenhum dado disponível.</div>
            )}
          </div>
        </Panel></div>

        <div className={panelFxClass}><Panel title="ANÁLISE POR LOCALIDADE" accent="warning">
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
                {POR_BAIRRO.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                      Nenhum dado disponível.
                    </td>
                  </tr>
                ) : (
                  POR_BAIRRO.map((b) => (
                    <tr key={b.bairro} className="border-b border-border/50 transition-colors duration-200 hover:bg-success/10">
                      <td className="py-2.5 font-medium">{b.bairro}</td>
                      <td className="py-2.5 text-right tabular-nums">{b.total}</td>
                      <td className="py-2.5 text-right tabular-nums text-destructive">{b.cvli}</td>
                      <td className="py-2.5 text-right tabular-nums text-warning">{b.alta}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel></div>
      </div>

      {/* Gravidade + Equipe */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className={panelFxClass}><Panel title="ANÁLISE POR GRAVIDADE" accent="destructive">
          <div className="h-[220px] min-h-[220px]">
            {isClient && POR_GRAVIDADE.some((item) => item.value > 0) ? (
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
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Nenhum dado disponível.</div>
            )}
          </div>
        </Panel></div>

        <div className={panelFxClass}><Panel
          title="DISTRIBUIÇÃO POR EQUIPE"
          accent="success"
          action={<ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        >
          {EQUIPES.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">Nenhum dado disponível.</div>
          ) : (
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
          )}
        </Panel></div>
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
  isClient,
  title,
  data,
  total,
}: {
  isClient: boolean;
  title: string;
  data: { name: string; value: number; color: string }[];
  total: number;
}) {
  const hasData = data.some((item) => item.value > 0);

  return (
    <Panel
      title={title}
      accent="success"
      action={<Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />}
    >
      <div className="flex items-center gap-4">
        <div className="relative h-36 w-36 shrink-0">
          {isClient && hasData ? (
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
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">Nenhum dado disponível.</div>
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums">{total}</span>
            <span className="text-[10px] text-muted-foreground">Total</span>
          </div>
        </div>
        <ul className="flex-1 space-y-2 text-sm">
          {data.map((d) => {
            const pct = total === 0 ? 0 : Math.round((d.value / total) * 100);
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
