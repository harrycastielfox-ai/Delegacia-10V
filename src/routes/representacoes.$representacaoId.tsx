import { Outlet, createFileRoute, Link, useLocation, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { getRepresentacaoById, softDeleteRepresentacao, type RepresentacaoRecord } from "@/lib/repositories/representacoesRepository";
import { getCurrentProfile } from "@/lib/auth";
import { canViewRepresentacoes } from "@/lib/authz";
import { canAccessSigilosa, isRepresentacaoSigilosa } from "@/lib/representacoesSigilo";

export const Route = createFileRoute("/representacoes/$representacaoId")({ component: DetalheRepresentacao });

function withFallback(value?: string | null) {
  return value?.trim() ? value : "—";
}
function normalizeText(value?: string | null) {
  return (value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function getStatusAlias(status?: string | null) {
  const n = normalizeText(status);
  if (!n) return "Sem status definido";
  if (n.includes("indefer")) return "Indeferida";
  if (n.includes("cumprida parcialmente")) return "Cumprida parcialmente";
  if (n.includes("cumprid")) return "Cumprida";
  if (n.includes("deferida parcial")) return "Deferida parcialmente";
  if (n.includes("defer")) return "Deferida";
  if (n.includes("aguard")) return "Aguardando decisão judicial";
  if (n.includes("enviad")) return "Enviada ao Judiciário";
  if (n.includes("analis")) return "Em análise";
  if (n.includes("elabor")) return "Em elaboração";
  return status ?? "Sem status definido";
}
function getSituacaoOperacional(status?: string | null) {
  const n = normalizeText(status);
  if (n.includes("indefer")) return "Situação: indeferida";
  if (n.includes("cumprid")) return "Situação: cumprida";
  if (n.includes("defer")) return "Situação: deferida";
  return "Situação: pendente";
}

function getStatusBadgeClass(status?: string | null) {
  const normalized = normalizeText(status);
  if (normalized.includes("deferida") || normalized.includes("cumprida")) {
    return "border-emerald-400/35 bg-emerald-400/10 text-emerald-200";
  }
  if (normalized.includes("indeferida")) {
    return "border-rose-400/35 bg-rose-400/10 text-rose-200";
  }
  if (normalized.includes("aguardando") || normalized.includes("pendente")) {
    return "border-amber-300/35 bg-amber-300/10 text-amber-100";
  }
  if (normalized.includes("enviada") || normalized.includes("analise")) {
    return "border-emerald-300/30 bg-emerald-300/10 text-emerald-100";
  }
  return "border-emerald-200/30 bg-emerald-200/10 text-emerald-100";
}

function getPrioridadeBadgeClass(prioridade?: string | null) {
  const normalized = prioridade?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ?? "";
  if (normalized.includes("urgente")) return "border-rose-300/35 bg-rose-400/10 text-rose-100";
  if (normalized.includes("alta")) return "border-amber-300/35 bg-amber-300/10 text-amber-100";
  if (normalized.includes("media")) return "border-amber-300/35 bg-amber-300/10 text-amber-100";
  if (normalized.includes("baixa") || normalized.includes("normal")) return "border-emerald-300/35 bg-emerald-300/10 text-emerald-100";
  return "border-zinc-500/40 bg-zinc-800/70 text-zinc-200";
}
function isEmptyValue(value?: string | null) {
  return !value?.trim();
}
function formatPrazoStatus(item: RepresentacaoRecord) {
  if (item.data_cumprimento) return "Cumprida";
  if (!item.data_vencimento) return "Sem vencimento";
  const due = new Date(item.data_vencimento);
  const now = new Date();
  const dueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dueDate.getTime() - nowDate.getTime()) / 86400000);
  if (diffDays > 0) return `Vence em ${diffDays} dia${diffDays === 1 ? "" : "s"}`;
  if (diffDays < 0) {
    const late = Math.abs(diffDays);
    return `Vencida há ${late} dia${late === 1 ? "" : "s"}`;
  }
  return "Vence hoje";
}

type TimelineTone = "neutral" | "success" | "warning" | "danger";
type TimelineEvent = {
  key: string;
  title: string;
  description?: string;
  date?: string;
  badge?: string;
  tone: TimelineTone;
  icon: string;
};

function formatDateBR(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("pt-BR");
}

function getTimelineToneClass(tone: TimelineTone) {
  if (tone === "success") return "border-emerald-400/30 bg-emerald-400/12 text-emerald-200";
  if (tone === "warning") return "border-amber-300/35 bg-amber-300/12 text-amber-100";
  if (tone === "danger") return "border-rose-400/35 bg-rose-400/12 text-rose-200";
  return "border-zinc-500/45 bg-zinc-700/25 text-zinc-200";
}
function getTimelineIconCircleClass(event: TimelineEvent) {
  if (event.key === "created") return "border-blue-400/35 bg-blue-500/15 text-blue-200";
  if (event.key === "sent-judiciary") return "border-indigo-400/35 bg-indigo-500/15 text-indigo-200";
  if (event.key === "deadline") {
    if (event.tone === "danger") return "border-rose-400/40 bg-rose-500/15 text-rose-200";
    if (event.tone === "success") return "border-emerald-400/35 bg-emerald-500/15 text-emerald-200";
    return "border-amber-300/45 bg-amber-400/15 text-amber-100";
  }
  if (event.key === "judicial-decision") return "border-zinc-400/45 bg-zinc-700/35 text-zinc-100";
  if (event.key === "special-tracking") return "border-violet-400/35 bg-violet-500/15 text-violet-200";
  if (event.tone === "success") return "border-emerald-400/35 bg-emerald-500/15 text-emerald-200";
  if (event.tone === "danger") return "border-rose-400/40 bg-rose-500/15 text-rose-200";
  if (event.tone === "warning") return "border-amber-300/45 bg-amber-400/15 text-amber-100";
  return "border-zinc-500/45 bg-zinc-700/35 text-zinc-100";
}

function buildTimelineEvents(item: RepresentacaoRecord): TimelineEvent[] {
  const events: Array<TimelineEvent & { sortTime: number }> = [];
  const addEvent = (event: TimelineEvent) => {
    const sortTime = event.date ? new Date(event.date).getTime() : Number.POSITIVE_INFINITY;
    events.push({ ...event, sortTime: Number.isNaN(sortTime) ? Number.POSITIVE_INFINITY : sortTime });
  };

  if (item.created_at) addEvent({ key: "created", title: "Representação cadastrada", description: "Registro inicial da representação no sistema.", date: item.created_at, tone: "neutral", icon: "◦" });
  if (item.data_envio_judiciario) addEvent({ key: "sent-judiciary", title: "Enviada ao Judiciário", description: "Tramitação judicial iniciada.", date: item.data_envio_judiciario, tone: "neutral", icon: "↗" });
  if (item.data_decisao_judicial) addEvent({ key: "judicial-decision", title: "Decisão judicial registrada", description: isEmptyValue(item.observacoes_decisao) ? undefined : item.observacoes_decisao ?? undefined, date: item.data_decisao_judicial, tone: "neutral", icon: "⚖" });

  if (item.prazo_concedido_dias != null || item.data_vencimento) {
    const due = item.data_vencimento ? new Date(item.data_vencimento) : null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const isOverdue = due ? due.getTime() < today : false;
    addEvent({
      key: "deadline",
      title: "Prazo definido",
      description: item.prazo_concedido_dias != null ? `Prazo concedido: ${item.prazo_concedido_dias} dia(s).` : undefined,
      date: item.data_vencimento ?? undefined,
      badge: formatPrazoStatus(item),
      tone: item.data_cumprimento ? "success" : isOverdue ? "danger" : "warning",
      icon: "⏱",
    });
  }

  const statusNormalized = normalizeText(item.status);
  if (statusNormalized.includes("deferida")) addEvent({ key: "status-deferida", title: "Representação deferida", date: item.data_decisao_judicial ?? undefined, tone: "success", icon: "✓" });
  if (statusNormalized.includes("indeferida")) addEvent({ key: "status-indeferida", title: "Representação indeferida", date: item.data_decisao_judicial ?? undefined, tone: "danger", icon: "✕" });
  if (statusNormalized.includes("cumprida")) addEvent({ key: "status-cumprida", title: "Cumprimento informado", description: isEmptyValue(item.resultado_cumprimento) ? undefined : item.resultado_cumprimento ?? undefined, date: item.data_cumprimento ?? undefined, tone: "success", icon: "✔" });
  if (item.acompanhamento_especial) addEvent({ key: "special-tracking", title: "Marcada como acompanhamento especial", description: "Sinalização interna de acompanhamento prioritário.", tone: "warning", icon: "⚑" });

  return events.sort((a, b) => a.sortTime - b.sortTime).map(({ sortTime, ...event }) => event);
}

function DetalheRepresentacao() {
  const { representacaoId } = Route.useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const matchRoute = useMatchRoute();
  const isEditingRoute = Boolean(matchRoute({ to: "/representacoes/$representacaoId/editar", params: { representacaoId } }));
  const [item, setItem] = useState<RepresentacaoRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState("");
  const [restricted, setRestricted] = useState(false);
  const [sigiloRestricted, setSigiloRestricted] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError("");
      setSigiloRestricted(false);

      const currentProfile = await getCurrentProfile();
      if (!canViewRepresentacoes(currentProfile)) {
        if (active) setRestricted(true);
        if (active) setLoading(false);
        return;
      }
      if (active) setRestricted(false);

      try {
        const data = await getRepresentacaoById(representacaoId);
        if (!active) return;
        const isSigilosa = isRepresentacaoSigilosa(data);
        const userCanAccessSigilo = canAccessSigilosa(currentProfile);
        if (isSigilosa && !userCanAccessSigilo) {
          setSigiloRestricted(true);
          setItem(null);
          return;
        }
        setSigiloRestricted(false);
        setItem(data);
      } catch (err: unknown) {
        if (!active) return;
        const maybeError = err as { code?: string; message?: string };
        if (maybeError?.code === "42501") {
          setError("Sem permissão para visualizar esta representação. Verifique a policy de SELECT da tabela public.representacoes.");
        } else {
          setError("Não foi possível carregar a representação agora.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [representacaoId, location.pathname]);

  if (isEditingRoute) return <Outlet />;
  if (restricted) return <AppLayout><div className="space-y-4"><h1 className="text-xl font-bold">Acesso restrito</h1><p className="text-sm text-muted-foreground">Seu perfil não possui permissão para acessar Representações.</p><Link to="/modulos" className="px-4 py-2 border border-border rounded-lg inline-block">Voltar</Link></div></AppLayout>;
  if (loading) return <AppLayout>Carregando representação...</AppLayout>;
  if (error) return <AppLayout>{error}</AppLayout>;
  if (sigiloRestricted) return <AppLayout><div className="space-y-4"><h1 className="text-xl font-bold">Representação sigilosa</h1><p className="text-sm text-muted-foreground">Representação sigilosa. Acesso restrito a Delegado, Admin ou Atlas.</p><Link to="/representacoes" className="px-4 py-2 border border-border rounded-lg inline-block">Voltar para lista</Link></div></AppLayout>;
  if (!item) return <AppLayout><div className="space-y-4"><h1 className="text-xl font-bold">Representação não encontrada ou removida</h1><p className="text-sm text-muted-foreground">Esta representação não está mais disponível para visualização.</p><Link to="/representacoes" className="px-4 py-2 border border-border rounded-lg inline-block">Voltar</Link></div></AppLayout>;

  const remove = async () => {
    if (!item || isDeleting) return;

    setIsDeleting(true);
    try {
      await softDeleteRepresentacao(item.id);
      setShowDeleteModal(false);
      navigate({ to: "/representacoes" });
    } catch {
      alert("Não foi possível excluir a representação agora.");
    } finally {
      setIsDeleting(false);
    }
  };

  const subtitleParts = [item.tipo, item.processo_judicial ? `Processo: ${item.processo_judicial}` : ""].filter(Boolean);
  const statusText = withFallback(item.status);
  const statusAlias = getStatusAlias(item.status);
  const situacaoOperacional = getSituacaoOperacional(item.status);
  const prioridadeText = withFallback(item.prioridade_operacional);
  const sectionCardClass =
    "self-start rounded-2xl border border-emerald-400/15 bg-gradient-to-b from-zinc-900/95 to-black/85 p-4 shadow-[0_14px_36px_rgba(0,0,0,0.5)] transition-all duration-200 hover:border-emerald-300/25";
  const sectionTitleClass = "mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-100";
  const infoRowClass = "grid gap-1 py-2.5 sm:grid-cols-[190px_1fr] sm:gap-3";
  const summaryCardClass =
    "self-start rounded-xl border border-emerald-400/15 bg-zinc-950/80 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-200 hover:border-emerald-300/25";
  const cardSections: Array<{ title: string; items: Array<[string, string | null | undefined]> }> = [
    {
      title: "Identificação Judicial",
      items: [
        ["PPE vinculado / Procedimento relacionado", item.numero_ppe],
        ["Processo judicial", item.processo_judicial],
        ["Tipo de Representação", item.tipo],
        ["Data da Representação", item.data_representacao],
        ["Responsável pela Representação", item.responsavel],
      ],
    },
    {
      title: "Pessoas Envolvidas",
      items: [
        ["Vítima", item.vitima],
        ["Investigado / Representado", item.investigado],
        ["Autor preso?", item.autor_preso],
      ],
    },
    {
      title: "Tramitação Judicial",
      items: [
        ["Status", item.status],
        ["Data de envio ao Judiciário", item.data_envio_judiciario],
        ["Vara / Juízo", item.vara_juizo],
        ["Prazo concedido (dias)", item.prazo_concedido_dias?.toString()],
        ["Data de vencimento", item.data_vencimento],
        ["Data da decisão judicial", item.data_decisao_judicial],
        ["Data de cumprimento", item.data_cumprimento],
        ["Resultado do cumprimento", item.resultado_cumprimento],
        ["Observações da decisão", item.observacoes_decisao],
      ],
    },
    {
      title: "Controle Interno",
      items: [
        ["Prioridade operacional", item.prioridade_operacional],
        ["Pedido sigiloso", item.pedido_sigiloso],
        ["Equipe responsável", item.equipe_responsavel],
        ["Acompanhamento especial", item.acompanhamento_especial == null ? null : item.acompanhamento_especial ? "Sim" : "Não"],
        ["Observações internas", item.observacoes_internas],
      ],
    },
  ];
  const fundamentacaoCards: Array<[string, string | null | undefined]> = [
    ["Resumo dos fatos", item.resumo_fatos],
    ["Fundamentação da medida", item.fundamentacao],
    ["Objetivo da representação", item.objetivo],
    ["Diligências relacionadas", item.diligencias_relacionadas],
  ];
  const timelineEvents = buildTimelineEvents(item);

  return (
    <AppLayout>
      <div className="space-y-5">
        <header className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-5 shadow-[0_18px_50px_rgba(0,0,0,0.55)]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold break-words text-zinc-100">{isRepresentacaoSigilosa(item) ? "Representação sigilosa" : "Representação"}</h1>
                {isRepresentacaoSigilosa(item) ? (
                  <span className="inline-flex items-center rounded-full border border-amber-300/35 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100">
                    Sigilo ativo
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm break-words text-zinc-400">
                {subtitleParts.length > 0 ? subtitleParts.join(" • ") : "Detalhes da representação cadastrada"}
              </p>
              <p className="mt-2 text-sm break-words text-emerald-100/90">{item.numero_ppe ? `PPE/Procedimento: ${item.numero_ppe}` : `Processo/PPE: ${withFallback(item.processo_judicial)}`}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <button onClick={() => window.print()} className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3.5 py-1.5 text-xs text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800/80">
                Imprimir
              </button>
              <button
                onClick={() => navigate({ to: "/representacoes/$representacaoId/editar", params: { representacaoId: item.id } })}
                className="rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-3.5 py-1.5 text-xs text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-500/15"
              >
                Editar
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3.5 py-1.5 text-xs font-medium text-rose-100 shadow-[0_0_0_rgba(251,113,133,0)] transition-all duration-200 hover:border-rose-300/60 hover:bg-rose-500/20 hover:text-rose-50 hover:shadow-[0_0_14px_rgba(251,113,133,0.2)]"
              >
                Excluir
              </button>
            </div>
          </div>
        </header>

        <section className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            ["Status judicial", statusAlias, "text-emerald-100"],
            ["Situação", situacaoOperacional.replace("Situação: ", ""), "text-zinc-100"],
            ["Prioridade", prioridadeText, "text-amber-100"],
            ["Prazo", formatPrazoStatus(item), "text-zinc-100"],
            ["Acomp. especial", item.acompanhamento_especial == null ? "—" : item.acompanhamento_especial ? "Sim" : "Não", "text-zinc-100"],
            ["Sigilosa", withFallback(item.pedido_sigiloso), "text-zinc-100"],
          ].map(([label, value, valueClass]) => (
            <article key={label} className={summaryCardClass}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
              {label === "Status judicial" ? (
                <span className={`mt-1 inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${getStatusBadgeClass(item.status)}`}>{value}</span>
              ) : label === "Prioridade" ? (
                <span className={`mt-1 inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${getPrioridadeBadgeClass(item.prioridade_operacional)}`}>
                  {value}
                </span>
              ) : (
                <p className={`mt-1.5 text-sm font-semibold break-words ${valueClass}`}>{value}</p>
              )}
            </article>
          ))}
        </section>

        <section className="grid items-start gap-4 xl:grid-cols-2">
          <div className="space-y-4 self-start">
            {[cardSections[0], cardSections[1]].map(({ title, items }) => (
              <article key={title} className={sectionCardClass}>
                <h2 className={sectionTitleClass}>{title}</h2>
                <div className="divide-y divide-zinc-700/50">
                  {items.map(([label, value]) => (
                    <div key={label} className={infoRowClass}>
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
                      <p className={`text-sm whitespace-pre-wrap break-words ${isEmptyValue(value) ? "text-zinc-500" : "text-zinc-100"}`}>{withFallback(value)}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
            <article className={sectionCardClass}>
              <h2 className={sectionTitleClass}>Pendências e Alertas</h2>
              <div className="space-y-2">
                <div className="rounded-xl border border-emerald-400/15 bg-zinc-900/70 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Prazo operacional</p>
                  <p className="mt-1 text-sm text-zinc-100">{formatPrazoStatus(item)}</p>
                </div>
                <div className="rounded-xl border border-emerald-400/15 bg-zinc-900/70 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Sinalização</p>
                  <p className="mt-1 text-sm text-zinc-300">
                    {item.acompanhamento_especial ? "Acompanhamento especial ativo." : "Sem alertas operacionais marcados."}
                  </p>
                </div>
              </div>
            </article>
          </div>

          <div className="space-y-4 self-start">
            {[cardSections[2], cardSections[3]].map(({ title, items }) => (
              <article key={title} className={sectionCardClass}>
                <h2 className={sectionTitleClass}>{title}</h2>
                <div className="divide-y divide-zinc-700/50">
                  {items.map(([label, value]) => (
                    <div key={label} className="grid gap-1 py-2.5 sm:grid-cols-[170px_1fr] sm:gap-3">
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
                      {title === "Tramitação Judicial" && label === "Status" ? (
                        <span className={`mt-0.5 inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${getStatusBadgeClass(item.status)}`}>
                          {withFallback(value)}
                        </span>
                      ) : (
                        <p className={`text-sm whitespace-pre-wrap break-words ${isEmptyValue(value) ? "text-zinc-500" : "text-zinc-100"}`}>{withFallback(value)}</p>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          {fundamentacaoCards.map(([title, value]) => (
            <article key={title} className={sectionCardClass}>
              <h2 className={sectionTitleClass}>{title}</h2>
              <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-emerald-400/15 bg-zinc-900/70 px-4 py-3">
                <p
                  className={`min-w-0 max-w-full overflow-hidden whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-relaxed ${
                    isEmptyValue(value) ? "text-zinc-500" : "text-zinc-100"
                  }`}
                >
                  {withFallback(value)}
                </p>
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-emerald-400/15 bg-gradient-to-b from-zinc-900/95 to-black/85 p-5 shadow-[0_14px_36px_rgba(0,0,0,0.5)] sm:p-6">
          <h2 className={sectionTitleClass}>Linha do Tempo Operacional</h2>
          {timelineEvents.length === 0 ? (
            <div className="rounded-lg border border-border/40 bg-muted/5 px-4 py-3 text-sm text-zinc-400">
              Sem eventos operacionais automáticos disponíveis para esta representação.
            </div>
          ) : (
            <ol className="relative ml-1 space-y-4 border-l border-border/60 pl-5">
              {timelineEvents.map((event) => {
                const dateLabel = formatDateBR(event.date);
                const isCritical = event.tone === "danger" && event.key === "deadline" && Boolean(event.badge?.toLowerCase().includes("vencida"));
                return (
                  <li key={event.key} className="relative pl-6">
                    <span
                      className={`absolute -left-[1.64rem] top-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm shadow-[0_0_0_1px_rgba(0,0,0,0.45),0_8px_18px_rgba(0,0,0,0.35)] ${getTimelineIconCircleClass(event)}`}
                    >
                      {event.icon}
                    </span>
                    <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
                      <p className="text-sm font-semibold text-zinc-100">{event.title}</p>
                      {event.badge ? (
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getTimelineToneClass(event.tone)}`}>
                          {event.badge}
                        </span>
                      ) : null}
                    </div>
                    {event.description ? <p className="mt-1 text-xs text-muted-foreground">{event.description}</p> : null}
                    <p className={`mt-1 text-xs ${isCritical ? "text-rose-300" : "text-zinc-400"}`}>{dateLabel ?? "Data não informada"}</p>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-foreground">Excluir representação</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Deseja remover esta representação? Esta ação poderá ser registrada em auditoria no sistema final.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={isDeleting}
                className="rounded-md border border-destructive/30 bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
