import { Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Search, Filter, Plus } from "lucide-react";
import { listInqueritos, type InqueritoRecord } from "@/lib/repositories/inqueritosRepository";
import { getCurrentProfile } from "@/lib/auth";
import { canCreateCases, canOnlyViewPublicCases, type UserProfile } from "@/lib/authz";

export const Route = createFileRoute("/inqueritos")({ component: Inqueritos });
const priorTone: Record<string, string> = { ALTA: "bg-destructive/15 text-destructive border-destructive/30", "MÉDIA": "bg-warning/15 text-warning border-warning/30", BAIXA: "bg-info/15 text-info border-info/30" };
const statusTone: Record<string, string> = { "Em Andamento": "bg-info/15 text-info border-info/30", "Concluída": "bg-success/15 text-success border-success/30", Pendente: "bg-warning/15 text-warning border-warning/30" };
const FALLBACK = "—";
const EMPTY_FILTER = "__vazio__";

type InqueritoListRow = { id: string; numeroPpe: string; tipificacao: string; vitima: string; prioridade: string; gravidade: string; tipoProcedimento: string; bairro: string; situacao: string; statusDiligencias: string; equipe: string; prazo: string; investigado: string; reuPreso: string; custodia: string; medidaProtetiva: string; diligenciasPendentes: string; protetivaTexto: string; fullText: string; };

function pick(record: Record<string, unknown>, ...keys: string[]) { for (const key of keys) { const value = record[key]; if (value !== null && value !== undefined && String(value).trim() !== "") return String(value); } return FALLBACK; }
function normalizeText(value?: string) { return (value ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim(); }
function parseDateToUtc(value: string, endDay: boolean) { if (!value) return null; const [y,m,d]=value.split('-').map(Number); if(!y||!m||!d) return null; return Date.UTC(y,m-1,d,endDay?23:0,endDay?59:0,endDay?59:0,endDay?999:0); }
function parseAnyDate(value?: string) { if (!value || value === FALLBACK) return null; const raw=value.trim(); const br=/^(\d{2})\/(\d{2})\/(\d{4})$/u.exec(raw); if(br) return Date.UTC(Number(br[3]),Number(br[2])-1,Number(br[1]),12,0,0,0); const iso=/^(\d{4})-(\d{2})-(\d{2})/u.exec(raw); if(iso) return Date.UTC(Number(iso[1]),Number(iso[2])-1,Number(iso[3]),12,0,0,0); const d=new Date(raw); if(Number.isNaN(d.getTime())) return null; return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),12,0,0,0); }
function isPrazoVencido(prazo: string) { const ts=parseAnyDate(prazo); return ts!==null && ts < Date.now(); }
function isPrazoCritico(prazo: string) { const ts=parseAnyDate(prazo); if (ts===null) return false; const diffDays=Math.ceil((ts-Date.now())/(1000*60*60*24)); return diffDays >=0 && diffDays<=3; }
function isPrazoVencendo(prazo: string) { const ts=parseAnyDate(prazo); if (ts===null) return false; const diffDays=Math.ceil((ts-Date.now())/(1000*60*60*24)); return diffDays >=0 && diffDays<=7; }
function isEmpty(value: string) { return !value || value===FALLBACK; }
function isConcluidoAlias(value: string) { const n = normalizeText(value).replace(/-/g, " "); return ["concluido", "concluidos", "concluida", "concluidas", "finalizado", "finalizada", "encerrado", "relatado"].includes(n); }
function isAndamentoAlias(value: string) { const n = normalizeText(value).replace(/-/g, " "); return ["em andamento", "andamento", "aberto", "aguardando", "pendente"].includes(n); }
function matchesSituacaoAlias(situacao: string, filter: string) {
  const s = normalizeText(situacao);
  if (isConcluidoAlias(filter)) return s.includes("conclu") || s.includes("finaliz") || s.includes("encerr") || s.includes("relat");
  if (isAndamentoAlias(filter)) return s.includes("andamento") || s.includes("abert") || s.includes("aguard") || s.includes("pend");
  return s === normalizeText(filter);
}
function isTruthyLike(value: unknown) { return ["true","t","1","sim","s","yes","y"].includes(normalizeText(String(value ?? ""))); }
function hasReuPreso(row: InqueritoListRow) { const preso = normalizeText(row.reuPreso); const custodia = normalizeText(row.custodia); return isTruthyLike(preso) || ["preso", "reu preso", "réu preso", "custodiado"].includes(preso) || custodia.includes("pres"); }
function hasMedidaProtetiva(row: InqueritoListRow) { const direct = normalizeText(row.medidaProtetiva); if (isTruthyLike(direct) || ["ativa", "ativo"].includes(direct)) return true; return row.protetivaTexto.includes("protetiv"); }
function hasDiligenciasPendentes(value: string) { const t = normalizeText(value); return Boolean(t) && !["nao","não","nenhuma","sem","n/a","na","false","0"].includes(t); }
function priorityToneClass(value: string) { const normalized = normalizeText(value); if (["alta", "urgente"].includes(normalized)) return priorTone.ALTA; if (["media", "média"].includes(normalized)) return priorTone["MÉDIA"]; if (normalized === "baixa") return priorTone.BAIXA; return "border-border/70 bg-muted/20 text-muted-foreground"; }
function statusToneClass(value: string) { if (statusTone[value]) return statusTone[value]; if (isConcluidoAlias(value)) return statusTone["Concluída"]; if (isAndamentoAlias(value)) return statusTone["Em Andamento"]; return "border-warning/30 bg-warning/10 text-warning"; }
function formatPrazoDias(prazo: string) { const ts = parseAnyDate(prazo); if (ts === null) { const dias = /^\s*(vencido\s*)?(-?\d+)\s*d\s*$/iu.exec(prazo); if (!dias) return FALLBACK; const quantidade = Math.abs(Number(dias[2])); return dias[1] || Number(dias[2]) < 0 ? `Vencido ${quantidade}d` : `${quantidade}d`; } const diffDays = Math.ceil((ts - Date.now()) / (1000 * 60 * 60 * 24)); return diffDays < 0 ? `Vencido ${Math.abs(diffDays)}d` : `${diffDays}d`; }

