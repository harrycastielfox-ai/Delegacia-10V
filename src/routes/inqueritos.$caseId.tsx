import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { getInqueritoById, softDeleteInquerito, type InqueritoRecord } from "@/lib/repositories/inqueritosRepository";

export const Route = createFileRoute("/inqueritos/$caseId")({ component: InqueritoDetalhes });

type InqueritoDetalheUI = {
  id: string;
  numeroPpe: string;
  tipificacao: string;
  numeroFisico: string;
  numeroBo: string;
  tipo: string;
  situacao: string;
  prioridade: string;
  gravidade: string;
  dataFato: string;
  dataInstauracao: string;
  prazo: string;
  bairro: string;
  vitima: string;
  investigado: string;
  reuPreso: string;
  elucidado: string;
  houveArmaFogo: string;
  armaUtilizada: string;
  equipe: string;
  escrivao: string;
  faccao: string;
  nomeFaccao: string;
  statusDiligencias: string;
  relatorioEnviado: string;
  dataEnvioRelatorio: string;
  medidaProtetiva: string;
  numeroProcessoMedida: string;
  observacoes: string;
};

const FALLBACK = "—";

function pick(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value);
    }
  }
  return FALLBACK;
}

function normalizeInqueritoForDetail(caso: InqueritoRecord): InqueritoDetalheUI {
  const raw = caso as unknown as Record<string, unknown>;
  return {
    id: caso.id,
    numeroPpe: pick(raw, "numero_ppe", "numeroPpe"),
    tipificacao: pick(raw, "tipificacao"),
    numeroFisico: pick(raw, "numero_fisico", "numeroFisico"),
    numeroBo: pick(raw, "numero_bo", "numeroBo"),
    tipo: pick(raw, "tipo"),
    situacao: pick(raw, "situacao"),
    prioridade: pick(raw, "prioridade"),
    gravidade: pick(raw, "gravidade"),
    dataFato: pick(raw, "data_fato", "dataFato"),
    dataInstauracao: pick(raw, "data_instauracao", "dataInstauracao"),
    prazo: pick(raw, "prazo"),
    bairro: pick(raw, "bairro", "bairroDistrito"),
    vitima: pick(raw, "vitima"),
    investigado: pick(raw, "investigado", "autorInvestigado"),
    reuPreso: pick(raw, "reu_preso", "reuPreso"),
    elucidado: pick(raw, "elucidado"),
    houveArmaFogo: pick(raw, "houve_arma_fogo", "houveArmaFogo"),
    armaUtilizada: pick(raw, "arma_utilizada", "armaUtilizada"),
    equipe: pick(raw, "equipe", "equipeResponsavel"),
    escrivao: pick(raw, "escrivao"),
    faccao: pick(raw, "faccao"),
    nomeFaccao: pick(raw, "nome_faccao", "nomeFaccao"),
    statusDiligencias: pick(raw, "status_diligencias", "statusDiligencias"),
    relatorioEnviado: pick(raw, "relatorio_enviado", "relatorioEnviado"),
    dataEnvioRelatorio: pick(raw, "data_envio_relatorio", "dataEnvioRelatorio"),
    medidaProtetiva: pick(raw, "medida_protetiva", "medidaProtetiva"),
    numeroProcessoMedida: pick(raw, "numero_processo_medida", "numeroProcessoMedida"),
    observacoes: pick(raw, "observacoes"),
  };
}

function InqueritoDetalhes() {
  const { caseId } = Route.useParams();
  const navigate = useNavigate();
  const [caso, setCaso] = useState<InqueritoRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setCaso(await getInqueritoById(caseId));
      } finally {
        setLoading(false);
      }
    })();
  }, [caseId]);

  const detalhe = useMemo(() => (caso ? normalizeInqueritoForDetail(caso) : null), [caso]);

  if (loading) return <AppLayout><div className="text-sm text-muted-foreground">Carregando…</div></AppLayout>;
  if (!caso || !detalhe) return <AppLayout><div className="space-y-4"><h1 className="text-xl font-bold">Inquérito não encontrado</h1><Link to="/inqueritos" className="px-4 py-2 border border-border rounded-lg inline-block">Voltar</Link></div></AppLayout>;

  const remove = async () => {
    if (!confirm("Deseja remover este inquérito?")) return;
    await softDeleteInquerito(caso.id);
    navigate({ to: "/inqueritos" });
  };

  return <AppLayout><div className="space-y-4"><header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="space-y-1.5"><div className="flex items-center gap-2.5"><Link to="/inqueritos" className="rounded-md border border-border bg-card px-2.5 py-1.5 text-sm hover:bg-accent">←</Link><h1 className="text-2xl font-bold leading-tight">{detalhe.numeroPpe}</h1></div><p className="text-sm text-muted-foreground">{detalhe.tipificacao}</p></div><div className="flex gap-2"><button onClick={() => window.print()} className="px-3 py-1.5 text-xs rounded-md border border-border bg-card hover:bg-accent">Gerar PDF</button><button onClick={() => navigate({ to: "/inqueritos/$caseId/editar", params: { caseId: caso.id } })} className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground font-semibold">Editar</button><button onClick={remove} className="px-3 py-1.5 text-xs rounded-md border border-destructive/30 bg-destructive/10 text-destructive">Excluir</button></div></header>

    <section className="grid md:grid-cols-2 gap-4">
      <InfoCard title="Dados Gerais" items={[["Nº PPE", detalhe.numeroPpe], ["Nº Físico", detalhe.numeroFisico], ["Nº B.O.", detalhe.numeroBo], ["Tipo", detalhe.tipo], ["Data do Fato", detalhe.dataFato], ["Data Instauração", detalhe.dataInstauracao], ["Prazo", detalhe.prazo], ["Situação", detalhe.situacao]]} />
      <InfoCard title="Classificação" items={[["Tipificação", detalhe.tipificacao], ["Prioridade", detalhe.prioridade], ["Gravidade", detalhe.gravidade], ["Elucidado", detalhe.elucidado], ["Houve arma de fogo", detalhe.houveArmaFogo], ["Arma utilizada", detalhe.armaUtilizada], ["Vinculado a facção", detalhe.faccao], ["Nome da facção", detalhe.nomeFaccao]]} />
      <InfoCard title="Pessoas Envolvidas" items={[["Vítima", detalhe.vitima], ["Investigado", detalhe.investigado], ["Réu preso", detalhe.reuPreso], ["Bairro", detalhe.bairro]]} />
      <InfoCard title="Dados Operacionais" items={[["Equipe", detalhe.equipe], ["Escrivão", detalhe.escrivao], ["Status diligências", detalhe.statusDiligencias], ["Relatório enviado", detalhe.relatorioEnviado], ["Data envio relatório", detalhe.dataEnvioRelatorio], ["Medida protetiva", detalhe.medidaProtetiva], ["Nº processo medida", detalhe.numeroProcessoMedida], ["Observações", detalhe.observacoes]]} />
    </section></div></AppLayout>;
}

function InfoCard({ title, items }: { title: string; items: [string, string][] }) {
  return <article className="rounded-xl border border-border bg-card p-4"><h2 className="text-xs tracking-[0.2em] text-primary font-bold mb-3 uppercase">{title}</h2><div className="space-y-2">{items.map(([k, v]) => <p key={k} className="text-sm"><span className="text-muted-foreground">{k}: </span>{v || FALLBACK}</p>)}</div></article>;
}
