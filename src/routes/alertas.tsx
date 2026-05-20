import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, CalendarClock, CheckCircle2, Clock3, FileWarning, Info, ShieldAlert } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { listInqueritos, type InqueritoRecord } from "@/lib/repositories/inqueritosRepository";
import { listRepresentacoes, type RepresentacaoRecord } from "@/lib/repositories/representacoesRepository";

type Severity = "critico" | "atencao" | "informativo";
type AlertItem = { id: string; title: string; description: string; severity: Severity; count: number; href?: string; icon: typeof AlertTriangle; dueHint?: string; };

export const Route = createFileRoute("/alertas")({ head: () => ({ meta: [{ title: "Alertas — SIPI" }] }), component: Alertas });

const normalizeText = (v?: string | null) => (v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const isConcluidoAlias = (v?: string | null) => ["concluido", "concluida", "finalizado", "finalizada", "encerrado", "relatado"].some((w) => normalizeText(v).includes(w));
const isPendenteRepresentacao = (v?: string | null) => ["pend", "analis", "aguard", "enviad"].some((w) => normalizeText(v).includes(w)) || !normalizeText(v);
const parseAnyDateUtc = (value?: string | null) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/u.exec(raw);
  if (br) return Date.UTC(Number(br[3]), Number(br[2]) - 1, Number(br[1]), 12, 0, 0, 0);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/u.exec(raw);
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12, 0, 0, 0);
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return null;
  return Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 12, 0, 0, 0);
};
const diffDaysFromNow = (utcTimestamp: number) => Math.ceil((utcTimestamp - Date.now()) / (1000 * 60 * 60 * 24));