function normalizeInqueritoForList(caso: InqueritoRecord): InqueritoListRow {
  const raw = caso as unknown as Record<string, unknown>;
  const fields = Object.values(raw).map((v) => normalizeText(v == null ? "" : String(v)));
  return { id: caso.id, numeroPpe: pick(raw, "numero_ppe", "numeroPpe", "ppe"), tipificacao: pick(raw, "tipificacao", "classificacao", "tipo_penal"), vitima: pick(raw, "vitima", "vítima"), prioridade: pick(raw, "prioridade"), gravidade: pick(raw, "gravidade"), tipoProcedimento: pick(raw, "tipo_procedimento", "tipoProcedimento", "tipo", "procedimento"), bairro: pick(raw, "bairro", "localidade", "local", "comunidade"), situacao: pick(raw, "situacao", "situação", "status"), statusDiligencias: pick(raw, "status_diligencias", "statusDiligencias"), equipe: pick(raw, "equipe"), prazo: pick(raw, "prazo", "data_prazo"), investigado: pick(raw, "investigado", "suspeito", "autor_investigado", "autorInvestigado"), reuPreso: pick(raw, "reu_preso", "reuPreso"), custodia: pick(raw, "custodia", "situacao_custodia"), medidaProtetiva: pick(raw, "medida_protetiva", "medidaProtetiva", "medidas_protetivas", "medidasProtetivas", "protetiva"), diligenciasPendentes: pick(raw, "diligencias_pendentes", "diligenciasPendentes"), protetivaTexto: [pick(raw, "tipo", "tipificacao", "classificacao", "tipo_penal"), pick(raw, "medida_protetiva", "medidaProtetiva", "medidas_protetivas", "medidasProtetivas", "protetiva")].map(normalizeText).join(" "), fullText: fields.join(" ") };
}

