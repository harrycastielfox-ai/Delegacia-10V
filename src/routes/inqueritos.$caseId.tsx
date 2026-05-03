import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { getInqueritoById, softDeleteInquerito, type InqueritoRecord } from "@/lib/repositories/inqueritosRepository";

export const Route = createFileRoute("/inqueritos/$caseId")({ component: InqueritoDetalhes });

type InqueritoDetalheUI = {
  id: string;
  numeroPpe: string;
  idInterno: string;
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
  diasDecorridos: string;
  ultimaEdicao: string;
  delegadoResponsavel: string;
  bairro: string;
  distrito: string;
  vitima: string;
  investigado: string;
  reuPreso: string;
  elucidado: string;
  houveArmaFogo: string;
  armaUtilizada: string;
  equipe: string;
  escrivao: string;
  vinculadoFaccao: string;
  nomeFaccao: string;
  statusDiligencias: string;
  relatorioEnviado: string;
  dataEnvioRelatorio: string;
  medidaProtetiva: string;
  numeroProcessoMedida: string;
  motivacao: string;
  observacoes: string;
  diligenciasPendentes: string;
  representacoesLegais: string;
  historicoAlteracoes: string;
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
    idInterno: caso.id,
    numeroPpe: pick(raw, "numero_ppe", "numeroPpe", "ppe"),
    tipificacao: pick(raw, "tipificacao"),
    numeroFisico: pick(raw, "numero_fisico", "numeroFisico"),
    numeroBo: pick(raw, "numero_bo", "numeroBo"),
    tipo: pick(raw, "tipo"),
    situacao: pick(raw, "situacao", "status_diligencias"),
    prioridade: pick(raw, "prioridade"),
    gravidade: pick(raw, "gravidade"),
    dataFato: pick(raw, "data_fato", "dataFato"),
    dataInstauracao: pick(raw, "data_instauracao", "dataInstauracao"),
    prazo: pick(raw, "prazo"),
    diasDecorridos: pick(raw, "dias_decorridos", "diasDecorridos"),
    ultimaEdicao: pick(raw, "updated_at", "updatedAt", "ultima_edicao", "ultimaEdicao"),
    delegadoResponsavel: pick(raw, "delegado_responsavel", "delegadoResponsavel"),
    bairro: pick(raw, "bairro", "bairroDistrito"),
    distrito: pick(raw, "distrito"),
    vitima: pick(raw, "vitima"),
    investigado: pick(raw, "investigado", "suspeito", "autor_investigado", "autorInvestigado"),
    reuPreso: pick(raw, "reu_preso", "reuPreso"),
    elucidado: pick(raw, "elucidado"),
    houveArmaFogo: pick(raw, "houve_arma_fogo", "houveArmaFogo"),
    armaUtilizada: pick(raw, "arma_utilizada", "armaUtilizada"),
    equipe: pick(raw, "equipe", "equipeResponsavel"),
    escrivao: pick(raw, "escrivao"),
    vinculadoFaccao: pick(raw, "vinculado_faccao", "vinculadoFaccao", "faccao"),
    nomeFaccao: pick(raw, "nome_faccao", "nomeFaccao"),
    statusDiligencias: pick(raw, "status_diligencias", "situacao", "statusDiligencias"),
    relatorioEnviado: pick(raw, "relatorio_enviado", "relatorioEnviado"),
    dataEnvioRelatorio: pick(raw, "data_envio_relatorio", "dataEnvioRelatorio"),
    medidaProtetiva: pick(raw, "medida_protetiva", "medidaProtetiva"),
    numeroProcessoMedida: pick(raw, "numero_processo_medida", "numeroProcessoMedida"),
    motivacao: pick(raw, "motivacao"),
    observacoes: pick(raw, "observacoes"),
    diligenciasPendentes: pick(raw, "diligencias_pendentes", "diligenciasPendentes"),
    representacoesLegais: pick(raw, "representacoes_legais", "representacoesLegais"),
    historicoAlteracoes: pick(raw, "historico_alteracoes", "historicoAlteracoes"),
  };
}

