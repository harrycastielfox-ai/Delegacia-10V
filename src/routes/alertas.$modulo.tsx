import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { canViewRepresentacoes, type UserProfile } from "@/lib/authz";
import { canAccessSigilosa } from "@/lib/representacoesSigilo";
import { AlertCircle, Clock3, FileSearch, FolderKanban } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { listInqueritos } from "@/lib/repositories/inqueritosRepository";
import { listRepresentacoes } from "@/lib/repositories/representacoesRepository";
import { buildModuleAlerts, buildSmartAlerts, isValidModulo, moduleMeta } from "@/lib/alertasInteligentes";

export const Route = createFileRoute("/alertas/$modulo")({ component: AlertasModulo, head: () => ({ meta: [{ title: "Módulo de Alertas — SIPI" }] }) });

const sevTone = { critico: "var(--destructive)", alto: "var(--warning)", medio: "#d7b24f", baixo: "var(--info)" } as const;

function AlertasModulo() {
  const { modulo } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [moduleAlerts, setModuleAlerts] = useState(buildModuleAlerts([]));
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [canOpenSigilosas, setCanOpenSigilosas] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [currentProfile, inq, rep] = await Promise.all([getCurrentProfile(), listInqueritos(), listRepresentacoes()]);
        setProfile(currentProfile);
        setCanOpenSigilosas(canAccessSigilosa(currentProfile));
        setModuleAlerts(buildModuleAlerts(buildSmartAlerts(inq, rep)));
      } catch {
        setError("Não foi possível carregar os alertas do módulo.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedModule = isValidModulo(modulo) ? modulo : null;
  const detailedAlerts = selectedModule ? moduleAlerts[selectedModule] : [];
  const meta = selectedModule ? moduleMeta[selectedModule] : null;

  return <AppLayout><div className="space-y-4">
    <div><Link to="/alertas" className="text-xs font-medium text-emerald-300 hover:underline">← Voltar para Central de Alertas</Link></div>

    {!selectedModule ? <section className="rounded-xl border border-border bg-card p-4"><h2 className="text-lg font-semibold">Módulo inválido</h2><p className="mt-1 text-sm text-muted-foreground">O módulo informado não existe. Use os cards da Central de Alertas para abrir um módulo válido.</p></section> : <section className="rounded-xl border border-border bg-card p-4"><h2 className="text-lg font-semibold">{meta?.title}</h2><p className="mt-1 text-xs text-muted-foreground">{meta?.desc}</p><p className="mt-2 text-sm font-medium">Total de alertas do módulo: {detailedAlerts.length}</p></section>}

    {loading ? <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">Carregando alertas…</div> : null}
    {!loading && error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}

    {!loading && !error && selectedModule ? <section className="rounded-xl border border-border bg-card p-4">{detailedAlerts.length === 0 ? <div className="rounded-lg border border-border bg-background/30 p-5 text-center text-sm text-muted-foreground">Nenhum alerta encontrado neste módulo.</div> : <div className="space-y-2">{detailedAlerts.map((a) => {
      const hasEntityId = Boolean(a.entityId);
      const canOpenInquerito = Boolean(profile);
      const canOpenRepresentacao = canViewRepresentacoes(profile);
      const isSigilosaAlert = selectedModule === "sigilosas" && a.entityType === "representacao";
      const canOpenByPermission = a.entityType === "inquerito"
        ? canOpenInquerito
        : canOpenRepresentacao && (!isSigilosaAlert || canOpenSigilosas);
      const isOpenable = hasEntityId && canOpenByPermission;
      const cardClassName = `block rounded-lg border bg-background/40 p-3 transition-all duration-200 ${isOpenable ? "cursor-pointer border-border hover:border-emerald-500/60 hover:bg-emerald-500/10 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.2),0_0_20px_rgba(16,185,129,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40" : "border-border"}`;

      const content = <>
        <div className="mb-2 flex items-start justify-between gap-2"><p className="text-sm font-semibold">{a.title}</p><span className="rounded px-2 py-0.5 text-[11px]" style={{ color: sevTone[a.severity], border: `1px solid color-mix(in oklab, ${sevTone[a.severity]} 45%, var(--border))` }}>{a.severity.toUpperCase()}</span></div>
        <div className="grid gap-1 text-xs text-muted-foreground md:grid-cols-2"><p><FolderKanban className="mr-1 inline h-3.5 w-3.5" />Módulo: {a.module}</p><p><FileSearch className="mr-1 inline h-3.5 w-3.5" />Identificação: {a.identifier}</p><p>Vítima/Alvo: {a.principal}</p><p>Tipo: {a.typeLabel}</p><p>Equipe: {a.team}</p><p>Status: {a.status}</p><p><Clock3 className="mr-1 inline h-3.5 w-3.5" />Prazo/Data: {a.dueLabel}</p><p className="md:col-span-2"><AlertCircle className="mr-1 inline h-3.5 w-3.5" />Ação sugerida: {a.action}</p></div>
        <p className="mt-3 text-xs font-medium text-emerald-400">{!hasEntityId ? "ID indisponível para abertura." : !canOpenByPermission ? "Acesso restrito ao perfil autorizado." : a.entityType === "inquerito" ? "Abrir inquérito" : "Abrir representação"}</p>
      </>;

      if (!isOpenable) return <article key={a.id} className={cardClassName}>{content}</article>;
      if (a.entityType === "inquerito") return <Link key={a.id} to="/inqueritos/$caseId" params={{ caseId: a.entityId }} className={cardClassName}>{content}</Link>;
      return <Link key={a.id} to="/representacoes/$representacaoId" params={{ representacaoId: a.entityId }} className={cardClassName}>{content}</Link>;
    })}</div>}</section> : null}
  </div></AppLayout>;
}
