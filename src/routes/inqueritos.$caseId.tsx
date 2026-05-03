import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { loadInqueritos, saveInqueritos } from "@/lib/casesLocalState";
import { buscarInqueritoPorId, type InqueritoListItem } from "@/lib/inqueritosRepository";

export const Route = createFileRoute("/inqueritos/$caseId")({
  component: InqueritoDetalhes,
});

function InqueritoDetalhes() {
  const { caseId } = Route.useParams();
  const navigate = useNavigate();

  const [caso, setCaso] = useState<InqueritoListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function carregarDetalhes() {
      setIsLoading(true);

      const data = await buscarInqueritoPorId(caseId);

      if (!ignore) {
        setCaso(data);
        setIsLoading(false);
      }
    }

    carregarDetalhes();

    return () => {
      ignore = true;
    };
  }, [caseId]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Carregando detalhes do inquérito...
        </div>
      </AppLayout>
    );
  }

  if (!caso) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <h1 className="text-xl font-bold">Inquérito não encontrado</h1>
          <Link to="/inqueritos" className="px-4 py-2 border border-border rounded-lg inline-block">
            Voltar
          </Link>
        </div>
      </AppLayout>
    );
  }

  const remove = () => {
    if (!confirm("Deseja remover este inquérito? No sistema final, esta ação deverá ser registrada em auditoria.")) {
      return;
    }

    if (import.meta.env.VITE_DATA_SOURCE === "supabase") {
      alert("Exclusão no Supabase ainda não foi ativada. Nesta fase estamos testando apenas leitura.");
      return;
    }

    saveInqueritos(loadInqueritos().filter((item) => item.id !== caso.id));
    navigate({ to: "/inqueritos" });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link to="/inqueritos" className="text-xs border border-border rounded-md px-3 py-1.5 inline-block mb-3 hover:bg-accent">
              ← Voltar para lista
            </Link>

            <h1 className="text-2xl font-extrabold">Inquérito {caso.id}</h1>

            <p className="text-sm text-muted-foreground">
              PPE vinculado: {caso.ppe} • Última edição: {caso.ultimaAtualizacao || "não registrada"}
            </p>

            <div className="mt-3 flex gap-2">
              <span className="px-2 py-1 text-[10px] rounded border border-info/30 bg-info/10">
                {caso.statusDiligencias}
              </span>
              <span className="px-2 py-1 text-[10px] rounded border border-warning/30 bg-warning/10">
                {caso.prioridade}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => window.print()} className="px-3 py-2 text-xs rounded-md border border-border hover:bg-accent">
              Imprimir
            </button>

            <button
              onClick={() => navigate({ to: "/inqueritos/$caseId/editar", params: { caseId: caso.id } })}
              className="px-3 py-2 text-xs rounded-md border border-border hover:bg-accent"
            >
              Editar
            </button>

            <button onClick={remove} className="px-3 py-2 text-xs rounded-md border border-destructive/30 bg-destructive/10 text-destructive">
              Excluir
            </button>
          </div>
        </header>

        <section className="grid md:grid-cols-2 gap-4">
          <DetailCard
            title="Dados Gerais"
            items={[
              ["ID", caso.id],
              ["Nº PPE", caso.ppe],
              ["Nº físico", caso.numeroFisico],
              ["Nº BO", caso.numeroBo],
              ["Data da instauração", caso.dataInstauracao],
              ["Data do fato", caso.dataFato],
              ["Prazo", caso.prazo],
              ["Dias decorridos", `${caso.diasCorridos}`],
            ]}
          />

          <DetailCard
            title="Classificação"
            items={[
              ["Tipificação", caso.tipificacao],
              ["Gravidade", caso.gravidade],
              ["Tipo", caso.tipo],
              ["Prioridade", caso.prioridade],
              ["Elucidado", caso.autorDeterminado],
              ["Arma utilizada", caso.motivacao],
            ]}
          />

          <DetailCard
            title="Pessoas Envolvidas"
            items={[
              ["Vítima", caso.vitima],
              ["Investigado / autor", caso.autorInvestigado],
              ["Réu preso", caso.reuPreso ? "Sim" : "Não"],
            ]}
          />

          <DetailCard
            title="Dados Operacionais"
            items={[
              ["Situação", caso.situacao],
              ["Status diligências", caso.statusDiligencias],
              ["Bairro / distrito", caso.bairroDistrito],
              ["Equipe", caso.equipeResponsavel],
              ["Escrivão", caso.escrivao],
              ["Facção?", caso.vinculadoFaccao],
              ["Nome da facção", caso.nomeFaccao],
            ]}
          />

          <DetailCard
            title="Relatório e Jurídico"
            items={[
              ["Relatório enviado?", caso.relatorioEnviado],
              ["Data envio relatório", caso.dataEnvioRelatorio],
              ["Medida protetiva?", caso.medidaProtetiva],
              ["Nº processo medida", caso.numeroProcessoMedida],
              ["Qtd representações", "—"],
              ["Observações", caso.observacoes],
            ]}
          />
        </section>
      </div>
    </AppLayout>
  );
}

function DetailCard({ title, items }: { title: string; items: Array<[string, string | number | boolean | undefined]> }) {
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-xs tracking-[0.2em] text-primary font-bold mb-3 uppercase">{title}</h2>

      <div className="space-y-2">
        {items.map(([label, value]) => (
          <p key={label} className="text-sm">
            <span className="text-muted-foreground">{label}: </span>
            {value || "—"}
          </p>
        ))}
      </div>
    </article>
  );
}