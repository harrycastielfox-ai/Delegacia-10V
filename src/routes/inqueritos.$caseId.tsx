import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { getInqueritoById, softDeleteInquerito, type InqueritoRecord } from "@/lib/repositories/inqueritosRepository";
import { BookOpen, FileSearch, Scale, UserRound, ShieldCheck, NotebookPen } from "lucide-react";

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
  autoriaDeterminada: string;
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
    autoriaDeterminada: pick(raw, "autoria_determinada", "autoriaDeterminada"),
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
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

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
    try {
      setDeleting(true);
      setDeleteError(null);
      setDeleteSuccess(null);
      await softDeleteInquerito(caso.id);
      setDeleteSuccess("Inquérito excluído com sucesso.");
      navigate({ to: "/inqueritos" });
    } catch (error) {
      const message = typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
        ? error.message
        : "Erro desconhecido";
      const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "";
      const details = typeof error === "object" && error !== null && "details" in error && typeof error.details === "string" ? error.details : "";
      const hint = typeof error === "object" && error !== null && "hint" in error && typeof error.hint === "string" ? error.hint : "";
      setDeleteError(`Falha ao excluir inquérito (${message}${code ? ` | code: ${code}` : ""}${details ? ` | details: ${details}` : ""}${hint ? ` | hint: ${hint}` : ""})`);
    } finally {
      setDeleting(false);
    }
  };

  const badges = [
    ["Prioridade", detalhe.prioridade],
    ["Situação", detalhe.situacao],
    ["Gravidade", detalhe.gravidade],
    ["Tipo", detalhe.tipo],
    ["Status diligências", detalhe.statusDiligencias],
    ["Elucidado", detalhe.elucidado],
  ] as const;

  return <AppLayout><div className="mx-auto w-full max-w-7xl space-y-5">
    <header className="rounded-xl border border-border/70 bg-card/70 p-4 lg:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 space-y-2">
          <Link to="/inqueritos" className="inline-flex w-fit items-center rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent">← Voltar</Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground break-words">{detalhe.numeroPpe}</h1>
          <p className="text-sm text-muted-foreground leading-6 break-words line-clamp-3">{detalhe.tipificacao}</p>
          {detalhe.ultimaEdicao !== FALLBACK && <p className="text-xs text-muted-foreground">Última edição: {detalhe.ultimaEdicao}</p>}
        </div>
        <div className="flex w-full flex-wrap items-center justify-start gap-2 xl:w-auto xl:justify-end">
          <button onClick={() => window.print()} className="px-3 py-1.5 text-xs rounded-md border border-border bg-card hover:bg-accent">Gerar PDF</button>
          <button onClick={() => navigate({ to: "/inqueritos/$caseId/editar", params: { caseId: caso.id } })} className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground font-semibold">Editar</button>
          <button onClick={remove} disabled={deleting} className="px-3 py-1.5 text-xs rounded-md border border-destructive/30 bg-destructive/10 text-destructive disabled:cursor-not-allowed disabled:opacity-70">{deleting ? "Excluindo..." : "Excluir"}</button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {badges.map(([label, value]) => (
          <span key={label} className="inline-flex rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">
            {label}: {value || FALLBACK}
          </span>
        ))}
        {detalhe.prazo !== FALLBACK && new Date(detalhe.prazo) < new Date() && <span className="rounded-md bg-red-100 px-2 py-1 text-[10px] font-semibold text-red-800 dark:bg-red-900/40 dark:text-red-100">Vencido</span>}
      </div>
      {deleteSuccess && <p className="mt-3 rounded-lg border border-success/40 bg-success/10 px-3 py-1.5 text-xs text-success">{deleteSuccess}</p>}
      {deleteError && <p className="mt-3 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">{deleteError}</p>}
    </header>

    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <InfoCard title="Dados Gerais" icon={<BookOpen className="h-4 w-4 text-primary" />} items={[["Nº PPE", detalhe.numeroPpe], ["Nº físico", detalhe.numeroFisico], ["Nº BO", detalhe.numeroBo], ["Data do fato", detalhe.dataFato], ["Data de instauração", detalhe.dataInstauracao], ["Prazo", detalhe.prazo], ["Data limite", detalhe.prazo], ["Dias corridos", detalhe.diasDecorridos]]} />
      <InfoCard title="Classificação" icon={<FileSearch className="h-4 w-4 text-primary" />} items={[["Tipificação", detalhe.tipificacao], ["Prioridade", detalhe.prioridade], ["Gravidade", detalhe.gravidade], ["Tipo", detalhe.tipo], ["Situação", detalhe.situacao], ["Elucidado", detalhe.elucidado], ["Houve arma de fogo?", detalhe.houveArmaFogo], ["Arma utilizada", detalhe.armaUtilizada], ["Vinculado à facção?", detalhe.vinculadoFaccao], ["Nome da facção", detalhe.nomeFaccao]]} />
      <InfoCard title="Pessoas Envolvidas" icon={<UserRound className="h-4 w-4 text-primary" />} items={[["Vítima", detalhe.vitima], ["Autor / Investigado", detalhe.investigado], ["Autoria determinada ou indeterminada", detalhe.autoriaDeterminada], ["Réu preso", detalhe.reuPreso], ["Motivação", detalhe.motivacao]]} />
      <InfoCard title="Dados Operacionais" icon={<ShieldCheck className="h-4 w-4 text-primary" />} items={[["Delegado responsável", detalhe.delegadoResponsavel], ["Equipe", detalhe.equipe], ["Escrivão", detalhe.escrivao], ["Bairro", detalhe.bairro], ["Distrito", detalhe.distrito], ["Status diligências", detalhe.statusDiligencias], ["Última atualização", detalhe.ultimaEdicao]]} />
      <InfoCard title="Relatório e Jurídico" icon={<Scale className="h-4 w-4 text-primary" />} items={[["Relatório enviado?", detalhe.relatorioEnviado], ["Data envio relatório", detalhe.dataEnvioRelatorio], ["Medida protetiva?", detalhe.medidaProtetiva], ["Nº processo medida", detalhe.numeroProcessoMedida], ["Qtd. representações", detalhe.representacoesLegais]]} />
      <InfoCard title="Observações" icon={<NotebookPen className="h-4 w-4 text-primary" />} items={[["Observações", detalhe.observacoes], ["Diligências pendentes", detalhe.diligenciasPendentes]]} />
    </section>
  </div></AppLayout>;
}

function InfoCard({ title, items, icon }: { title: string; items: [string, string][]; icon?: React.ReactNode }) {
  return <article className="rounded-xl border border-border/60 bg-card/80 p-4 lg:p-5">
    <div className="flex items-center gap-2 pb-2">
      {icon}
      <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">{title}</h2>
    </div>
    <div className="mb-3 h-px w-full bg-border/70" />
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{k}</p>
          <p className="text-sm leading-5 text-foreground break-words">{v || FALLBACK}</p>
        </div>
      ))}
    </div>
  </article>;
}
