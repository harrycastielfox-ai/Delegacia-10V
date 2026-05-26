import { Outlet, createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, AlertTriangle, ArrowRight, ArrowUpCircle, Bell, Clock3, FileSearch, FileText, Gavel, ListChecks, ShieldAlert } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { listInqueritos } from "@/lib/repositories/inqueritosRepository";
import { listRepresentacoes } from "@/lib/repositories/representacoesRepository";
import { buildModuleAlerts, buildSmartAlerts, moduleMeta, type ModuleKey } from "@/lib/alertasInteligentes";

export const Route = createFileRoute("/alertas")({ component: Alertas, head: () => ({ meta: [{ title: "Alertas — SIPI" }] }) });

const icons: Record<ModuleKey, typeof AlertTriangle> = {
  criticos: AlertTriangle,
  prazos: Clock3,
  operacionais: Bell,
  judiciais: Gavel,
  "dados-incompletos": FileSearch,
  sigilosas: ShieldAlert,
};

const moduleTone: Record<ModuleKey, { icon: string; badge: string; cta: string; hover: string }> = {
  criticos: {
    icon: "border-red-500/30 bg-red-500/10 text-red-300/90",
    badge: "border-red-500/30 bg-red-500/10 text-red-200",
    cta: "text-red-300 group-hover:text-red-200 group-focus-visible:text-red-200",
    hover: "hover:border-red-500/45 hover:bg-red-500/[0.06] hover:shadow-[0_0_0_1px_rgba(239,68,68,0.2)] focus-visible:border-red-500/55 focus-visible:bg-red-500/[0.08] focus-visible:shadow-[0_0_0_1px_rgba(239,68,68,0.25)]",
  },
  prazos: {
    icon: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300/90",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    cta: "text-emerald-300 group-hover:text-emerald-200 group-focus-visible:text-emerald-200",
    hover: "hover:border-emerald-500/45 hover:bg-emerald-500/[0.06] hover:shadow-[0_0_0_1px_rgba(16,185,129,0.2)] focus-visible:border-emerald-500/55 focus-visible:bg-emerald-500/[0.08] focus-visible:shadow-[0_0_0_1px_rgba(16,185,129,0.25)]",
  },
  operacionais: {
    icon: "border-orange-500/30 bg-orange-500/10 text-orange-300/90",
    badge: "border-orange-500/30 bg-orange-500/10 text-orange-200",
    cta: "text-orange-300 group-hover:text-orange-200 group-focus-visible:text-orange-200",
    hover: "hover:border-orange-500/45 hover:bg-orange-500/[0.06] hover:shadow-[0_0_0_1px_rgba(249,115,22,0.2)] focus-visible:border-orange-500/55 focus-visible:bg-orange-500/[0.08] focus-visible:shadow-[0_0_0_1px_rgba(249,115,22,0.25)]",
  },
  judiciais: {
    icon: "border-blue-500/30 bg-blue-500/10 text-blue-300/90",
    badge: "border-blue-500/30 bg-blue-500/10 text-blue-200",
    cta: "text-blue-300 group-hover:text-blue-200 group-focus-visible:text-blue-200",
    hover: "hover:border-blue-500/45 hover:bg-blue-500/[0.06] hover:shadow-[0_0_0_1px_rgba(59,130,246,0.2)] focus-visible:border-blue-500/55 focus-visible:bg-blue-500/[0.08] focus-visible:shadow-[0_0_0_1px_rgba(59,130,246,0.25)]",
  },
  "dados-incompletos": {
    icon: "border-amber-500/30 bg-amber-500/10 text-amber-300/90",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    cta: "text-amber-300 group-hover:text-amber-200 group-focus-visible:text-amber-200",
    hover: "hover:border-amber-500/45 hover:bg-amber-500/[0.06] hover:shadow-[0_0_0_1px_rgba(245,158,11,0.2)] focus-visible:border-amber-500/55 focus-visible:bg-amber-500/[0.08] focus-visible:shadow-[0_0_0_1px_rgba(245,158,11,0.25)]",
  },
  sigilosas: {
    icon: "border-violet-500/30 bg-violet-500/10 text-violet-300/90",
    badge: "border-violet-500/30 bg-violet-500/10 text-violet-200",
    cta: "text-violet-300 group-hover:text-violet-200 group-focus-visible:text-violet-200",
    hover: "hover:border-violet-500/45 hover:bg-violet-500/[0.06] hover:shadow-[0_0_0_1px_rgba(139,92,246,0.2)] focus-visible:border-violet-500/55 focus-visible:bg-violet-500/[0.08] focus-visible:shadow-[0_0_0_1px_rgba(139,92,246,0.25)]",
  },
};

