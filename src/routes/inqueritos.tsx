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

function isPrazoVencido(prazo: string) {
  if (!prazo || prazo === FALLBACK) return false;
  const parsed = new Date(prazo);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed < new Date();
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

  return <AppLayout><div className="space-y-6">
<header className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.015)] lg:flex-row lg:items-center lg:justify-between lg:p-6"><div className="space-y-1.5"><h1 className="text-3xl font-black tracking-tight">Inquéritos</h1><p className="text-sm text-muted-foreground">{filtered.length} de {rows.length} caso(s) encontrado(s)</p></div><button className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110" onClick={() => navigate({ to: "/novo-caso" })}><Plus className="h-4 w-4" /> Novo Caso</button></header>
<section className="rounded-2xl border border-border/80 bg-card/70 p-4 md:p-5"><div className="flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input placeholder="Buscar por PPE, vítima ou suspeito..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-12 w-full rounded-xl border border-border/90 bg-background/70 pl-10 pr-4 text-sm outline-none transition placeholder:text-muted-foreground/80 focus:border-primary/50" /></div><button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-4 text-sm font-medium transition hover:bg-accent"><Filter className="h-4 w-4" />Filtros</button></div></section>
{error && <p className="text-xs text-destructive">{error}</p>}
<div className="overflow-x-auto rounded-2xl border border-border/80 bg-card/90 shadow-[0_10px_40px_rgba(0,0,0,0.22)]"><table className="w-full min-w-[1100px] table-fixed text-sm"><thead className="bg-muted/25 text-[11px] tracking-[0.14em] text-muted-foreground"><tr><th className="w-[12%] px-4 py-3.5 text-left font-bold">PPE</th><th className="w-[24%] px-4 py-3.5 text-left font-bold">TIPIFICAÇÃO</th><th className="w-[18%] px-4 py-3.5 text-left font-bold">VÍTIMA</th><th className="w-[8%] px-4 py-3.5 text-left font-bold">PRIORIDADE</th><th className="w-[14%] px-4 py-3.5 text-left font-bold">GRAVIDADE</th><th className="w-[10%] px-4 py-3.5 text-left font-bold">SITUAÇÃO</th><th className="w-[8%] px-4 py-3.5 text-left font-bold">EQUIPE</th><th className="w-[8%] px-4 py-3.5 text-left font-bold">PRAZO</th><th className="w-[8%] px-4 py-3.5 text-right font-bold">AÇÃO</th></tr></thead><tbody>
{!loading && filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Nenhum inquérito cadastrado ainda.</td></tr>}
{filtered.map((row) => {
  const situacao = row.situacao !== FALLBACK ? row.situacao : row.statusDiligencias;
  const prazoVencido = isPrazoVencido(row.prazo);
  return <tr key={row.id} className="border-t border-border/70 align-top transition hover:bg-muted/20"><td className="px-4 py-4"><p className="truncate font-semibold text-primary">{row.numeroPpe || FALLBACK}</p></td><td className="px-4 py-4"><p className="line-clamp-2 leading-5 text-foreground/95" title={row.tipificacao}>{row.tipificacao || FALLBACK}</p></td><td className="px-4 py-4"><p className="line-clamp-2 leading-5" title={row.vitima}>{row.vitima || FALLBACK}</p></td><td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide ${priorTone[row.prioridade] ?? ""}`}>{row.prioridade || FALLBACK}</span></td><td className="px-4 py-4"><span className="inline-flex max-w-full truncate rounded-full border border-info/30 bg-info/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-info">{row.gravidade || FALLBACK}</span></td><td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide ${statusTone[situacao] ?? ""}`}>{situacao || FALLBACK}</span></td><td className="px-4 py-4"><p className="line-clamp-2 text-xs text-muted-foreground">{row.equipe || FALLBACK}</p></td><td className="px-4 py-4"><span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${prazoVencido ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-background text-foreground"}`}>{row.prazo || FALLBACK}</span></td><td className="px-4 py-4 text-right"><button className="inline-flex items-center rounded-lg border border-info/40 bg-info/15 px-3.5 py-1.5 text-xs font-semibold text-info transition hover:bg-info/25 hover:text-info/90" onClick={() => navigate({ to: "/inqueritos/$caseId", params: { caseId: row.id } })}>Abrir</button></td></tr>;
})}
</tbody></table></div></div></AppLayout>;
}

function normalizeText(value?: string) { return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
