import { Outlet, createFileRoute, Link, useLocation, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { getRepresentacaoById, softDeleteRepresentacao, type RepresentacaoRecord } from "@/lib/repositories/representacoesRepository";
import { getCurrentProfile } from "@/lib/auth";
import { canViewRepresentacoes } from "@/lib/authz";

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

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError("");

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
    "self-start rounded-xl border border-border/70 bg-card/60 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-colors duration-200 hover:border-border";
  const sectionTitleClass = "mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-300";
  const infoRowClass = "grid gap-1 py-2.5 sm:grid-cols-[190px_1fr] sm:gap-3";
  const summaryCardClass =
    "self-start rounded-lg border border-border/70 bg-muted/10 px-3 py-2.5 transition-colors duration-200 hover:border-border";
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

  return (
    <AppLayout>
      <div className="space-y-4">
        <header className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <Link to="/representacoes" className="mb-2 inline-flex items-center rounded-md border border-border bg-muted/20 px-2.5 py-1 text-[11px] text-zinc-200 transition hover:bg-muted/35">
                ← Voltar para lista
              </Link>
              <h1 className="text-2xl font-bold break-words text-zinc-100">Representação</h1>
              <p className="mt-0.5 text-sm break-words text-zinc-400">
                {subtitleParts.length > 0 ? subtitleParts.join(" • ") : "Detalhes da representação cadastrada"}
              </p>
              <p className="mt-1.5 text-sm break-words text-zinc-300">{item.numero_ppe ? `PPE/Procedimento: ${item.numero_ppe}` : `Processo/PPE: ${withFallback(item.processo_judicial)}`}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <button onClick={() => window.print()} className="rounded-md border border-border bg-muted/20 px-3 py-1.5 text-xs text-zinc-100 transition hover:bg-muted/35">
                Imprimir
              </button>
              <button
                onClick={() => navigate({ to: "/representacoes/$representacaoId/editar", params: { representacaoId: item.id } })}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-zinc-100 transition hover:bg-muted/35"
              >
                Editar
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="rounded-md border border-rose-400/55 bg-rose-500/15 px-3 py-1.5 text-xs font-medium text-rose-100 shadow-[0_0_0_rgba(251,113,133,0)] transition-all duration-200 hover:border-rose-300/70 hover:bg-rose-500/25 hover:text-rose-50 hover:shadow-[0_0_14px_rgba(251,113,133,0.25)]"
              >
                Excluir
              </button>
            </div>
          </div>
        </header>

        <section className="grid items-start gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
                <p className={`mt-1 text-sm font-semibold break-words ${valueClass}`}>{value}</p>
              )}
            </article>
          ))}
        </section>

        <section className="grid items-start gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4 self-start">
            {[cardSections[0], cardSections[1]].map(({ title, items }) => (
              <article key={title} className={sectionCardClass}>
                <h2 className={sectionTitleClass}>{title}</h2>
                <div className="divide-y divide-border/40">
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
                <div className="rounded-lg border border-border/40 bg-muted/5 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Prazo operacional</p>
                  <p className="mt-1 text-sm text-zinc-100">{formatPrazoStatus(item)}</p>
                </div>
                <div className="rounded-lg border border-border/40 bg-muted/5 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Sinalização</p>
                  <p className="mt-1 text-sm text-zinc-300">
                    {item.acompanhamento_especial ? "Acompanhamento especial ativo." : "Sem alertas operacionais marcados."}
                  </p>
                </div>
              </div>
            </article>
            <div className="grid grid-cols-1 items-start gap-4">
              {fundamentacaoCards.map(([title, value]) => (
                <article key={title} className={sectionCardClass}>
                  <h2 className={sectionTitleClass}>{title}</h2>
                  <div className="min-h-[112px] rounded-lg border border-border/40 bg-muted/5 px-4 py-3">
                    <p className={`text-sm whitespace-pre-wrap break-words leading-relaxed ${isEmptyValue(value) ? "text-zinc-500" : "text-zinc-100"}`}>
                      {withFallback(value)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-4 self-start">
            {[cardSections[2], cardSections[3]].map(({ title, items }) => (
              <article key={title} className={sectionCardClass}>
                <h2 className={sectionTitleClass}>{title}</h2>
                <div className="divide-y divide-border/40">
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
