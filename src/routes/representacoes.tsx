import { Outlet, createFileRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Search, Filter } from "lucide-react";
import { listRepresentacoes, type RepresentacaoRecord } from "@/lib/repositories/representacoesRepository";

export const Route = createFileRoute("/representacoes")({ component: Representacoes });
const normalizeText = (v?: string)=> (v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();

function Representacoes() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRepresentacoesIndex = location.pathname === "/representacoes";
  const [searchTerm, setSearchTerm] = useState("");
  const [representacoes, setRepresentacoes] = useState<RepresentacaoRecord[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!isRepresentacoesIndex) return;

    (async () => {
      try {
        setError("");
        setRepresentacoes(await listRepresentacoes());
      } catch {
        setError("Não foi possível carregar representações agora.");
      }
    })();
  }, [isRepresentacoesIndex]);
  const filtered = useMemo(() => { const s = normalizeText(searchTerm); if (!s) return representacoes; return representacoes.filter((r) => [r.id, r.numero_ppe, r.vitima, r.investigado, r.tipo, r.processo_judicial, r.status].map((value) => normalizeText(String(value ?? ""))).some((value) => value.includes(s))); }, [representacoes, searchTerm]);

  if (!isRepresentacoesIndex) return <Outlet />;

  return <AppLayout><PageHeader title="Representações Judiciais" subtitle="Medidas requeridas ao Poder Judiciário" showActions={false} />
    <div className="mb-6 flex justify-end"><Link to="/nova-representacao" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold">Cadastrar Representação</Link></div>
    {error && <p className="mb-3 text-xs text-destructive">{error}</p>}
    <div className="bg-card border border-border rounded-xl overflow-hidden"><div className="p-4 border-b border-border bg-background/50"><div className="flex flex-col md:flex-row gap-3"><div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><input placeholder="Buscar por ID, PPE, vítima, investigado, tipo, processo ou status..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm" /></div><button className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2.5 rounded-lg text-sm hover:bg-accent"><Filter className="h-4 w-4" /> Filtros</button></div></div>
    <div className="overflow-auto"><table className="w-full text-sm min-w-[1200px]"><thead className="bg-muted/40 text-[10px] tracking-[0.15em] text-muted-foreground"><tr><th className="text-left px-4 py-3 font-bold">ID</th><th className="text-left px-4 py-3 font-bold">PPE</th><th className="text-left px-4 py-3 font-bold">VÍTIMA</th><th className="text-left px-4 py-3 font-bold">INVESTIGADO</th><th className="text-left px-4 py-3 font-bold">TIPO</th><th className="text-left px-4 py-3 font-bold">PROCESSO</th><th className="text-left px-4 py-3 font-bold">DATA</th><th className="text-left px-4 py-3 font-bold">STATUS</th><th className="text-right px-4 py-3 font-bold">AÇÃO</th></tr></thead><tbody>{filtered.map((r) => <tr key={r.id} className="border-t border-border hover:bg-muted/20"><td className="px-4 py-3 font-semibold">{r.id}</td><td className="px-4 py-3 font-semibold">{r.numero_ppe || "—"}</td><td className="px-4 py-3 text-xs">{r.vitima || "—"}</td><td className="px-4 py-3 text-xs">{r.investigado || "—"}</td><td className="px-4 py-3 text-xs">{r.tipo || "—"}</td><td className="px-4 py-3 text-xs">{r.processo_judicial || "—"}</td><td className="px-4 py-3 text-xs">{r.data_representacao || "—"}</td><td className="px-4 py-3 text-xs">{r.status || "—"}</td><td className="px-4 py-3 text-right"><button onClick={() => navigate({ to: "/representacoes/$representacaoId", params: { representacaoId: r.id } })} className="rounded-md border border-info/30 bg-info/10 px-2.5 py-1 text-[11px] font-semibold text-info">Abrir</button></td></tr>)}
      {filtered.length===0 && <tr><td colSpan={9} className="p-4 text-sm text-center text-muted-foreground">Nenhuma representação cadastrada ainda.</td></tr>}</tbody></table></div></div>
  </AppLayout>;
}