function Inqueritos() {
  const navigate = useNavigate(); const location = useLocation(); const isInqueritosIndex = location.pathname === "/inqueritos";
  const [searchTerm, setSearchTerm] = useState(""); const [rows, setRows] = useState<InqueritoRecord[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [situacaoFilter, setSituacaoFilter] = useState("todos"); const [prioridadeFilter, setPrioridadeFilter] = useState("todos"); const [gravidadeFilter, setGravidadeFilter] = useState("todos"); const [equipeFilter, setEquipeFilter] = useState("todos"); const [tipoFilter, setTipoFilter] = useState("todos"); const [prazoFilter, setPrazoFilter] = useState("todos"); const [dataInicial, setDataInicial] = useState(""); const [dataFinal, setDataFinal] = useState(""); const [reuPresoFilter, setReuPresoFilter] = useState(false); const [medidaProtetivaFilter, setMedidaProtetivaFilter] = useState(false); const [diligenciasPendentesFilter, setDiligenciasPendentesFilter] = useState(false);

  useEffect(() => { if (!isInqueritosIndex) return; (async () => { try { setLoading(true); const currentProfile = await getCurrentProfile(); setProfile(currentProfile); setRows(await listInqueritos()); setError(""); } catch { setError("Não foi possível carregar inquéritos agora."); } finally { setLoading(false); } })(); }, [isInqueritosIndex]);
  useEffect(() => {
    if (!isInqueritosIndex) return;
    const params = new URLSearchParams(location.search);
    const assign=(key:string,setter:(v:string)=>void,allowed?:Set<string>)=>{ const v=params.get(key); if(!v) return; const n=normalizeText(v); if(!n) return; if(allowed && !allowed.has(n)) return; setter(v); };
    assign("prioridade", setPrioridadeFilter); assign("situacao", setSituacaoFilter); assign("status", setSituacaoFilter); assign("gravidade", setGravidadeFilter); assign("equipe", setEquipeFilter); assign("tipo", setTipoFilter);
    const prazo = normalizeText(params.get("prazo") ?? ""); if (["critico","vencido","vencendo","7dias","sem-prazo","todos"].includes(prazo)) setPrazoFilter((prazo === "sem-prazo" ? EMPTY_FILTER : prazo === "7dias" ? "vencendo" : prazo));
    const busca = params.get("busca"); if (busca) setSearchTerm(busca);
    setReuPresoFilter(isTruthyLike(params.get("reuPreso") ?? "") || isTruthyLike(params.get("custodia") ?? ""));
    setMedidaProtetivaFilter(isTruthyLike(params.get("medidaProtetiva") ?? ""));
    setDiligenciasPendentesFilter(isTruthyLike(params.get("diligenciasPendentes") ?? ""));
    const di = params.get("dataInicial"); const df = params.get("dataFinal"); if (di && /^\d{4}-\d{2}-\d{2}$/u.test(di)) setDataInicial(di); if (df && /^\d{4}-\d{2}-\d{2}$/u.test(df)) setDataFinal(df);
  }, [isInqueritosIndex, location.search]);

  const visibleRows = useMemo(() => !canOnlyViewPublicCases(profile) ? rows : rows.filter((item) => { const raw = item as unknown as Record<string, unknown>; const visibility = String(raw.visibilidade ?? raw.visibility ?? raw.publico_privado ?? "publico").toLowerCase(); return !(visibility.includes("priv") || visibility.includes("sig")); }), [profile, rows]);
  const normalizedRows = useMemo(() => visibleRows.map((r) => normalizeInqueritoForList(r)), [visibleRows]);
  const options = (items:string[])=>Array.from(new Set(items.filter((v)=>!isEmpty(v)))).sort((a,b)=>a.localeCompare(b,"pt-BR"));
  const situacaoOptions=useMemo(()=>options(normalizedRows.map((r)=>r.situacao!==FALLBACK?r.situacao:r.statusDiligencias)),[normalizedRows]);
  const prioridadeOptions=useMemo(()=>options(normalizedRows.map((r)=>r.prioridade)),[normalizedRows]);
  const gravidadeOptions=useMemo(()=>options(normalizedRows.map((r)=>r.gravidade)),[normalizedRows]);
  const equipeOptions=useMemo(()=>options(normalizedRows.map((r)=>r.equipe)),[normalizedRows]);
  const tipoOptions=useMemo(()=>options(normalizedRows.map((r)=>r.tipificacao)),[normalizedRows]);

  const filtered = useMemo(() => normalizedRows.filter((r) => {
    const query = normalizeText(searchTerm);
    const isFallbackSearch = ["nao informado", "nao informados", "vazio", "sem informacao", "sem valor"].includes(query);
    if (query && !(r.fullText.includes(query) || (isFallbackSearch && [r.numeroPpe,r.tipificacao,r.vitima,r.investigado,r.prioridade,r.gravidade,r.situacao,r.statusDiligencias,r.equipe,r.prazo].some(isEmpty)))) return false;
    const situacao = isConcluidoAlias(situacaoFilter) ? [r.situacao, r.statusDiligencias].find((v) => !isEmpty(v) && matchesSituacaoAlias(v, situacaoFilter)) ?? (r.situacao !== FALLBACK ? r.situacao : r.statusDiligencias) : (r.situacao !== FALLBACK ? r.situacao : r.statusDiligencias);
    if (normalizeText(situacaoFilter) !== "todos" && !(situacaoFilter===EMPTY_FILTER ? isEmpty(situacao) : matchesSituacaoAlias(situacao, situacaoFilter))) return false;
    if (normalizeText(prioridadeFilter) !== "todos" && !(prioridadeFilter===EMPTY_FILTER ? isEmpty(r.prioridade) : normalizeText(r.prioridade)===normalizeText(prioridadeFilter))) return false;
    if (normalizeText(gravidadeFilter) !== "todos" && !(gravidadeFilter===EMPTY_FILTER ? isEmpty(r.gravidade) : normalizeText(r.gravidade)===normalizeText(gravidadeFilter))) return false;
    if (normalizeText(equipeFilter) !== "todos" && !(equipeFilter===EMPTY_FILTER ? isEmpty(r.equipe) : normalizeText(r.equipe)===normalizeText(equipeFilter))) return false;
    if (normalizeText(tipoFilter) !== "todos" && !(tipoFilter===EMPTY_FILTER ? isEmpty(r.tipificacao) : normalizeText(r.tipificacao)===normalizeText(tipoFilter))) return false;
    if (normalizeText(prazoFilter) !== "todos") { if (prazoFilter === EMPTY_FILTER && !isEmpty(r.prazo)) return false; if (prazoFilter === "vencido" && !isPrazoVencido(r.prazo)) return false; if (prazoFilter === "critico" && !isPrazoCritico(r.prazo)) return false; if (prazoFilter === "vencendo" && !isPrazoVencendo(r.prazo)) return false; }
    if (reuPresoFilter && !hasReuPreso(r)) return false;
    if (medidaProtetivaFilter && !hasMedidaProtetiva(r)) return false;
    if (diligenciasPendentesFilter && !hasDiligenciasPendentes(r.diligenciasPendentes)) return false;
    const hasDateFilter = Boolean(dataInicial || dataFinal); if (hasDateFilter) { const ts=parseAnyDate(r.prazo); if(ts===null) return false; const start=parseDateToUtc(dataInicial,false); const end=parseDateToUtc(dataFinal,true); if(start!==null && ts<start) return false; if(end!==null && ts>end) return false; }
    return true;
  }), [normalizedRows, searchTerm, situacaoFilter, prioridadeFilter, gravidadeFilter, equipeFilter, tipoFilter, prazoFilter, dataInicial, dataFinal, reuPresoFilter, medidaProtetivaFilter, diligenciasPendentesFilter]);

  const hasActiveFilters = Boolean(searchTerm.trim() || [situacaoFilter, prioridadeFilter, gravidadeFilter, equipeFilter, tipoFilter, prazoFilter].some((f) => normalizeText(f) !== "todos") || dataInicial || dataFinal || reuPresoFilter || medidaProtetivaFilter || diligenciasPendentesFilter);
  if (!isInqueritosIndex) return <Outlet />;

  return <AppLayout><div className="space-y-6">
<header className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.015)] lg:flex-row lg:items-center lg:justify-between lg:p-6"><div className="space-y-1.5"><h1 className="text-3xl font-black tracking-tight">Inquéritos</h1><p className="text-sm text-muted-foreground">{filtered.length} de {visibleRows.length} caso(s) encontrado(s)</p></div>{canCreateCases(profile) ? <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110" onClick={() => navigate({ to: "/novo-caso" })}><Plus className="h-4 w-4" /> Novo Caso</button> : null}</header>
<section className="rounded-2xl border border-border/80 bg-card/70 p-4 md:p-5"><div className="flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input placeholder="Buscar por PPE, vítima, suspeito, observações, diligências, relatório..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-12 w-full rounded-xl border border-border/90 bg-background/70 pl-10 pr-4 text-sm outline-none transition placeholder:text-muted-foreground/80 focus:border-primary/50" /></div><button onClick={() => setShowFilters((p)=>!p)} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-4 text-sm font-medium transition hover:bg-accent"><Filter className="h-4 w-4" />{showFilters ? "Ocultar filtros" : "Filtros"}</button></div>
{showFilters && <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4"><select value={situacaoFilter} onChange={(e)=>setSituacaoFilter(e.target.value)} className="h-11 rounded-xl border border-border/90 bg-background/70 px-3 text-sm"><option value="todos">Situação: todas</option><option value={EMPTY_FILTER}>Situação: não informada</option>{situacaoOptions.map((v)=><option key={v} value={v}>{v}</option>)}</select><select value={prioridadeFilter} onChange={(e)=>setPrioridadeFilter(e.target.value)} className="h-11 rounded-xl border border-border/90 bg-background/70 px-3 text-sm"><option value="todos">Prioridade: todas</option><option value={EMPTY_FILTER}>Prioridade: não informada</option>{prioridadeOptions.map((v)=><option key={v} value={v}>{v}</option>)}</select><select value={gravidadeFilter} onChange={(e)=>setGravidadeFilter(e.target.value)} className="h-11 rounded-xl border border-border/90 bg-background/70 px-3 text-sm"><option value="todos">Gravidade: todas</option><option value={EMPTY_FILTER}>Gravidade: não informada</option>{gravidadeOptions.map((v)=><option key={v} value={v}>{v}</option>)}</select><select value={equipeFilter} onChange={(e)=>setEquipeFilter(e.target.value)} className="h-11 rounded-xl border border-border/90 bg-background/70 px-3 text-sm"><option value="todos">Equipe: todas</option><option value={EMPTY_FILTER}>Equipe: não informada</option>{equipeOptions.map((v)=><option key={v} value={v}>{v}</option>)}</select><select value={tipoFilter} onChange={(e)=>setTipoFilter(e.target.value)} className="h-11 rounded-xl border border-border/90 bg-background/70 px-3 text-sm"><option value="todos">Tipo: todos</option><option value={EMPTY_FILTER}>Tipo: não informado</option>{tipoOptions.map((v)=><option key={v} value={v}>{v}</option>)}</select><select value={prazoFilter} onChange={(e)=>setPrazoFilter(e.target.value)} className="h-11 rounded-xl border border-border/90 bg-background/70 px-3 text-sm"><option value="todos">Prazo: todos</option><option value="critico">Prazo crítico</option><option value="vencido">Vencidos</option><option value="vencendo">Vencendo em até 7 dias</option><option value={EMPTY_FILTER}>Sem prazo</option></select><input type="date" value={dataInicial} onChange={(e)=>setDataInicial(e.target.value)} className="h-11 rounded-xl border border-border/90 bg-background/70 px-3 text-sm" /><input type="date" value={dataFinal} onChange={(e)=>setDataFinal(e.target.value)} className="h-11 rounded-xl border border-border/90 bg-background/70 px-3 text-sm" />{hasActiveFilters && <button onClick={()=>{setSearchTerm("");setSituacaoFilter("todos");setPrioridadeFilter("todos");setGravidadeFilter("todos");setEquipeFilter("todos");setTipoFilter("todos");setPrazoFilter("todos");setDataInicial("");setDataFinal("");setReuPresoFilter(false);setMedidaProtetivaFilter(false);setDiligenciasPendentesFilter(false);navigate({ to: "/inqueritos" });}} className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background/70 px-3 text-sm font-medium transition hover:bg-accent md:col-span-4">Limpar filtros</button>}</div>}
</section>
{error && <p className="text-xs text-destructive">{error}</p>}
<div className="overflow-x-auto rounded-2xl border border-border/80 bg-card/90 shadow-[0_10px_40px_rgba(0,0,0,0.22)]">
  <table className="w-full min-w-[1180px] table-fixed text-sm">
    <colgroup>
      <col className="w-[10%]" />
      <col className="w-[7%]" />
      <col className="w-[26%]" />
      <col className="w-[8%]" />
      <col className="w-[5%]" />
      <col className="w-[10%]" />
      <col className="w-[8%]" />
      <col className="w-[14%]" />
      <col className="w-[7%]" />
      <col className="w-[5%]" />
    </colgroup>
    <thead className="bg-muted/25 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
      <tr>
        <th className="px-3 py-2.5 text-left font-bold align-middle">Nº PPE</th>
        <th className="px-2.5 py-2.5 text-left font-bold align-middle">PRIOR.</th>
        <th className="px-2.5 py-2.5 text-left font-bold align-middle">TIPIFICAÇÃO</th>
        <th className="px-2.5 py-2.5 text-left font-bold align-middle">GRAVIDADE</th>
        <th className="px-2.5 py-2.5 text-center font-bold align-middle">TIPO</th>
        <th className="px-2.5 py-2.5 text-left font-bold align-middle">BAIRRO</th>
        <th className="px-2.5 py-2.5 text-center font-bold align-middle">RÉU PRESO</th>
        <th className="px-2.5 py-2.5 text-center font-bold align-middle">STATUS</th>
        <th className="px-2.5 py-2.5 text-right font-bold align-middle">PRAZO</th>
        <th className="px-3 py-2.5 text-center font-bold align-middle">AÇÃO</th>
      </tr>
    </thead>
    <tbody>
      {!loading && filtered.length === 0 && <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">Nenhum inquérito encontrado para os filtros informados.</td></tr>}
      {filtered.map((row) => {
        const situacao = row.situacao !== FALLBACK ? row.situacao : row.statusDiligencias;
        const prazoVencido = isPrazoVencido(row.prazo);
        const prazoTexto = formatPrazoDias(row.prazo);
        const reuPreso = hasReuPreso(row);
        const numeroPpe = row.numeroPpe || FALLBACK;
        const tipificacao = row.tipificacao || FALLBACK;
        const gravidade = row.gravidade || FALLBACK;
        const tipoProcedimento = row.tipoProcedimento || FALLBACK;
        const bairro = row.bairro || FALLBACK;
        const statusTexto = situacao || FALLBACK;
        return <tr key={row.id} className="border-t border-border/70 align-middle transition hover:bg-muted/20">
          <td className="px-3 py-2.5 align-middle"><p className="truncate font-mono text-[15px] font-bold leading-5 text-primary drop-shadow-[0_0_8px_rgba(34,197,94,0.16)]" title={numeroPpe}>{numeroPpe}</p></td>
          <td className="px-2.5 py-2.5 align-middle"><button type="button" onClick={()=>setPrioridadeFilter(row.prioridade || EMPTY_FILTER)} className={`inline-flex min-h-6 max-w-full items-center justify-center rounded border px-2 py-0.5 text-[10px] font-extrabold uppercase leading-none tracking-wide ${priorityToneClass(row.prioridade)}`}>{row.prioridade || FALLBACK}</button></td>
          <td className="px-2.5 py-2.5 align-middle"><button type="button" onClick={() => setTipoFilter(row.tipificacao || EMPTY_FILTER)} className="block max-w-full truncate text-left text-[13px] font-semibold leading-5 text-foreground/95 hover:underline" title={tipificacao}>{tipificacao}</button></td>
          <td className="px-2.5 py-2.5 align-middle"><button type="button" onClick={()=>setGravidadeFilter(row.gravidade || EMPTY_FILTER)} className="block max-w-full truncate text-left text-xs font-medium leading-5 text-sky-100/70 hover:text-sky-100" title={gravidade}>{gravidade}</button></td>
          <td className="px-2.5 py-2.5 text-center align-middle"><span className="block max-w-full truncate font-mono text-[12px] font-semibold text-foreground/90" title={tipoProcedimento}>{tipoProcedimento}</span></td>
          <td className="px-2.5 py-2.5 align-middle"><span className="block max-w-full truncate text-xs leading-5 text-muted-foreground" title={bairro}>{bairro}</span></td>
          <td className="px-2.5 py-2.5 text-center align-middle">{reuPreso ? <span className="inline-flex min-h-6 items-center justify-center rounded border border-destructive/35 bg-destructive/15 px-2 py-0.5 text-[10px] font-extrabold uppercase leading-none tracking-wide text-destructive">SIM</span> : <span className="text-xs text-muted-foreground">{FALLBACK}</span>}</td>
          <td className="px-2.5 py-2.5 text-center align-middle"><button type="button" onClick={()=>setSituacaoFilter(situacao || EMPTY_FILTER)} className={`inline-flex min-h-6 max-w-full items-center justify-center overflow-hidden rounded border px-2 py-0.5 text-[10px] font-extrabold uppercase leading-none tracking-wide ${statusToneClass(situacao)}`} title={statusTexto}><span className="block max-w-full truncate whitespace-nowrap">{statusTexto}</span></button></td>
          <td className="px-2.5 py-2.5 text-right align-middle"><button type="button" onClick={()=>setPrazoFilter(prazoVencido?"vencido":"critico")} className={`inline-flex min-h-6 items-center justify-center rounded px-1.5 py-0.5 text-xs font-bold ${prazoVencido ? "text-destructive" : "text-muted-foreground"}`}>{prazoTexto}</button></td>
          <td className="px-3 py-2.5 text-center align-middle"><button className="inline-flex min-h-8 items-center justify-center rounded-lg border border-info/40 bg-info/15 px-3 py-1.5 text-xs font-semibold text-info transition hover:bg-info/25 hover:text-info/90" onClick={() => navigate({ to: "/inqueritos/$caseId", params: { caseId: row.id } })}>Abrir</button></td>
        </tr>;
      })}
    </tbody>
  </table>
</div></div></AppLayout>;
}