function Alertas() {
  const [inqueritos, setInqueritos] = useState<InqueritoRecord[]>([]);
  const [representacoes, setRepresentacoes] = useState<RepresentacaoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [severityFilter, setSeverityFilter] = useState<Severity | "todas">("todas");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [inq, rep] = await Promise.all([listInqueritos(), listRepresentacoes()]);
        setInqueritos(inq);
        setRepresentacoes(rep);
      } catch {
        setError("Não foi possível carregar os alertas operacionais agora.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const alerts = useMemo<AlertItem[]>(() => {
    const inqMapped = inqueritos.map((item) => {
      const raw = item as unknown as Record<string, unknown>;
      const prazo = String(raw.prazo ?? raw.data_prazo ?? "");
      const situacao = String(raw.situacao ?? raw.situação ?? raw.status ?? raw.status_diligencias ?? "");
      return {
        prazo,
        situacao,
        ppe: String(raw.numero_ppe ?? raw.numeroPpe ?? raw.ppe ?? ""),
        vitima: String(raw.vitima ?? raw.vítima ?? ""),
        investigado: String(raw.investigado ?? raw.suspeito ?? raw.autor_investigado ?? ""),
        tipificacao: String(raw.tipificacao ?? raw.classificacao ?? raw.tipo_penal ?? ""),
        equipe: String(raw.equipe ?? ""),
      };
    });

    const ativos = inqMapped.filter((r) => !isConcluidoAlias(r.situacao));
    const inqVencidos = ativos.filter((r) => { const ts = parseAnyDateUtc(r.prazo); return ts !== null && diffDaysFromNow(ts) < 0; });
    const inqCriticos = ativos.filter((r) => { const ts = parseAnyDateUtc(r.prazo); if (ts === null) return false; const d = diffDaysFromNow(ts); return d >= 0 && d <= 7; });
    const inqSemPrazo = ativos.filter((r) => parseAnyDateUtc(r.prazo) === null);
    const inqIncompletos = inqMapped.filter((r) => [r.ppe, r.vitima, r.investigado, r.tipificacao, r.situacao, r.equipe, r.prazo].some((f) => !normalizeText(f) || normalizeText(f) === "nao informado"));
    const inqNaoConcluidos = inqMapped.filter((r) => !isConcluidoAlias(r.situacao));

    const repMapped = representacoes.map((r) => ({
      status: String(r.status ?? ""), tipo: String(r.tipo ?? ""), vitima: String(r.vitima ?? ""), investigado: String(r.investigado ?? ""), processo: String(r.processo_judicial ?? ""), data: String(r.data_representacao ?? ""),
    }));
    const repPendentes = repMapped.filter((r) => isPendenteRepresentacao(r.status));
    const repAntigasSemDecisao = repPendentes.filter((r) => { const ts = parseAnyDateUtc(r.data); if (ts === null) return false; return diffDaysFromNow(ts) < -30; });
    const repIncompletas = repMapped.filter((r) => [r.tipo, r.vitima, r.investigado, r.processo, r.data, r.status].some((f) => !normalizeText(f) || normalizeText(f) === "nao informado"));

    const all: AlertItem[] = [
      { id: "inq-vencidos", title: "Inquéritos vencidos", description: `${inqVencidos.length} inquérito(s) vencido(s). Prazo expirado. Ação imediata necessária.`, count: inqVencidos.length, severity: "critico", icon: AlertTriangle, href: "/inqueritos?prazo=vencido" },
      { id: "inq-criticos", title: "Inquéritos próximos do vencimento", description: "Faltam até 7 dias para vencer.", count: inqCriticos.length, severity: "atencao", icon: CalendarClock, href: "/inqueritos?prazo=critico", dueHint: "janela de até 7 dias" },
      { id: "inq-sem-prazo", title: "Inquéritos sem prazo definido", description: "Casos ativos sem data limite definida.", count: inqSemPrazo.length, severity: "informativo", icon: Clock3, href: "/inqueritos?prazo=sem-prazo" },
      { id: "inq-incompletos", title: "Inquéritos com informações incompletas", description: `${inqIncompletos.length} inquérito(s) com informações incompletas.`, count: inqIncompletos.length, severity: "atencao", icon: FileWarning, href: "/inqueritos?busca=nao-informado" },
      { id: "inq-abertos", title: "Inquéritos não concluídos", description: "Casos em andamento, aguardando conclusão/relato.", count: inqNaoConcluidos.length, severity: "informativo", icon: Bell, href: "/inqueritos?situacao=em-andamento" },
      { id: "rep-antigas", title: "Representações antigas sem decisão", description: "Representações pendentes há mais de 30 dias.", count: repAntigasSemDecisao.length, severity: "critico", icon: ShieldAlert, href: "/representacoes?status=pendente" },
      { id: "rep-pendentes", title: "Representações pendentes", description: "Pendentes, em análise, aguardando ou enviadas.", count: repPendentes.length, severity: "atencao", icon: Info, href: "/representacoes?status=pendente" },
      { id: "rep-incompletas", title: "Representações com informações incompletas", description: "Campos essenciais em branco ou não informados.", count: repIncompletas.length, severity: "informativo", icon: CheckCircle2, href: "/representacoes?busca=nao-informado" },
    ];

    return all.filter((a) => a.count > 0);
  }, [inqueritos, representacoes]);

  const counts = useMemo(() => ({ total: alerts.length, critico: alerts.filter((a) => a.severity === "critico").length, atencao: alerts.filter((a) => a.severity === "atencao").length, informativo: alerts.filter((a) => a.severity === "informativo").length }), [alerts]);
  const visible = severityFilter === "todas" ? alerts : alerts.filter((a) => a.severity === severityFilter);
  const tone = { critico: "var(--destructive)", atencao: "var(--warning)", informativo: "var(--info)" } as const;

  return <AppLayout><div className="space-y-6"><PageHeader title="Central de Alertas" subtitle="Alertas operacionais baseados nos dados atuais de Inquéritos e Representações" showActions={false} />
    <section className="grid gap-3 md:grid-cols-3">{(["critico", "atencao", "informativo"] as Severity[]).map((s) => <button key={s} onClick={() => setSeverityFilter(s)} className="rounded-2xl border bg-card/70 p-4 text-left transition hover:bg-card" style={{ borderColor: `color-mix(in oklab, ${tone[s]} 35%, var(--border))` }}><div className="text-xs uppercase tracking-[0.12em]" style={{ color: tone[s] }}>{s}</div><div className="mt-2 text-3xl font-black">{counts[s]}</div><div className="text-xs text-muted-foreground">alerta(s)</div></button>)}</section>
    <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{counts.total} alerta(s) ativo(s)</p>{severityFilter !== "todas" ? <button onClick={() => setSeverityFilter("todas")} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent">Limpar filtro</button> : null}</div>
    {loading ? <div className="rounded-xl border border-border/70 bg-card/60 p-4 text-sm text-muted-foreground">Carregando alertas operacionais…</div> : null}
    {!loading && error ? <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
    {!loading && !error && visible.length === 0 ? <div className="rounded-xl border border-border/70 bg-card/60 p-6 text-center text-sm text-muted-foreground">Nenhum alerta operacional no momento.</div> : null}
    <section className="space-y-3">{visible.map((a) => { const Icon = a.icon; return <Link key={a.id} to={a.href ?? "/alertas"} title={`Abrir lista filtrada: ${a.title}`} aria-label={`Abrir lista filtrada: ${a.title}`} className="block rounded-2xl border bg-card/70 p-4 transition hover:-translate-y-[1px] hover:bg-card" style={{ borderColor: `color-mix(in oklab, ${tone[a.severity]} 32%, var(--border))` }}><div className="flex items-start gap-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `color-mix(in oklab, ${tone[a.severity]} 16%, transparent)`, color: tone[a.severity] }}><Icon className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{a.title}</h3><span className="rounded-full border px-2 py-0.5 text-[10px] uppercase" style={{ borderColor: `color-mix(in oklab, ${tone[a.severity]} 45%, var(--border))`, color: tone[a.severity] }}>{a.severity}</span></div><p className="mt-1 text-sm text-muted-foreground">{a.description}</p>{a.dueHint ? <p className="mt-1 text-xs text-muted-foreground">Prazo: {a.dueHint}</p> : null}</div><div className="text-right"><div className="text-2xl font-black" style={{ color: tone[a.severity] }}>{a.count}</div><div className="text-[11px] uppercase tracking-wide text-muted-foreground">registros</div></div></div></Link>; })}</section>
  </div></AppLayout>;
}
