import { Outlet, createFileRoute, Link, useLocation, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { getRepresentacaoById, softDeleteRepresentacao, type RepresentacaoRecord } from "@/lib/repositories/representacoesRepository";

export const Route = createFileRoute("/representacoes/$representacaoId")({ component: DetalheRepresentacao });

function withFallback(value?: string | null) {
  return value?.trim() ? value : "—";
}

function getStatusBadgeClass(status?: string | null) {
  const normalized = status?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ?? "";
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

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError("");

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
  if (loading) return <AppLayout>Carregando representação...</AppLayout>;
  if (error) return <AppLayout>{error}</AppLayout>;
  if (!item) return <AppLayout>Representação não encontrada.</AppLayout>;

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
  const prioridadeText = withFallback(item.prioridade_operacional);
  const sectionCardClass =
    "self-start rounded-xl border border-emerald-400/20 bg-zinc-950/90 p-4 shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_8px_24px_rgba(0,0,0,0.35)] transition-colors duration-200 hover:border-emerald-300/35 hover:shadow-[0_0_0_1px_rgba(52,211,153,0.2),0_10px_24px_rgba(0,0,0,0.4)]";
  const sectionTitleClass = "mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300";
  const infoRowClass = "grid gap-1 py-2.5 sm:grid-cols-[190px_1fr] sm:gap-3";
  const summaryCardClass =
    "rounded-lg border border-emerald-400/20 bg-zinc-950/85 px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.06)] transition-colors duration-200 hover:border-emerald-300/35 hover:bg-zinc-950";
  const cardSections: Array<{ title: string; items: Array<[string, string | null | undefined]> }> = [
    {
      title: "Identificação da Representação",
      items: [
        ["Nº PPE / Procedimento relacionado", item.numero_ppe],
        ["Nº Processo Judicial", item.processo_judicial],
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
      title: "Fundamentação e Finalidade",
      items: [
        ["Resumo dos fatos", item.resumo_fatos],
        ["Fundamentação da medida", item.fundamentacao],
        ["Objetivo da representação", item.objetivo],
        ["Diligências relacionadas", item.diligencias_relacionadas],
      ],
    },
    {
      title: "Tramitação Judicial",
      items: [
        ["Status", item.status],
        ["Data de envio ao Judiciário", item.data_envio_judiciario],
        ["Data da decisão", item.data_decisao_judicial],
        ["Observações da decisão", item.observacoes_decisao],
      ],
    },
    {
      title: "Controle Interno",
      items: [
        ["Prioridade operacional", item.prioridade_operacional],
        ["Pedido sigiloso", item.pedido_sigiloso],
        ["Observações internas", item.observacoes_internas],
      ],
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-4">
        <header className="rounded-xl border border-emerald-400/25 bg-zinc-950/95 p-4 shadow-[0_0_0_1px_rgba(16,185,129,0.1),0_10px_30px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <Link to="/representacoes" className="mb-2 inline-flex items-center rounded-md border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-100 transition hover:bg-emerald-400/15">
                ← Voltar para lista
              </Link>
              <h1 className="text-2xl font-extrabold break-words text-zinc-100">Representação</h1>
              <p className="mt-0.5 text-sm break-words text-zinc-400">
                {subtitleParts.length > 0 ? subtitleParts.join(" • ") : "Detalhes da representação cadastrada"}
              </p>
              <p className="mt-1.5 text-sm break-words text-emerald-200/90">{item.numero_ppe ? `PPE/Procedimento: ${item.numero_ppe}` : `Processo/PPE: ${withFallback(item.processo_judicial)}`}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold ${getStatusBadgeClass(item.status)}`}>
                {statusText}
              </span>
              <button onClick={() => window.print()} className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-100 transition hover:bg-emerald-400/15">
                Imprimir
              </button>
              <button
                onClick={() => navigate({ to: "/representacoes/$representacaoId/editar", params: { representacaoId: item.id } })}
                className="rounded-md border border-emerald-400/35 px-3 py-1.5 text-xs text-emerald-100 transition hover:bg-emerald-400/15"
              >
                Editar
              </button>
              <button onClick={() => setShowDeleteModal(true)} className="rounded-md border border-rose-400/35 bg-rose-400/10 px-3 py-1.5 text-xs text-rose-200 transition hover:bg-rose-400/15">
                Excluir
              </button>
            </div>
          </div>
        </header>

        <section className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Tipo", withFallback(item.tipo), "text-zinc-100"],
            ["Status", statusText, "text-emerald-100"],
            ["Prioridade", prioridadeText, "text-amber-100"],
            ["Processo/PPE", withFallback(item.processo_judicial || item.numero_ppe), "text-zinc-100"],
          ].map(([label, value, valueClass]) => (
            <article key={label} className={summaryCardClass}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
              {label === "Status" ? (
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

        <section className="grid items-start gap-4 md:grid-cols-2">
          <div className="space-y-4">
            {[cardSections[0], cardSections[2], cardSections[4]].map(({ title, items }) => (
              <article key={title} className={sectionCardClass}>
                <h2 className={sectionTitleClass}>{title}</h2>
                {title === "Fundamentação e Finalidade" ? (
                  <div className="space-y-2.5">
                    {items.map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-emerald-400/15 bg-zinc-900/45 px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
                        <p className="mt-1 text-sm text-zinc-100 whitespace-pre-wrap break-words">{withFallback(value)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="divide-y divide-emerald-500/10">
                    {items.map(([label, value]) => (
                      <div key={label} className={infoRowClass}>
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
                        <p className="text-sm text-zinc-100 whitespace-pre-wrap break-words">{withFallback(value)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>

          <div className="space-y-4">
            {[cardSections[1], cardSections[3]].map(({ title, items }) => (
              <article key={title} className={sectionCardClass}>
                <h2 className={sectionTitleClass}>{title}</h2>
                <div className="divide-y divide-emerald-500/10">
                {items.map(([label, value]) => (
                  <div key={label} className="grid gap-1 py-2.5 sm:grid-cols-[170px_1fr] sm:gap-3">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
                    {title === "Tramitação Judicial" && label === "Status" ? (
                      <span className={`mt-0.5 inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${getStatusBadgeClass(item.status)}`}>
                        {withFallback(value)}
                      </span>
                    ) : (
                      <p className="text-sm text-zinc-100 whitespace-pre-wrap break-words">{withFallback(value)}</p>
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
