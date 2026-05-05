import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { getRepresentacaoById, softDeleteRepresentacao, type RepresentacaoRecord } from "@/lib/repositories/representacoesRepository";

export const Route = createFileRoute("/representacoes/$representacaoId")({ component: DetalheRepresentacao });

function DetalheRepresentacao() {
  const { representacaoId } = Route.useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<RepresentacaoRecord | null>(null);
  const [loading, setLoading] = useState(true);
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
  }, [representacaoId]);

  if (loading) return <AppLayout>Carregando representação...</AppLayout>;
  if (error) return <AppLayout>{error}</AppLayout>;
  if (!item) return <AppLayout>Representação não encontrada.</AppLayout>;

  const remove = async () => {
    if (!confirm("Deseja remover esta representação? No sistema final, esta ação deverá ser registrada em auditoria.")) return;
    try {
      await softDeleteRepresentacao(item.id);
      navigate({ to: "/representacoes" });
    } catch {
      alert("Não foi possível excluir a representação agora.");
    }
  };

  const subtitleParts = [item.tipo, item.processo_judicial ? `Processo: ${item.processo_judicial}` : ""].filter(Boolean);

  return (
    <AppLayout>
      <div className="space-y-5">
        <header className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <Link to="/representacoes" className="mb-3 inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent/40">
                ← Voltar para lista
              </Link>
              <h1 className="text-2xl font-extrabold break-words">{item.numero_ppe ? `Representação ${item.numero_ppe}` : "Representação"}</h1>
              <p className="mt-1 text-sm text-muted-foreground break-words">
                {subtitleParts.length > 0 ? subtitleParts.join(" • ") : "Detalhes da representação cadastrada"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">ID interno: {item.id}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <span className="inline-flex items-center rounded-md border border-info/30 bg-info/10 px-2.5 py-1 text-[11px] font-semibold text-info">
                {item.status || "—"}
              </span>
              <button onClick={() => window.print()} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent/40">
                Imprimir
              </button>
              <button
                onClick={() => navigate({ to: "/representacoes/$representacaoId/editar", params: { representacaoId: item.id } })}
                className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent/40"
              >
                Editar
              </button>
              <button onClick={remove} className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
                Excluir
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {[
            [
              "Identificação da Representação",
              [
                ["ID", item.id],
                ["Nº PPE / Procedimento relacionado", item.numero_ppe],
                ["Nº Processo Judicial", item.processo_judicial],
                ["Tipo de Representação", item.tipo],
                ["Data da Representação", item.data_representacao],
                ["Responsável pela Representação", item.responsavel],
              ],
            ],
            [
              "Pessoas Envolvidas",
              [
                ["Vítima", item.vitima],
                ["Investigado / Representado", item.investigado],
                ["Autor preso?", item.autor_preso],
              ],
            ],
            [
              "Fundamentação e Finalidade",
              [
                ["Resumo dos fatos", item.resumo_fatos],
                ["Fundamentação da medida", item.fundamentacao],
                ["Objetivo da representação", item.objetivo],
                ["Diligências relacionadas", item.diligencias_relacionadas],
              ],
            ],
            [
              "Tramitação Judicial",
              [
                ["Status", item.status],
                ["Data de envio ao Judiciário", item.data_envio_judiciario],
                ["Data da decisão", item.data_decisao_judicial],
                ["Observações da decisão", item.observacoes_decisao],
              ],
            ],
            [
              "Controle Interno",
              [
                ["Prioridade operacional", item.prioridade_operacional],
                ["Pedido sigiloso", item.pedido_sigiloso],
                ["Observações internas", item.observacoes_internas],
              ],
            ],
          ].map(([title, items]) => (
            <article key={String(title)} className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">{String(title)}</h2>
              <div className="space-y-2">
                {(items as string[][]).map(([label, value]) => (
                  <p key={label} className="text-sm whitespace-pre-wrap break-words">
                    <span className="text-muted-foreground">{label}: </span>
                    {value || "—"}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </AppLayout>
  );
}
