import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Panel } from "@/components/Panel";
import { Gavel, CheckCircle2, XCircle, Clock } from "lucide-react";
import { REPRESENTACOES, REPRESENTACOES_TIPO, REPRESENTACOES_LISTA } from "@/data/sipi";

export const Route = createFileRoute("/representacoes")({
  head: () => ({
    meta: [
      { title: "Representações Judiciais — DT Itabela" },
      { name: "description", content: "Acompanhamento de representações judiciais." },
    ],
  }),
  component: Representacoes,
});

const statusTone: Record<string, string> = {
  "Cumprida (Positiva)": "bg-success/15 text-success border-success/30",
  Deferida: "bg-success/15 text-success border-success/30",
  Indeferida: "bg-destructive/15 text-destructive border-destructive/30",
  "Em análise": "bg-info/15 text-info border-info/30",
  "Aguardando Análise Judicial": "bg-warning/15 text-warning border-warning/30",
};

function Representacoes() {
  return (
    <AppLayout>
      <PageHeader title="Representações Judiciais" subtitle="Medidas requeridas ao Poder Judiciário" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="TOTAL" value={REPRESENTACOES.total} hint="Representações" icon={Gavel} tone="info" />
        <StatCard
          label="DEFERIMENTO"
          value={`${REPRESENTACOES.taxaDeferimento}%`}
          hint={`${REPRESENTACOES.total - REPRESENTACOES.indeferidas} deferidas`}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard label="CUMPRIDAS" value={REPRESENTACOES.cumpridas} hint={`${REPRESENTACOES.taxaCumprimento}% taxa`} icon={CheckCircle2} tone="primary" />
        <StatCard label="INDEFERIDAS" value={REPRESENTACOES.indeferidas} hint="Não acolhidas" icon={XCircle} tone="destructive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <Panel title="POR TIPO DE REPRESENTAÇÃO" accent="success" className="lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="text-[10px] tracking-[0.15em] text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2 font-bold">TIPO</th>
                <th className="text-right py-2 font-bold">TOTAL</th>
                <th className="text-right py-2 font-bold">DEFERIDAS</th>
                <th className="text-right py-2 font-bold">CUMPRIDAS</th>
                <th className="text-right py-2 font-bold">% SUCESSO</th>
              </tr>
            </thead>
            <tbody>
              {REPRESENTACOES_TIPO.map((t) => {
                const pct = t.total ? Math.round((t.deferidas / t.total) * 100) : 0;
                return (
                  <tr key={t.tipo} className="border-b border-border/50">
                    <td className="py-3 font-medium">{t.tipo}</td>
                    <td className="py-3 text-right tabular-nums">{t.total}</td>
                    <td className="py-3 text-right tabular-nums text-success">{t.deferidas}</td>
                    <td className="py-3 text-right tabular-nums text-info">{t.cumpridas}</td>
                    <td className="py-3 text-right tabular-nums font-semibold" style={{ color: pct >= 50 ? "var(--success)" : "var(--warning)" }}>
                      {pct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>

        <Panel title="STATUS GERAL" accent="warning" icon={<Clock className="h-4 w-4 text-warning" />}>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between">
              <span className="text-foreground/90">Total de pedidos</span>
              <span className="tabular-nums font-bold text-info">{REPRESENTACOES.total}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-foreground/90">Cumpridas</span>
              <span className="tabular-nums font-bold text-success">{REPRESENTACOES.cumpridas}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-foreground/90">Pendentes</span>
              <span className="tabular-nums font-bold text-warning">{REPRESENTACOES.pendentes}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-foreground/90">Indeferidas</span>
              <span className="tabular-nums font-bold text-destructive">{REPRESENTACOES.indeferidas}</span>
            </li>
          </ul>
          <div className="mt-4 p-3 rounded-lg bg-success/5 border border-success/20">
            <div className="text-xs font-semibold mb-1">Taxa de Deferimento</div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-success tabular-nums">{REPRESENTACOES.taxaDeferimento}%</span>
              <span className="text-xs text-muted-foreground mb-1">do total</span>
            </div>
          </div>
        </Panel>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <div className="text-[10px] tracking-[0.15em] text-muted-foreground font-bold">
            REPRESENTAÇÕES RECENTES
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead className="bg-muted/40 text-[10px] tracking-[0.15em] text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-bold">PPE</th>
                <th className="text-left px-4 py-3 font-bold">VÍTIMA</th>
                <th className="text-left px-4 py-3 font-bold">INVESTIGADO</th>
                <th className="text-left px-4 py-3 font-bold">TIPO</th>
                <th className="text-left px-4 py-3 font-bold">PROCESSO</th>
                <th className="text-left px-4 py-3 font-bold">DATA</th>
                <th className="text-left px-4 py-3 font-bold">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {REPRESENTACOES_LISTA.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">{r.ppe}</td>
                  <td className="px-4 py-3 text-xs">{r.vitima}</td>
                  <td className="px-4 py-3 text-xs">{r.investigado}</td>
                  <td className="px-4 py-3 text-xs">{r.tipo}</td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{r.processo}</td>
                  <td className="px-4 py-3 text-xs">{r.data}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${statusTone[r.status] ?? "bg-muted/30 text-muted-foreground border-border"}`}>
                      {r.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
