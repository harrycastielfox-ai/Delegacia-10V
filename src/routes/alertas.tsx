import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Bell, Clock3, FileSearch, Gavel, ShieldAlert } from "lucide-react";
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

function Alertas() {
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

  return <AppLayout><div className="space-y-4"><PageHeader title="Central de Alertas" subtitle="Selecione um módulo para visualizar os alertas detalhados." showActions={false} />
    <section className="grid grid-cols-2 gap-2 md:grid-cols-4">{[["Total", stats.total], ["Críticos", stats.criticos], ["Altos", stats.altos], ["Médios", stats.medios], ["Baixos", stats.baixos], ["Inquéritos", stats.inqueritos], ["Representações", stats.representacoes]].map(([k, v]) => <div key={String(k)} className="rounded-lg border border-border bg-card px-3 py-2"><p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{k}</p><p className="text-xl font-semibold">{v}</p></div>)}</section>
    {loading ? <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">Carregando alertas…</div> : null}
    {!loading && error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
    {!loading && !error ? <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{(Object.keys(moduleMeta) as ModuleKey[]).map((key) => {
      const meta = moduleMeta[key];
      const Icon = icons[key];
      const count = moduleAlerts[key].length;
      return <div key={key} className="rounded-xl border border-border bg-card p-4 text-left transition hover:border-emerald-500/40 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.25)]"><div className="mb-3 flex items-center justify-between"><span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-1"><Icon className="h-4 w-4 text-emerald-300/90" /></span><span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{meta.badge}</span></div><h3 className="text-sm font-semibold text-foreground">{meta.title}</h3><p className="mt-1 min-h-[36px] text-xs text-muted-foreground">{meta.desc}</p><div className="mt-3 flex items-end justify-between"><div><p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Alertas</p><p className="text-xl font-semibold text-foreground">{count}</p></div><Link to="/alertas/$modulo" params={{ modulo: key }} className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-300 hover:text-emerald-200">Abrir módulo <ArrowRight className="h-3.5 w-3.5" /></Link></div></div>;
    })}</section> : null}
  </div></AppLayout>;
}