function Alertas() {
  const location = useLocation();
  const isAlertasIndex = location.pathname === "/alertas";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [moduleAlerts, setModuleAlerts] = useState(buildModuleAlerts([]));

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [inq, rep] = await Promise.all([listInqueritos(), listRepresentacoes()]);
        setModuleAlerts(buildModuleAlerts(buildSmartAlerts(inq, rep)));
      } catch {
        setError("Não foi possível carregar os alertas inteligentes.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const alerts = Object.values(moduleAlerts).flat();
    return {
      total: alerts.length,
      criticos: alerts.filter((a) => a.severity === "critico").length,
      altos: alerts.filter((a) => a.severity === "alto").length,
      medios: alerts.filter((a) => a.severity === "medio").length,
      baixos: alerts.filter((a) => a.severity === "baixo").length,
      inqueritos: alerts.filter((a) => a.module === "Inquérito").length,
      representacoes: alerts.filter((a) => a.module === "Representação").length,
    };
  }, [moduleAlerts]);

  if (!isAlertasIndex) return <Outlet />;

  return <AppLayout><div className="space-y-4"><PageHeader title="Central de Alertas" subtitle="Selecione um módulo para visualizar os alertas detalhados." showActions={false} />
    <section className="grid grid-cols-2 gap-2 md:grid-cols-4">{[
      { key: "Total", value: stats.total, icon: Activity, tone: "text-emerald-300/90" },
      { key: "Críticos", value: stats.criticos, icon: ShieldAlert, tone: "text-red-300/90" },
      { key: "Altos", value: stats.altos, icon: ArrowUpCircle, tone: "text-orange-300/90" },
      { key: "Médios", value: stats.medios, icon: AlertCircle, tone: "text-amber-300/90" },
      { key: "Baixos", value: stats.baixos, icon: ListChecks, tone: "text-slate-300/90" },
      { key: "Inquéritos", value: stats.inqueritos, icon: FileText, tone: "text-emerald-300/90" },
      { key: "Representações", value: stats.representacoes, icon: FileText, tone: "text-violet-300/90" },
    ].map(({ key, value, icon: Icon, tone }) => <div key={key} className="rounded-lg border border-border bg-card px-3 py-2"><div className="flex items-start justify-between gap-2"><div><p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{key}</p><p className="text-xl font-semibold">{value}</p></div><span className="mt-0.5"><Icon className={`h-4 w-4 ${tone}`} /></span></div></div>)}</section>
    {loading ? <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">Carregando alertas…</div> : null}
    {!loading && error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
    {!loading && !error ? <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{(Object.keys(moduleMeta) as ModuleKey[]).map((key) => {
      const meta = moduleMeta[key];
      const Icon = icons[key];
      const count = moduleAlerts[key].length;
      const tone = moduleTone[key];
      return <Link key={key} to="/alertas/$modulo" params={{ modulo: key }} className={`group rounded-xl border border-border bg-card p-4 text-left transition-all duration-200 cursor-pointer ${tone.hover}`}><div className="mb-3 flex items-center justify-between"><span className={`rounded-md border p-1 ${tone.icon}`}><Icon className="h-4 w-4" /></span><span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${tone.badge}`}>{meta.badge}</span></div><h3 className="text-sm font-semibold text-foreground">{meta.title}</h3><p className="mt-1 min-h-[36px] text-xs text-muted-foreground">{meta.desc}</p><div className="mt-3 flex items-end justify-between"><div><p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Alertas</p><p className="text-xl font-semibold text-foreground">{count}</p></div><span className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${tone.cta}`}>Abrir módulo <ArrowRight className="h-3.5 w-3.5" /></span></div></Link>;
    })}</section> : null}
  </div></AppLayout>;
}
