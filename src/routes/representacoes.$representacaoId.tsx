import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { formatRepresentacaoId, loadRepresentacoes, saveRepresentacoes } from "@/lib/casesLocalState";

export const Route = createFileRoute("/representacoes/$representacaoId")({ component: DetalheRepresentacao });

function DetalheRepresentacao() {
  const { representacaoId } = Route.useParams();
  const navigate = useNavigate();
  const item = loadRepresentacoes().find((r) => r.id === representacaoId);

  if (!item) return <AppLayout>Representação não encontrada.</AppLayout>;

  const remove = () => {
    if (!confirm("Deseja remover esta representação? No sistema final, esta ação deverá ser registrada em auditoria.")) return;
    saveRepresentacoes(loadRepresentacoes().filter((r) => r.id !== item.id));
    navigate({ to: "/representacoes" });
  };

  const subtitleParts = [item.tipo, item.processo ? `Processo: ${item.processo}` : ""].filter(Boolean);

  return (
    <AppLayout>
      <div className="space-y-5">
        <header className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <Link to="/representacoes" className="mb-3 inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent/40">
                ← Voltar para lista
              </Link>
              <h1 className="text-2xl font-extrabold break-words">{item.ppe ? `Representação ${item.ppe}` : "Representação"}</h1>
              <p className="mt-1 text-sm text-muted-foreground break-words">
                {subtitleParts.length > 0 ? subtitleParts.join(" • ") : "Detalhes da representação cadastrada"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">ID interno: {formatRepresentacaoId(item.id)}</p>
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
                ["ID", formatRepresentacaoId(item.id)],
                ["Nº PPE / Procedimento relacionado", item.ppe],
                ["Nº Processo Judicial", item.processo],
                ["Tipo de Representação", item.tipo],
                ["Data da Representação", item.data],
                ["Responsável pela Representação", "—"],
              ],
            ],
            [
              "Pessoas Envolvidas",
              [
                ["Vítima", item.vitima],
                ["Investigado / Representado", item.investigado],
                ["Autor preso?", "Não informado"],
              ],
            ],
            [
              "Fundamentação e Finalidade",
              [
                ["Resumo dos fatos", "—"],
                ["Fundamentação da medida", "—"],
                ["Objetivo da representação", "—"],
                ["Diligências relacionadas", "—"],
              ],
            ],
            [
              "Tramitação Judicial",
              [
                ["Status", item.status],
                ["Data de envio ao Judiciário", "—"],
                ["Data da decisão", "—"],
                ["Observações da decisão", "—"],
              ],
            ],
            [
              "Controle Interno",
              [
                ["Prioridade operacional", "—"],
                ["Pedido sigiloso", "—"],
                ["Observações internas", "—"],
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
