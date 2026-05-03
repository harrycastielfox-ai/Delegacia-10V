import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Panel } from "@/components/Panel";
import { Gavel, CheckCircle2, XCircle, Clock, Search, Filter } from "lucide-react";
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

type RepresentacaoItem = (typeof REPRESENTACOES_LISTA)[number] & { localRef: string };

const statusTone: Record<string, string> = {
  "Cumprida (Positiva)": "bg-success/15 text-success border-success/30",
  Deferida: "bg-success/15 text-success border-success/30",
  Indeferida: "bg-destructive/15 text-destructive border-destructive/30",
  "Em análise": "bg-info/15 text-info border-info/30",
  "Aguardando Análise Judicial": "bg-warning/15 text-warning border-warning/30",
};

function formatRepresentacaoId(id: string | number) {
  const raw = String(id ?? "").trim();
  if (/^RPT-\d{5}$/i.test(raw)) return raw.toUpperCase();
  const onlyDigits = raw.replace(/\D/g, "");
  if (onlyDigits) return `RPT-${onlyDigits.padStart(5, "0")}`;
  return "RPT-00000";
}

function normalizeText(value?: string) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function Representacoes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [representacoes, setRepresentacoes] = useState<RepresentacaoItem[]>(() =>
    REPRESENTACOES_LISTA.map((r, index) => ({ ...r, localRef: `${String(r.id)}-${index}` })),
  );
  const [selected, setSelected] = useState<RepresentacaoItem | null>(null);
  const [editing, setEditing] = useState<RepresentacaoItem | null>(null);
  const [deleting, setDeleting] = useState<RepresentacaoItem | null>(null);
  const [feedback, setFeedback] = useState("");

  const filteredRepresentacoes = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);
    if (!normalizedSearch) return representacoes;

    return representacoes.filter((r) => {
      const values = [
        formatRepresentacaoId(r.id),
        r.ppe,
        r.vitima,
        r.investigado,
        r.tipo,
        r.processo,
        r.status,
      ].map((value) => normalizeText(String(value ?? "")));
      return values.some((value) => value.includes(normalizedSearch));
    });
  }, [representacoes, searchTerm]);

  function handleSaveEdit() {
    if (!editing) return;
    setRepresentacoes((prev) => prev.map((item) => (item.localRef === editing.localRef ? editing : item)));
    setEditing(null);
    setFeedback("Representação atualizada localmente. Integração com banco será feita futuramente.");
  }

  function handleDelete() {
    if (!deleting) return;
    setRepresentacoes((prev) => prev.filter((item) => item.localRef !== deleting.localRef));
    setDeleting(null);
    setFeedback("Representação removida localmente. Exclusão definitiva dependerá de auditoria e backend.");
  }

  return (
    <AppLayout>
      <PageHeader title="Representações Judiciais" subtitle="Medidas requeridas ao Poder Judiciário" showActions={false} />

      <div className="mb-6 flex justify-end">
        <Link
          to="/nova-representacao"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition shadow-lg shadow-primary/20"
        >
          Cadastrar Representação
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="TOTAL" value={REPRESENTACOES.total} hint="Representações" icon={Gavel} tone="info" />
        <StatCard label="DEFERIMENTO" value={`${REPRESENTACOES.taxaDeferimento}%`} hint={`${REPRESENTACOES.total - REPRESENTACOES.indeferidas} deferidas`} icon={CheckCircle2} tone="success" />
        <StatCard label="CUMPRIDAS" value={REPRESENTACOES.cumpridas} hint={`${REPRESENTACOES.taxaCumprimento}% taxa`} icon={CheckCircle2} tone="primary" />
        <StatCard label="INDEFERIDAS" value={REPRESENTACOES.indeferidas} hint="Não acolhidas" icon={XCircle} tone="destructive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <Panel title="POR TIPO DE REPRESENTAÇÃO" accent="success" className="lg:col-span-2">
          <table className="w-full text-sm"><thead className="text-[10px] tracking-[0.15em] text-muted-foreground"><tr className="border-b border-border"><th className="text-left py-2 font-bold">TIPO</th><th className="text-right py-2 font-bold">TOTAL</th><th className="text-right py-2 font-bold">DEFERIDAS</th><th className="text-right py-2 font-bold">CUMPRIDAS</th><th className="text-right py-2 font-bold">% SUCESSO</th></tr></thead><tbody>{REPRESENTACOES_TIPO.map((t)=>{const pct=t.total?Math.round((t.deferidas/t.total)*100):0;return <tr key={t.tipo} className="border-b border-border/50"><td className="py-3 font-medium">{t.tipo}</td><td className="py-3 text-right tabular-nums">{t.total}</td><td className="py-3 text-right tabular-nums text-success">{t.deferidas}</td><td className="py-3 text-right tabular-nums text-info">{t.cumpridas}</td><td className="py-3 text-right tabular-nums font-semibold" style={{color:pct>=50?"var(--success)":"var(--warning)"}}>{pct}%</td></tr>;})}</tbody></table>
        </Panel>
        <Panel title="STATUS GERAL" accent="warning" icon={<Clock className="h-4 w-4 text-warning" />}>
          <ul className="space-y-3 text-sm"><li className="flex items-center justify-between"><span className="text-foreground/90">Total de pedidos</span><span className="tabular-nums font-bold text-info">{REPRESENTACOES.total}</span></li><li className="flex items-center justify-between"><span className="text-foreground/90">Cumpridas</span><span className="tabular-nums font-bold text-success">{REPRESENTACOES.cumpridas}</span></li><li className="flex items-center justify-between"><span className="text-foreground/90">Pendentes</span><span className="tabular-nums font-bold text-warning">{REPRESENTACOES.pendentes}</span></li><li className="flex items-center justify-between"><span className="text-foreground/90">Indeferidas</span><span className="tabular-nums font-bold text-destructive">{REPRESENTACOES.indeferidas}</span></li></ul>
          <div className="mt-4 p-3 rounded-lg bg-success/5 border border-success/20"><div className="text-xs font-semibold mb-1">Taxa de Deferimento</div><div className="flex items-end gap-2"><span className="text-3xl font-bold text-success tabular-nums">{REPRESENTACOES.taxaDeferimento}%</span><span className="text-xs text-muted-foreground mb-1">do total</span></div></div>
        </Panel>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <div className="text-[10px] tracking-[0.15em] text-muted-foreground font-bold">REPRESENTAÇÕES RECENTES</div>
        </div>

        <div className="p-4 border-b border-border bg-background/50">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Buscar por ID, PPE, vítima, investigado, tipo, processo ou status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <button className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2.5 rounded-lg text-sm hover:bg-accent">
              <Filter className="h-4 w-4" /> Filtros
            </button>
          </div>
        </div>

        {feedback && <div className="px-4 py-3 text-sm text-success bg-success/10 border-b border-success/20">{feedback}</div>}

        <div className="overflow-auto">
          <table className="w-full text-sm min-w-[1200px]">
            <thead className="bg-muted/40 text-[10px] tracking-[0.15em] text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-bold">ID</th><th className="text-left px-4 py-3 font-bold">PPE</th><th className="text-left px-4 py-3 font-bold">VÍTIMA</th><th className="text-left px-4 py-3 font-bold">INVESTIGADO</th><th className="text-left px-4 py-3 font-bold">TIPO</th><th className="text-left px-4 py-3 font-bold">PROCESSO</th><th className="text-left px-4 py-3 font-bold">DATA</th><th className="text-left px-4 py-3 font-bold">STATUS</th><th className="text-right px-4 py-3 font-bold">AÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {filteredRepresentacoes.map((r) => (
                <tr key={r.localRef} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">{formatRepresentacaoId(r.id)}</td><td className="px-4 py-3 font-semibold whitespace-nowrap">{r.ppe}</td><td className="px-4 py-3 text-xs">{r.vitima}</td><td className="px-4 py-3 text-xs">{r.investigado}</td><td className="px-4 py-3 text-xs">{r.tipo}</td><td className="px-4 py-3 text-xs font-mono text-muted-foreground">{r.processo}</td><td className="px-4 py-3 text-xs">{r.data}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-1 rounded border ${statusTone[r.status] ?? "bg-muted/30 text-muted-foreground border-border"}`}>{r.status.toUpperCase()}</span></td>
                  <td className="px-4 py-3 text-right"><div className="inline-flex items-center gap-2"><button onClick={() => setSelected(r)} className="rounded-md border border-info/30 bg-info/10 px-2.5 py-1 text-[11px] font-semibold text-info hover:bg-info/20">Abrir</button><button onClick={() => setEditing({ ...r })} className="rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-semibold hover:bg-accent">Editar</button><button onClick={() => setDeleting(r)} className="rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/20">Excluir</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <Modal title="Detalhes da Representação" onClose={() => setSelected(null)}><Detail label="ID da Representação" value={formatRepresentacaoId(selected.id)} /><Detail label="Nº PPE / procedimento relacionado" value={selected.ppe} /><Detail label="Vítima" value={selected.vitima} /><Detail label="Investigado" value={selected.investigado} /><Detail label="Tipo" value={selected.tipo} /><Detail label="Processo judicial" value={selected.processo} /><Detail label="Data" value={selected.data} /><Detail label="Status" value={selected.status} /><p className="text-xs text-muted-foreground mt-3">O PPE é apenas vínculo com o procedimento relacionado, não o ID único da representação.</p></Modal>}

      {editing && <Modal title="Editar Representação" onClose={() => setEditing(null)}><ReadOnlyField label="ID da Representação" value={formatRepresentacaoId(editing.id)} /><ReadOnlyField label="Nº PPE / Procedimento relacionado" value={editing.ppe} />
      <EditableField label="Vítima" value={editing.vitima} onChange={(value) => setEditing((prev) => (prev ? { ...prev, vitima: value } : prev))} />
      <EditableField label="Investigado" value={editing.investigado} onChange={(value) => setEditing((prev) => (prev ? { ...prev, investigado: value } : prev))} />
      <EditableField label="Tipo" value={editing.tipo} onChange={(value) => setEditing((prev) => (prev ? { ...prev, tipo: value } : prev))} />
      <EditableField label="Processo" value={editing.processo} onChange={(value) => setEditing((prev) => (prev ? { ...prev, processo: value } : prev))} />
      <EditableField label="Data" value={editing.data} onChange={(value) => setEditing((prev) => (prev ? { ...prev, data: value } : prev))} />
      <EditableField label="Status" value={editing.status} onChange={(value) => setEditing((prev) => (prev ? { ...prev, status: value } : prev))} />
      <div className="mt-4 flex justify-end gap-2"><button onClick={() => setEditing(null)} className="px-3 py-2 text-xs rounded-md border border-border hover:bg-accent">Cancelar</button><button onClick={handleSaveEdit} className="px-3 py-2 text-xs rounded-md bg-primary text-primary-foreground">Salvar alterações</button></div></Modal>}

      {deleting && <Modal title="Confirmar exclusão" onClose={() => setDeleting(null)}><p className="text-sm text-foreground/90">Deseja remover esta representação da lista local? No sistema final, esta ação deverá ser registrada em auditoria.</p><div className="mt-4 flex justify-end gap-2"><button onClick={() => setDeleting(null)} className="px-3 py-2 text-xs rounded-md border border-border hover:bg-accent">Cancelar</button><button onClick={handleDelete} className="px-3 py-2 text-xs rounded-md bg-destructive text-destructive-foreground">Confirmar exclusão</button></div></Modal>}
    </AppLayout>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"><div className="w-full max-w-2xl bg-card border border-border rounded-xl p-5"><div className="flex items-center justify-between mb-4"><h3 className="text-base font-bold">{title}</h3><button onClick={onClose} className="text-xs border border-border rounded-md px-2 py-1 hover:bg-accent">Fechar</button></div>{children}</div></div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="py-1"><span className="text-xs text-muted-foreground">{label}: </span><span className="text-sm">{value}</span></div>; }
function ReadOnlyField({ label, value }: { label: string; value: string }) { return <div className="mb-2"><label className="text-xs text-muted-foreground block mb-1">{label}</label><input value={value} readOnly className="w-full bg-muted/30 border border-border rounded-md px-3 py-2 text-sm" /></div>; }
function EditableField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <div className="mb-2"><label className="text-xs text-muted-foreground block mb-1">{label}</label><input value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm" /></div>; }
