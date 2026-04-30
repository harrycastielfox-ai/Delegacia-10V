import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { getInqueritoByCaseId } from "@/data/inqueritos";

export const Route = createFileRoute("/inqueritos/$caseId")({
  component: InqueritoDetalhes,
});

function InqueritoDetalhes() {
  const { caseId } = Route.useParams();
  const caso = getInqueritoByCaseId(caseId);

  if (!caso) {
    return (
      <AppLayout>
        <PageHeader title="Inquérito não encontrado" subtitle="Verifique o registro e tente novamente." />
        <Link to="/inqueritos" className="inline-flex rounded-md border border-border bg-card px-4 py-2 text-sm hover:bg-accent">
          Voltar para Inquéritos
        </Link>
      </AppLayout>
    );
  }

  const fields = [
    ["PPE", caso.ppe],
    ["Nº Físico", caso.numeroFisico],
    ["Nº B.O.", caso.numeroBo],
    ["Prioridade", caso.prioridade],
    ["Data do Fato", caso.dataFato],
    ["Data de Instauração", caso.dataInstauracao],
    ["Prazo", caso.prazo],
    ["Data Limite", caso.dataLimite],
    ["Dias Corridos", String(caso.diasCorridos)],
    ["Tipificação", caso.tipificacao],
    ["Gravidade", caso.gravidade],
    ["Tipo", caso.tipo],
    ["Réu Preso", caso.reuPreso ? "Sim" : "Não"],
    ["Vítima", caso.vitima],
    ["Autor/Investigado", caso.autorInvestigado],
    ["Autor Determinado/Indeterminado", caso.autorDeterminado],
    ["Vinculado a Facção", caso.vinculadoFaccao],
    ["Nome da Facção", caso.nomeFaccao],
    ["Bairro/Distrito", caso.bairroDistrito],
    ["Motivação", caso.motivacao],
    ["Equipe Responsável", caso.equipeResponsavel],
    ["Escrivão", caso.escrivao],
    ["Situação", caso.situacao],
    ["Status Diligências", caso.statusDiligencias],
    ["Diligências Pendentes", caso.diligenciasPendentes],
    ["Última Atualização", caso.ultimaAtualizacao],
    ["Medida Protetiva", caso.medidaProtetiva],
    ["Nº Processo Medida", caso.numeroProcessoMedida],
    ["Relatório Enviado", caso.relatorioEnviado],
    ["Data Envio Relatório", caso.dataEnvioRelatorio],
    ["Observações", caso.observacoes],
    ["Visibilidade", caso.visibilidade],
  ] as const;

  return (
    <AppLayout>
      <PageHeader title={`Inquérito ${caso.ppe}`} subtitle="Visualização operacional do procedimento" />

      <div className="mb-4 flex flex-wrap gap-2">
        <button className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent">Gerar PDF</button>
        <button className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent">Movimentar</button>
        <button className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent">Editar</button>
        <button className="rounded-md border border-destructive/30 bg-destructive/15 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/20">Excluir</button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border/70 bg-muted/10 p-3">
              <div className="text-[10px] font-bold tracking-[0.12em] text-muted-foreground">{label.toUpperCase()}</div>
              <div className="mt-1 text-sm text-foreground">{value?.trim() ? value : "—"}</div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
