import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { getRepresentacaoById, updateRepresentacao } from "@/lib/repositories/representacoesRepository";
import { logAuditoria } from "@/lib/repositories/auditoriaRepository";
import { getCurrentProfile } from "@/lib/auth";
import { canEditRepresentacoes, type UserProfile } from "@/lib/authz";

export const Route = createFileRoute("/representacoes/$representacaoId/editar")({
  head: () => ({ meta: [{ title: "Editar Representação — SIPI" }] }),
  component: EditarRepresentacao,
});

const tiposRepresentacao = ["Prisão Temporária", "Prisão Preventiva", "Busca e Apreensão", "Busca e Apreensão Domiciliar", "Quebra de Sigilo / Interceptação", "Interceptação Telefônica", "Medida Protetiva", "Outra"] as const;
const statusRepresentacao = ["Em elaboração", "Enviada ao Judiciário", "Aguardando análise judicial", "Deferida", "Indeferida", "Cumprida", "Cumprida parcialmente", "Revogada / Prejudicada"] as const;
const statusComDecisao = new Set(["Deferida", "Indeferida", "Cumprida", "Cumprida parcialmente", "Revogada / Prejudicada"]);
const statusComCumprimento = new Set(["Cumprida", "Cumprida parcialmente"]);

function EditarRepresentacao() {
  const { representacaoId } = Route.useParams();
  const navigate = useNavigate();

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [erro, setErro] = useState("");
  const [naoEncontrada, setNaoEncontrada] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [restricted, setRestricted] = useState(false);

  const [ppe, setPpe] = useState("");
  const [processo, setProcesso] = useState("");
  const [tipoRepresentacao, setTipoRepresentacao] = useState("");
  const [tipoOutra, setTipoOutra] = useState("");
  const [dataRepresentacao, setDataRepresentacao] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [vitima, setVitima] = useState("");
  const [investigado, setInvestigado] = useState("");
  const [autorPreso, setAutorPreso] = useState("");
  const [resumoFatos, setResumoFatos] = useState("");
  const [fundamentacao, setFundamentacao] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [diligenciasRelacionadas, setDiligenciasRelacionadas] = useState("");
  const [status, setStatus] = useState("");
  const [dataEnvioJudiciario, setDataEnvioJudiciario] = useState("");
  const [dataDecisaoJudicial, setDataDecisaoJudicial] = useState("");
  const [observacoesDecisao, setObservacoesDecisao] = useState("");
  const [dataCumprimento, setDataCumprimento] = useState("");
  const [equipeCumprimento, setEquipeCumprimento] = useState("");
  const [resultadoCumprimento, setResultadoCumprimento] = useState("");
  const [observacoesCumprimento, setObservacoesCumprimento] = useState("");
  const [prioridadeOperacional, setPrioridadeOperacional] = useState("");
  const [pedidoSigiloso, setPedidoSigiloso] = useState("");
  const [observacoesInternas, setObservacoesInternas] = useState("");

  const exibeCampoOutra = tipoRepresentacao === "Outra";
  const exibeDataDecisao = useMemo(() => statusComDecisao.has(status), [status]);
  const exibeBlocoCumprimento = useMemo(() => statusComCumprimento.has(status), [status]);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoadingInitial(true);
      setErro("");
      setNaoEncontrada(false);

      try {
        const currentProfile = await getCurrentProfile();
        setProfile(currentProfile);
        if (!canEditRepresentacoes(currentProfile)) {
          setRestricted(true);
          return;
        }
        setRestricted(false);

        const data = await getRepresentacaoById(representacaoId);
        if (!active) return;

        if (!data) {
          setNaoEncontrada(true);
          return;
        }

        const tipoAtual = data.tipo ?? "";
        const tipoConhecido = tiposRepresentacao.includes(tipoAtual as (typeof tiposRepresentacao)[number]);

        setPpe(data.numero_ppe ?? "");
        setProcesso(data.processo_judicial ?? "");
        setTipoRepresentacao(tipoConhecido ? tipoAtual : tipoAtual ? "Outra" : "");
        setTipoOutra(tipoConhecido ? "" : tipoAtual);
        setDataRepresentacao(data.data_representacao ?? "");
        setResponsavel(data.responsavel ?? "");
        setVitima(data.vitima ?? "");
        setInvestigado(data.investigado ?? "");
        setAutorPreso(data.autor_preso ?? "");
        setResumoFatos(data.resumo_fatos ?? "");
        setFundamentacao(data.fundamentacao ?? "");
        setObjetivo(data.objetivo ?? "");
        setDiligenciasRelacionadas(data.diligencias_relacionadas ?? "");
        setStatus(data.status ?? "");
        setDataEnvioJudiciario(data.data_envio_judiciario ?? "");
        setDataDecisaoJudicial(data.data_decisao_judicial ?? "");
        setObservacoesDecisao(data.observacoes_decisao ?? "");
        setDataCumprimento(data.data_cumprimento ?? "");
        setEquipeCumprimento(data.equipe_cumprimento ?? "");
        setResultadoCumprimento(data.resultado_cumprimento ?? "");
        setObservacoesCumprimento(data.observacoes_cumprimento ?? "");
        setPrioridadeOperacional(data.prioridade_operacional ?? "");
        setPedidoSigiloso(data.pedido_sigiloso ?? "");
        setObservacoesInternas(data.observacoes_internas ?? "");
      } catch (error) {
        if (!active) return;
        const err = error as { code?: string };
        if (err?.code === "42501" || err?.code === "PGRST301") {
          setErro("Sem permissão para consultar esta representação. Verifique as policies de SELECT da tabela public.representacoes.");
        } else {
          setErro("Não foi possível carregar a representação agora.");
        }
      } finally {
        if (active) setLoadingInitial(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [representacaoId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loadingSubmit || naoEncontrada || !canEditRepresentacoes(profile)) return;

    setLoadingSubmit(true);
    setErro("");

    try {
      const tipoFinal = tipoRepresentacao === "Outra" ? tipoOutra : tipoRepresentacao;

      await updateRepresentacao(representacaoId, {
        numero_ppe: ppe.trim() || null,
        processo_judicial: processo.trim() || null,
        tipo: tipoFinal.trim() || null,
        data_representacao: dataRepresentacao || null,
        responsavel: responsavel.trim() || null,
        vitima: vitima.trim() || null,
        investigado: investigado.trim() || null,
        autor_preso: autorPreso || null,
        resumo_fatos: resumoFatos.trim() || null,
        fundamentacao: fundamentacao.trim() || null,
        objetivo: objetivo.trim() || null,
        diligencias_relacionadas: diligenciasRelacionadas.trim() || null,
        status: status || null,
        data_envio_judiciario: dataEnvioJudiciario || null,
        data_decisao_judicial: exibeDataDecisao ? dataDecisaoJudicial || null : null,
        observacoes_decisao: observacoesDecisao.trim() || null,
        data_cumprimento: exibeBlocoCumprimento ? dataCumprimento || null : null,
        equipe_cumprimento: exibeBlocoCumprimento ? equipeCumprimento.trim() || null : null,
        resultado_cumprimento: exibeBlocoCumprimento ? resultadoCumprimento.trim() || null : null,
        observacoes_cumprimento: exibeBlocoCumprimento ? observacoesCumprimento.trim() || null : null,
        prioridade_operacional: prioridadeOperacional || null,
        pedido_sigiloso: pedidoSigiloso || null,
        observacoes_internas: observacoesInternas.trim() || null,
      });
      try {
        const auditResult = await logAuditoria({
          acao: "update",
          modulo: "representacoes",
          entidade: "representacao",
          entidade_id: representacaoId,
          descricao: "Editou representação",
          metadata: {
            tipo: tipoFinal.trim() || "",
            status: status || "",
            ppe: ppe.trim() || "",
            numero_processo: processo.trim() || "",
            campos_possivelmente_atualizados: ["tipo", "status", "numero_ppe", "processo_judicial", "data_representacao"],
          },
        });
        if (auditResult.error) console.warn("[auditoria]", auditResult.error);
      } catch (auditError) {
        console.warn("[auditoria]", auditError);
      }

      await navigate({ to: "/representacoes/$representacaoId", params: { representacaoId } });
    } catch (error) {
      const err = error as { code?: string };
      if (err?.code === "42501" || err?.code === "PGRST301") {
        setErro("Sem permissão para atualizar esta representação. Verifique as policies de UPDATE da tabela public.representacoes.");
      } else {
        setErro("Não foi possível salvar as alterações agora.");
      }
    } finally {
      setLoadingSubmit(false);
    }
  }

  if (loadingInitial) return <AppLayout>Carregando representação...</AppLayout>;
  if (restricted) return <AppLayout><div className="space-y-4"><h1 className="text-xl font-bold">Acesso restrito</h1><p className="text-sm text-muted-foreground">Seu perfil não possui permissão para acessar Representações.</p><Link to="/modulos" className="px-4 py-2 border border-border rounded-lg inline-block">Voltar</Link></div></AppLayout>;
  if (naoEncontrada) return <AppLayout>Representação não encontrada.</AppLayout>;

  return (
    <AppLayout>
      <PageHeader title="Editar Representação" subtitle="Atualize os dados da medida judicial vinculada" showActions={false} />
      <form className="space-y-5 max-w-6xl pb-6" onSubmit={handleSubmit}>
        <SectionCard title="Identificação da Representação">
          <Field label="Nº PPE / Procedimento relacionado" value={ppe} onChange={(e) => setPpe(e.target.value)} />
          <Field label="Nº Processo Judicial" value={processo} onChange={(e) => setProcesso(e.target.value)} />
          <Select label="Tipo de Representação" options={tiposRepresentacao} value={tipoRepresentacao} onChange={setTipoRepresentacao} />
          <Field label="Data da Representação" type="date" value={dataRepresentacao} onChange={(e) => setDataRepresentacao(e.target.value)} />
          <Field label="Responsável pela Representação" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
          {exibeCampoOutra && <Field label="Especificar representação" value={tipoOutra} onChange={(e) => setTipoOutra(e.target.value)} />}
        </SectionCard>

        <SectionCard title="Pessoas Envolvidas">
          <Field label="Vítima" value={vitima} onChange={(e) => setVitima(e.target.value)} />
          <Field label="Investigado / Representado" value={investigado} onChange={(e) => setInvestigado(e.target.value)} />
          <Select label="Autor preso?" options={["Sim", "Não", "Não informado"]} value={autorPreso} onChange={setAutorPreso} />
        </SectionCard>

        <SectionCard title="Fundamentação e Finalidade">
          <TextArea label="Resumo dos fatos" value={resumoFatos} onChange={(e) => setResumoFatos(e.target.value)} />
          <TextArea label="Fundamentação da medida" value={fundamentacao} onChange={(e) => setFundamentacao(e.target.value)} />
          <TextArea label="Objetivo da representação" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} />
          <TextArea label="Diligências relacionadas" value={diligenciasRelacionadas} onChange={(e) => setDiligenciasRelacionadas(e.target.value)} />
        </SectionCard>

        <SectionCard title="Tramitação Judicial">
          <Select label="Status da Representação" options={statusRepresentacao} value={status} onChange={setStatus} />
          <Field label="Data de envio ao Judiciário" type="date" value={dataEnvioJudiciario} onChange={(e) => setDataEnvioJudiciario(e.target.value)} />
          {exibeDataDecisao && <Field label="Data da decisão judicial" type="date" value={dataDecisaoJudicial} onChange={(e) => setDataDecisaoJudicial(e.target.value)} />}
          <TextArea label="Observações da decisão" value={observacoesDecisao} onChange={(e) => setObservacoesDecisao(e.target.value)} />
        </SectionCard>

        {exibeBlocoCumprimento && (
          <SectionCard title="Cumprimento da Medida">
            <Field label="Data do cumprimento" type="date" value={dataCumprimento} onChange={(e) => setDataCumprimento(e.target.value)} />
            <Field label="Equipe responsável pelo cumprimento" value={equipeCumprimento} onChange={(e) => setEquipeCumprimento(e.target.value)} />
            <TextArea label="Resultado do cumprimento" value={resultadoCumprimento} onChange={(e) => setResultadoCumprimento(e.target.value)} />
            <TextArea label="Observações do cumprimento" value={observacoesCumprimento} onChange={(e) => setObservacoesCumprimento(e.target.value)} />
          </SectionCard>
        )}

        <SectionCard title="Controle Interno">
          <Select label="Prioridade operacional" options={["Normal", "Atenção", "Urgente"]} value={prioridadeOperacional} onChange={setPrioridadeOperacional} />
          <Select label="Pedido sigiloso?" options={["Sim", "Não"]} value={pedidoSigiloso} onChange={setPedidoSigiloso} />
          <TextArea label="Observações internas" value={observacoesInternas} onChange={(e) => setObservacoesInternas(e.target.value)} />
        </SectionCard>

        {erro && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{erro}</div>}

        <div className="flex gap-3 justify-end">
          <Link to="/representacoes/$representacaoId" params={{ representacaoId }} className="px-5 py-2.5 rounded-lg text-sm border border-border hover:bg-accent">
            Cancelar
          </Link>
          <button type="submit" disabled={loadingSubmit} className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-60">
            {loadingSubmit ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-xl border border-border/60 bg-background/70 p-5 lg:p-7"><h2 className="text-sm font-bold tracking-[0.2em] text-primary uppercase mb-5">{title}</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div></section>;
}
function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return <div><label className="block text-xs font-bold tracking-wider text-muted-foreground mb-2">{label.toUpperCase()}</label><input {...props} className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" /></div>;
}
function TextArea({ label, rows = 4, ...props }: { label: string; rows?: number } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <div className="md:col-span-2 lg:col-span-3"><label className="block text-xs font-bold tracking-wider text-muted-foreground mb-2">{label.toUpperCase()}</label><textarea rows={rows} {...props} className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" /></div>;
}
function Select({ label, options, value, onChange }: { label: string; options: readonly string[]; value?: string; onChange?: (value: string) => void }) {
  return <div><label className="block text-xs font-bold tracking-wider text-muted-foreground mb-2">{label.toUpperCase()}</label><select value={value ?? ""} onChange={(e) => onChange?.(e.target.value)} className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"><option value="">Selecione…</option>{options.map((option) => <option key={option}>{option}</option>)}</select></div>;
}
