import { Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Search, Filter, Plus } from "lucide-react";
import { listInqueritos, type InqueritoRecord } from "@/lib/repositories/inqueritosRepository";

export const Route = createFileRoute("/inqueritos")({ component: Inqueritos });
const priorTone: Record<string, string> = { ALTA: "bg-destructive/15 text-destructive border-destructive/30", "MÉDIA": "bg-warning/15 text-warning border-warning/30", BAIXA: "bg-info/15 text-info border-info/30" };
const statusTone: Record<string, string> = { "Em Andamento": "bg-info/15 text-info border-info/30", "Concluída": "bg-success/15 text-success border-success/30", Pendente: "bg-warning/15 text-warning border-warning/30" };

const FALLBACK = "—";

type InqueritoListRow = {
  id: string;
  numeroPpe: string;
  tipificacao: string;
  vitima: string;
  prioridade: string;
  gravidade: string;
  situacao: string;
  statusDiligencias: string;
  equipe: string;
  prazo: string;
  investigado: string;
};

function pick(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value);
    }
  }
  return FALLBACK;
}

function normalizeInqueritoForList(caso: InqueritoRecord): InqueritoListRow {
  const raw = caso as unknown as Record<string, unknown>;
  return {
    id: caso.id,
    numeroPpe: pick(raw, "numero_ppe", "numeroPpe", "ppe"),
    tipificacao: pick(raw, "tipificacao", "classificacao", "tipo_penal"),
    vitima: pick(raw, "vitima", "vítima"),
    prioridade: pick(raw, "prioridade"),
    gravidade: pick(raw, "gravidade"),
    situacao: pick(raw, "situacao", "situação", "status"),
    statusDiligencias: pick(raw, "status_diligencias", "statusDiligencias"),
    equipe: pick(raw, "equipe"),
    prazo: pick(raw, "prazo", "data_prazo"),
    investigado: pick(raw, "investigado", "suspeito", "autor_investigado", "autorInvestigado"),
  };
}

function Inqueritos() {
  const navigate = useNavigate();
  const location = useLocation();
  const isInqueritosIndex = location.pathname === "/inqueritos";
  const [searchTerm, setSearchTerm] = useState("");
  const [rows, setRows] = useState<InqueritoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { (async () => { try { setLoading(true); setRows(await listInqueritos()); setError(""); } catch { setError("Não foi possível carregar inquéritos agora."); } finally { setLoading(false); } })(); }, []);

  const normalizedRows = useMemo(() => rows.map((r) => normalizeInqueritoForList(r)), [rows]);
  const filtered = useMemo(() => normalizedRows.filter((r) => {
    const nst = normalizeText(searchTerm);
    if (!nst) return true;
    return [r.id, r.numeroPpe, r.tipificacao, r.vitima, r.investigado, r.prioridade, r.gravidade, r.situacao, r.statusDiligencias, r.equipe, r.prazo]
      .map((v) => normalizeText(v))
      .some((v) => v.includes(nst));
  }), [normalizedRows, searchTerm]);

  if (!isInqueritosIndex) return <Outlet />;

  return <AppLayout><div className="space-y-6"><header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><h1 className="text-3xl font-black tracking-tight">Inquéritos</h1><p className="text-sm text-muted-foreground mt-1">{filtered.length} de {rows.length} caso(s) encontrado(s)</p></div><button className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110" onClick={() => navigate({ to: "/novo-caso" })}><Plus className="h-4 w-4" /> Novo Caso</button></header>
<div className="flex flex-col md:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><input placeholder="Buscar por PPE, vítima ou suspeito..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-sm" /></div><button className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-accent"><Filter className="h-4 w-4" />Filtros</button></div>
{error && <p className="text-xs text-destructive">{error}</p>}
<div className="overflow-auto rounded-xl border border-border bg-card"><table className="w-full min-w-[1080px] text-sm"><thead className="text-[11px] tracking-[0.16em] text-muted-foreground"><tr><th className="px-4 py-3 text-left font-bold">PPE</th><th className="px-4 py-3 text-left font-bold">TIPIFICAÇÃO</th><th className="px-4 py-3 text-left font-bold">VÍTIMA</th><th className="px-4 py-3 text-left font-bold">PRIORIDADE</th><th className="px-4 py-3 text-left font-bold">GRAVIDADE</th><th className="px-4 py-3 text-left font-bold">SITUAÇÃO</th><th className="px-4 py-3 text-left font-bold">EQUIPE</th><th className="px-4 py-3 text-left font-bold">PRAZO</th><th className="px-4 py-3 text-right font-bold">AÇÃO</th></tr></thead><tbody>
{!loading && filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Nenhum inquérito cadastrado ainda.</td></tr>}
{filtered.map((row) => {
  const situacao = row.situacao !== FALLBACK ? row.situacao : row.statusDiligencias;
  return <tr key={row.id} className="border-t border-border/70 hover:bg-muted/20"><td className="px-4 py-2.5 font-semibold text-primary">{row.numeroPpe || FALLBACK}</td><td className="px-4 py-2.5">{row.tipificacao || FALLBACK}</td><td className="px-4 py-2.5">{row.vitima || FALLBACK}</td><td className="px-4 py-2.5"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${priorTone[row.prioridade] ?? ""}`}>{row.prioridade || FALLBACK}</span></td><td className="px-4 py-2.5">{row.gravidade || FALLBACK}</td><td className="px-4 py-2.5"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusTone[situacao] ?? ""}`}>{situacao || FALLBACK}</span></td><td className="px-4 py-2.5">{row.equipe || FALLBACK}</td><td className="px-4 py-2.5">{row.prazo || FALLBACK}</td><td className="px-4 py-2.5 text-right"><button className="rounded-lg border border-info/30 bg-info/10 px-3 py-1 text-[11px] font-semibold" onClick={() => navigate({ to: "/inqueritos/$caseId", params: { caseId: row.id } })}>Abrir</button></td></tr>;
})}
</tbody></table></div></div></AppLayout>;
}

function normalizeText(value?: string) { return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
