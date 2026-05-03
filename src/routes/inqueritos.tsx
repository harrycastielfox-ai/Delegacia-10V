import { Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Search, Filter, Plus } from "lucide-react";
import { PANORAMA } from "@/data/sipi";
import { loadInqueritos, saveInqueritos } from "@/lib/casesLocalState";

export const Route = createFileRoute("/inqueritos")({
  validateSearch: (search: Record<string, unknown>) => ({ status: typeof search.status === "string" ? search.status : undefined, prioridade: typeof search.prioridade === "string" ? search.prioridade : undefined, prazo: typeof search.prazo === "string" ? search.prazo : undefined }),
  component: Inqueritos,
});

const priorTone: Record<string, string> = { ALTA: "bg-destructive/15 text-destructive border-destructive/30", MÉDIA: "bg-warning/15 text-warning border-warning/30", BAIXA: "bg-info/15 text-info border-info/30" };
const statusTone: Record<string, string> = { "Em Andamento": "bg-info/15 text-info border-info/30", Concluída: "bg-success/15 text-success border-success/30", Pendente: "bg-warning/15 text-warning border-warning/30" };

function Inqueritos() {
  const navigate = useNavigate();
  const location = useLocation();
  const search = Route.useSearch();
  const isInqueritosIndex = location.pathname === "/inqueritos";

  const [searchTerm, setSearchTerm] = useState("");
  const [rows, setRows] = useState(loadInqueritos);

  useEffect(() => { saveInqueritos(rows); }, [rows]);

  const filtered = useMemo(() => rows.filter((r) => {
    const nst = normalizeText(searchTerm);
    if (!nst) return true;
    return [r.id, r.ppe, r.tipificacao, r.vitima, r.bairroDistrito, r.prioridade, r.gravidade, r.tipo, r.statusDiligencias].map((v) => normalizeText(String(v))).some((v) => v.includes(nst));
  }), [rows, searchTerm]);

  const activeFilterLabel = getActiveFilterLabel({ status: normalizeText(search.status), prioridade: normalizeText(search.prioridade), prazo: normalizeText(search.prazo) });

  if (!isInqueritosIndex) return <Outlet />;

  return <AppLayout><div className="space-y-6">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Inquéritos</h1>
        <p className="text-sm text-muted-foreground mt-1">{filtered.length} de {rows.length} caso(s) encontrado(s)</p>
      </div>
      <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110" onClick={() => navigate({ to: "/novo-caso" })}>
        <Plus className="h-4 w-4" /> Novo Caso
      </button>
    </header>

    <div className="flex flex-col md:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input placeholder="Buscar por PPE, vítima ou suspeito..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-sm" />
      </div>
      <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-accent"><Filter className="h-4 w-4" />Filtros</button>
    </div>

    {activeFilterLabel && <button className="text-xs border border-border bg-card px-3 py-1.5 rounded-md hover:bg-accent" onClick={() => navigate({ to: "/inqueritos" })}>Limpar filtro ({activeFilterLabel})</button>}

    <div className="overflow-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[1080px] text-sm">
        <thead className="text-[11px] tracking-[0.16em] text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-bold">PPE</th>
            <th className="px-4 py-3 text-left font-bold">TIPIFICAÇÃO</th>
            <th className="px-4 py-3 text-left font-bold">VÍTIMA</th>
            <th className="px-4 py-3 text-left font-bold">PRIORIDADE</th>
            <th className="px-4 py-3 text-left font-bold">GRAVIDADE</th>
            <th className="px-4 py-3 text-left font-bold">SITUAÇÃO</th>
            <th className="px-4 py-3 text-left font-bold">EQUIPE</th>
            <th className="px-4 py-3 text-left font-bold">PRAZO</th>
            <th className="px-4 py-3 text-right font-bold">AÇÃO</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => <tr key={r.id} className="border-t border-border/70 hover:bg-muted/20">
            <td className="px-4 py-2.5 font-semibold text-primary">{r.ppe}</td>
            <td className="px-4 py-2.5">{r.tipificacao}</td>
            <td className="px-4 py-2.5">{r.vitima || "—"}</td>
            <td className="px-4 py-2.5"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${priorTone[r.prioridade]}`}>{r.prioridade}</span></td>
            <td className="px-4 py-2.5">{r.gravidade}</td>
            <td className="px-4 py-2.5"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusTone[r.statusDiligencias] ?? ""}`}>{r.statusDiligencias}</span></td>
            <td className="px-4 py-2.5">{r.equipeResponsavel || "—"}</td>
            <td className="px-4 py-2.5">{formatPrazoFinal(r.prazo ?? r.dataLimite)}</td>
            <td className="px-4 py-2.5 text-right"><button className="rounded-lg border border-info/30 bg-info/10 px-3 py-1 text-[11px] font-semibold" onClick={() => navigate({ to: "/inqueritos/$caseId", params: { caseId: r.id } })}>Abrir</button></td>
          </tr>)}
        </tbody>
      </table>
    </div>

    <p className="text-xs text-muted-foreground">Resumo geral: {PANORAMA.totalCadastrados} procedimentos cadastrados e {PANORAMA.relatorioEnviado} concluídos.</p>
  </div></AppLayout>;
}

function formatPrazoFinal(value?: string | null) {
  const parsedDate = parseDateOnly(value);
  if (!parsedDate) return "—";
  return parsedDate.toISOString().slice(0, 10);
}

function parseDateOnly(value?: string | null) {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function normalizeText(value?: string) { return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
function getActiveFilterLabel({ status, prioridade, prazo }: { status?: string; prioridade?: string; prazo?: string }) { if (status === "andamento") return "Status — Em andamento"; if (status === "concluido") return "Status — Concluído"; if (prioridade === "alta") return "Prioridade — Alta"; if (prazo === "critico") return "Prazo — Crítico"; return ""; }