function InqueritoDetalhes() {
  const { caseId } = Route.useParams();
  const navigate = useNavigate();
  const [caso, setCaso] = useState<InqueritoRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setErro("");
        const inquerito = await getInqueritoById(caseId);
        setCaso(inquerito);
      } catch (error) {
        const message = typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
          ? error.message
          : "Erro desconhecido";
        setErro(`Falha ao carregar detalhe do inquérito (${message})`);
      } finally {
        setLoading(false);
      }
    })();
  }, [caseId]);

  const detalhe = useMemo(() => (caso ? normalizeInqueritoForDetail(caso) : null), [caso]);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isEditingChildRoute = pathname.endsWith("/editar");

  if (isEditingChildRoute) return <Outlet />;

  if (loading) return <AppLayout><div className="text-sm text-muted-foreground">Carregando…</div></AppLayout>;
  if (erro) return <AppLayout><div className="space-y-4"><p className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">{erro}</p><Link to="/inqueritos" className="px-4 py-2 border border-border rounded-lg inline-block">Voltar</Link></div></AppLayout>;
  if (!caso || !detalhe) return <AppLayout><div className="space-y-4"><h1 className="text-xl font-bold">Inquérito não encontrado</h1><Link to="/inqueritos" className="px-4 py-2 border border-border rounded-lg inline-block">Voltar</Link></div></AppLayout>;

  const remove = async () => {
    if (!confirm("Deseja remover este inquérito?")) return;
    await softDeleteInquerito(caso.id);
    navigate({ to: "/inqueritos" });
  };

  const badges = [
    ["Prioridade", detalhe.prioridade, "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100"],
    ["Situação", detalhe.situacao, "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-100"],
    ["Gravidade", detalhe.gravidade, "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-100"],
    ["Tipo", detalhe.tipo, "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-100"],
    ["Status diligências", detalhe.statusDiligencias, "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-100"],
    ["Elucidado", detalhe.elucidado, "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100"],
  ] as const;

  return <AppLayout><div className="space-y-3"><header className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between"><div className="space-y-1.5"><div className="flex items-center gap-2"><Link to="/inqueritos" className="rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-accent">← Voltar</Link><h1 className="text-lg font-semibold leading-tight">{detalhe.numeroPpe}</h1></div><p className="text-xs text-muted-foreground">{detalhe.tipificacao}</p>{detalhe.ultimaEdicao !== FALLBACK && <p className="text-[11px] text-muted-foreground">Última edição: {detalhe.ultimaEdicao}</p>}<div className="flex flex-wrap gap-1.5 pt-0.5">{badges.map(([label, value, style]) => <span key={label} className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${style}`}>{label}: {value}</span>)}{detalhe.prazo !== FALLBACK && new Date(detalhe.prazo) < new Date() && <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800 dark:bg-red-900/40 dark:text-red-100">Vencido</span>}</div></div><div className="flex gap-2"><button onClick={() => window.print()} className="px-3 py-1.5 text-xs rounded-md border border-border bg-card hover:bg-accent">Gerar PDF</button><button onClick={() => navigate({ to: "/inqueritos/$caseId/editar", params: { caseId: caso.id } })} className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground font-semibold">Editar</button><button onClick={remove} className="px-3 py-1.5 text-xs rounded-md border border-destructive/30 bg-destructive/10 text-destructive">Excluir</button></div></header>

    <section className="grid gap-3 md:grid-cols-2">
      <InfoCard title="Dados Gerais" items={[["Nº PPE", detalhe.numeroPpe], ["Nº físico", detalhe.numeroFisico], ["Nº BO", detalhe.numeroBo], ["Data do fato", detalhe.dataFato], ["Data instauração", detalhe.dataInstauracao], ["Prazo", detalhe.prazo], ["Dias decorridos", detalhe.diasDecorridos], ["Situação", detalhe.situacao]]} />
      <InfoCard title="Classificação" items={[["Tipificação", detalhe.tipificacao], ["Prioridade", detalhe.prioridade], ["Gravidade", detalhe.gravidade], ["Tipo", detalhe.tipo], ["Elucidado", detalhe.elucidado], ["Houve arma de fogo", detalhe.houveArmaFogo], ["Arma utilizada", detalhe.armaUtilizada], ["Vinculado à facção", detalhe.vinculadoFaccao], ["Nome da facção", detalhe.nomeFaccao]]} />
      <InfoCard title="Pessoas Envolvidas" items={[["Vítima", detalhe.vitima], ["Suspeito / Investigado", detalhe.investigado], ["Réu preso", detalhe.reuPreso]]} />
      <InfoCard title="Dados Operacionais" items={[["Delegado responsável", detalhe.delegadoResponsavel], ["Equipe", detalhe.equipe], ["Escrivão", detalhe.escrivao], ["Bairro", detalhe.bairro], ["Distrito", detalhe.distrito], ["Status diligências", detalhe.statusDiligencias], ["Motivação", detalhe.motivacao]]} />
      <InfoCard title="Diligências Pendentes" items={[["Diligências pendentes", detalhe.diligenciasPendentes]]} />
      <InfoCard title="Observações" items={[["Observações", detalhe.observacoes]]} />
      <InfoCard title="Relatório e Jurídico" items={[["Relatório enviado", detalhe.relatorioEnviado], ["Data envio relatório", detalhe.dataEnvioRelatorio], ["Medida protetiva", detalhe.medidaProtetiva], ["Nº processo medida", detalhe.numeroProcessoMedida], ["Representações legais", detalhe.representacoesLegais]]} />
      {detalhe.historicoAlteracoes !== FALLBACK && <InfoCard title="Histórico de Alterações" items={[["Histórico", detalhe.historicoAlteracoes]]} />}
    </section></div></AppLayout>;
}

function InfoCard({ title, items }: { title: string; items: [string, string][] }) {
  return <article className="rounded-lg border border-border bg-card p-3"><h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{title}</h2><div className="space-y-1.5">{items.map(([k, v]) => <p key={k} className="text-xs leading-5"><span className="text-muted-foreground">{k}: </span>{v || FALLBACK}</p>)}</div></article>;
}
