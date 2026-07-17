import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createRepresentacao,
  replaceRepresentacaoPessoas,
} from "@/lib/repositories/representacoesRepository";
import {
  searchInqueritosForLink,
  type InqueritoLinkOption,
} from "@/lib/repositories/inqueritosRepository";
import { logAuditoria } from "@/lib/repositories/auditoriaRepository";
import { AppLayout } from "@/components/AppLayout";
import { FormFieldLabel } from "@/components/FormFieldLabel";
import { PageHeader } from "@/components/PageHeader";
import { RegistrationQualityPanel } from "@/components/RegistrationQualityPanel";
import {
  RepresentationPeopleEditor,
  type RepresentationPersonFormValue,
} from "@/components/RepresentationPeopleEditor";
import {
  COMPLIANCE_RESULT_DESCRIPTIONS,
  COMPLIANCE_RESULT_OPTIONS,
  COMPLIANCE_STATUS_OPTIONS,
  REPRESENTATION_TYPE_OPTIONS,
  getRepresentationRegistrationChecks,
  isYesValue,
  normalizePriority,
  normalizeRepresentationType,
  type ComplianceResult,
  type ComplianceStatus,
  type SelectOption,
} from "@/lib/operationalContracts";

export const Route = createFileRoute("/nova-representacao")({
  head: () => ({ meta: [{ title: "Cadastrar Representação — SIPI" }] }),
  component: NovaRepresentacao,
});

const statusRepresentacao = [
  "Em elaboração",
  "Em análise",
  "Enviada ao Judiciário",
  "Aguardando decisão",
  "Deferida",
  "Deferida parcialmente",
  "Indeferida",
  "Arquivada",
  "Finalizada",
] as const;

const statusComDataEnvioEVara = new Set(["Enviada ao Judiciário", "Aguardando decisão"]);
const statusComDecisaoEPrazo = new Set(["Deferida", "Deferida parcialmente"]);
const statusComDecisaoEObservacoes = new Set(["Indeferida", "Arquivada", "Finalizada"]);
const INQUIRY_LINK_OPTIONS: readonly SelectOption[] = [
  { value: "", label: "A definir" },
  { value: "sim", label: "Sim, possui inquérito vinculado" },
  { value: "nao", label: "Não possui inquérito vinculado" },
];
const normalizeText = (value?: string) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const getStatusHint = (status?: string) => {
  const n = normalizeText(status);
  if (!n) return "Selecione o status para orientar a tramitação judicial.";
  if (n.includes("indefer")) return "Status com decisão judicial de indeferimento.";
  if (n.includes("cumprida parcialmente"))
    return "Medida parcialmente cumprida; registre resultado e observações.";
  if (n.includes("cumprid")) return "Medida cumprida; registre resultado e equipe.";
  if (n.includes("defer")) return "Status com decisão judicial favorável.";
  if (n.includes("aguard") || n.includes("analis"))
    return "Representação aguardando manifestação judicial.";
  if (n.includes("enviad")) return "Representação já enviada ao Judiciário.";
  return "Status em acompanhamento interno.";
};

function NovaRepresentacao() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [erro, setErro] = useState("");

  const [ppe, setPpe] = useState("");
  const [vinculoInquerito, setVinculoInquerito] = useState<"sim" | "nao" | "">("");
  const [inqueritoId, setInqueritoId] = useState<string | null>(null);
  const [inqueritoMatches, setInqueritoMatches] = useState<InqueritoLinkOption[]>([]);
  const [searchingInquerito, setSearchingInquerito] = useState(false);
  const [justificativaSemInquerito, setJustificativaSemInquerito] = useState("");
  const [processo, setProcesso] = useState("");
  const [tipoRepresentacao, setTipoRepresentacao] = useState("");
  const [tipoOutra, setTipoOutra] = useState("");
  const [dataRepresentacao, setDataRepresentacao] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [vitima, setVitima] = useState("");
  const [investigado, setInvestigado] = useState("");
  const [autorPreso, setAutorPreso] = useState("");
  const [pessoasAdicionais, setPessoasAdicionais] = useState<RepresentationPersonFormValue[]>([]);
  const [resumoFatos, setResumoFatos] = useState("");
  const [fundamentacao, setFundamentacao] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [diligenciasRelacionadas, setDiligenciasRelacionadas] = useState("");
  const [status, setStatus] = useState("");
  const [dataEnvioJudiciario, setDataEnvioJudiciario] = useState("");
  const [dataDecisaoJudicial, setDataDecisaoJudicial] = useState("");
  const [varaJuizo, setVaraJuizo] = useState("");
  const [prazoConcedidoDias, setPrazoConcedidoDias] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [observacoesDecisao, setObservacoesDecisao] = useState("");
  const [dataCumprimento, setDataCumprimento] = useState("");
  const [cumprimentoStatus, setCumprimentoStatus] = useState<ComplianceStatus>("pendente");
  const [equipeCumprimento, setEquipeCumprimento] = useState("");
  const [resultadoCumprimento, setResultadoCumprimento] = useState("");
  const [observacoesCumprimento, setObservacoesCumprimento] = useState("");
  const [prioridadeOperacional, setPrioridadeOperacional] = useState("");
  const [pedidoSigiloso, setPedidoSigiloso] = useState("");
  const [observacoesInternas, setObservacoesInternas] = useState("");
  const [equipeResponsavel, setEquipeResponsavel] = useState("");
  const [acompanhamentoEspecial, setAcompanhamentoEspecial] = useState("");

  const exibeCampoOutra = tipoRepresentacao === "Outra";
  const exibeDataEnvioEVara = useMemo(() => statusComDataEnvioEVara.has(status), [status]);
  const exibeDecisaoEPrazo = useMemo(() => statusComDecisaoEPrazo.has(status), [status]);
  const exibeBlocoCumprimento = useMemo(
    () =>
      cumprimentoStatus !== "pendente" ||
      status === "Deferida" ||
      status === "Deferida parcialmente",
    [cumprimentoStatus, status],
  );
  const exibeDecisaoEObservacoes = useMemo(
    () => statusComDecisaoEObservacoes.has(status),
    [status],
  );

  const registrationChecks = useMemo(
    () =>
      getRepresentationRegistrationChecks({
        vinculoInquerito,
        inqueritoId,
        justificativaSemInquerito,
        ppe,
        processo,
        tipoRepresentacao,
        tipoOutra,
        dataRepresentacao,
        vitima,
        investigado,
        resumoFatos,
        status,
        dataEnvioJudiciario,
        dataDecisaoJudicial,
        varaJuizo,
        prazoConcedidoDias,
        dataVencimento,
        cumprimentoStatus,
        dataCumprimento,
        equipeCumprimento,
        resultadoCumprimento,
        prioridadeOperacional,
      }),
    [
      cumprimentoStatus,
      dataCumprimento,
      dataDecisaoJudicial,
      dataEnvioJudiciario,
      dataRepresentacao,
      dataVencimento,
      equipeCumprimento,
      inqueritoId,
      investigado,
      justificativaSemInquerito,
      ppe,
      prazoConcedidoDias,
      prioridadeOperacional,
      processo,
      resultadoCumprimento,
      resumoFatos,
      status,
      tipoOutra,
      tipoRepresentacao,
      varaJuizo,
      vinculoInquerito,
      vitima,
    ],
  );

  const blockingChecks = registrationChecks.filter((item) => item.blocking && !item.complete);

  useEffect(() => {
    const normalizedPpe = ppe.trim();
    if (vinculoInquerito !== "sim" || inqueritoId || normalizedPpe.length < 2) {
      setInqueritoMatches([]);
      setSearchingInquerito(false);
      return;
    }

    let isCurrent = true;
    const timer = window.setTimeout(() => {
      setSearchingInquerito(true);
      void searchInqueritosForLink(normalizedPpe)
        .then((matches) => {
          if (isCurrent) setInqueritoMatches(matches);
        })
        .catch(() => {
          if (isCurrent) setInqueritoMatches([]);
        })
        .finally(() => {
          if (isCurrent) setSearchingInquerito(false);
        });
    }, 350);

    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [inqueritoId, ppe, vinculoInquerito]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setErro("");
    setFeedback("");

    const tipoFinal = tipoRepresentacao === "Outra" ? tipoOutra : tipoRepresentacao;
    if (blockingChecks.length > 0) {
      setErro(`Revise antes de salvar: ${blockingChecks.map((item) => item.label).join("; ")}.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setLoading(true);

    try {
      const created = await createRepresentacao({
        inquerito_id: vinculoInquerito === "sim" ? inqueritoId : null,
        justificativa_sem_inquerito:
          vinculoInquerito === "nao" ? justificativaSemInquerito.trim() : null,
        numero_ppe: ppe.trim() || null,
        processo_judicial: processo.trim() || null,
        tipo: tipoFinal.trim() || null,
        tipo_normalizado: normalizeRepresentationType(tipoFinal),
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
        data_decisao_judicial: dataDecisaoJudicial || null,
        vara_juizo: varaJuizo.trim() || null,
        prazo_concedido_dias: prazoConcedidoDias.trim() ? Number(prazoConcedidoDias) : null,
        data_vencimento: dataVencimento || null,
        observacoes_decisao: observacoesDecisao.trim() || null,
        data_cumprimento: dataCumprimento || null,
        cumprimento_status: cumprimentoStatus,
        equipe_cumprimento: equipeCumprimento.trim() || null,
        resultado_cumprimento: resultadoCumprimento.trim() || null,
        observacoes_cumprimento: observacoesCumprimento.trim() || null,
        prioridade_operacional: prioridadeOperacional
          ? normalizePriority(prioridadeOperacional)
          : null,
        equipe_responsavel: equipeResponsavel.trim() || null,
        acompanhamento_especial: acompanhamentoEspecial ? acompanhamentoEspecial === "Sim" : null,
        pedido_sigiloso: pedidoSigiloso || null,
        pedido_sigiloso_normalizado: pedidoSigiloso ? isYesValue(pedidoSigiloso) : null,
        medida_protetiva_normalizada: normalizeRepresentationType(tipoFinal) === "medida_protetiva",
        observacoes_internas: observacoesInternas.trim() || null,
      });
      let pessoasWarning = false;
      if (pessoasAdicionais.length > 0) {
        try {
          await replaceRepresentacaoPessoas(created.id, pessoasAdicionais);
        } catch (pessoasError) {
          pessoasWarning = true;
          console.warn(
            "[representacoes:pessoas] Registro principal salvo sem pessoas adicionais",
            pessoasError,
          );
        }
      }
      try {
        const auditResult = await logAuditoria({
          acao: "create",
          modulo: "representacoes",
          entidade: "representacao",
          entidade_id: created.id,
          descricao: "Criou representação",
          metadata: {
            tipo: tipoFinal.trim() || "",
            status: status || "",
            ppe: ppe.trim() || "",
            numero_processo: processo.trim() || "",
          },
        });
        if (auditResult.error) console.warn("[auditoria]", auditResult.error);
      } catch (auditError) {
        console.warn("[auditoria]", auditError);
      }
      setFeedback(
        pessoasWarning
          ? "Representação salva. As pessoas adicionais não puderam ser vinculadas agora."
          : "Representação salva com sucesso.",
      );
      navigate({ to: "/representacoes" });
    } catch (error) {
      const isRlsError =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error.code === "42501" || error.code === "PGRST301");
      setErro(
        isRlsError
          ? "Permissão negada ao inserir no Supabase (RLS). Verifique as políticas de INSERT da tabela public.representacoes para a chave pública."
          : "Falha ao salvar representação no Supabase.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title="Cadastrar Representação"
        subtitle="Registro de medida judicial vinculada a procedimento policial"
        showActions={false}
      />
      <form className="space-y-5 max-w-6xl pb-6" onSubmit={handleSubmit}>
        <RegistrationQualityPanel checks={registrationChecks} />

        <SectionCard
          title="Identificação Judicial"
          subtitle="Vinculação processual e dados principais da representação."
        >
          <OptionSelect
            label="Possui inquérito vinculado?"
            options={INQUIRY_LINK_OPTIONS}
            value={vinculoInquerito}
            onChange={(value) => {
              const nextValue = value as "sim" | "nao" | "";
              setVinculoInquerito(nextValue);
              if (nextValue === "sim") {
                setJustificativaSemInquerito("");
              } else {
                setInqueritoId(null);
                setPpe("");
                setInqueritoMatches([]);
              }
            }}
            hint="O vínculo formal permite abrir o procedimento relacionado e evita cadastros judiciais isolados."
          />
          {vinculoInquerito === "sim" && (
            <Field
              label="PPE vinculado / Procedimento relacionado"
              placeholder="Ex.: 72921/2025"
              value={ppe}
              onChange={(e) => {
                setPpe(e.target.value);
                setInqueritoId(null);
              }}
            />
          )}
          {vinculoInquerito === "sim" && searchingInquerito && (
            <InfoBox>Consultando inquéritos acessíveis com este PPE...</InfoBox>
          )}
          {vinculoInquerito === "sim" &&
            !searchingInquerito &&
            !inqueritoId &&
            inqueritoMatches.length > 0 && (
              <div className="md:col-span-2 lg:col-span-3 rounded-lg border border-primary/25 bg-card/70 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
                  Selecione o inquérito correto
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  {inqueritoMatches.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setInqueritoId(item.id);
                        setPpe(item.numero_ppe ?? ppe);
                        setJustificativaSemInquerito("");
                      }}
                      className="rounded-lg border border-border/70 bg-background px-3 py-2 text-left transition-colors hover:border-primary/60 hover:bg-primary/5"
                    >
                      <span className="block text-sm font-semibold text-foreground">
                        PPE {item.numero_ppe || "não informado"}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {item.tipo_procedimento_normalizado || item.tipo || "Procedimento"} ·{" "}
                        {item.situacao || "Sem situação"} · {item.data_instauracao || "Sem data"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          {vinculoInquerito === "sim" && inqueritoId && (
            <div className="md:col-span-2 lg:col-span-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
              <span>Vínculo formal confirmado com o inquérito selecionado.</span>
              <button
                type="button"
                onClick={() => setInqueritoId(null)}
                className="font-semibold text-emerald-300 hover:text-emerald-200"
              >
                Alterar vínculo
              </button>
            </div>
          )}
          {vinculoInquerito === "nao" && (
            <TextArea
              label="Justificativa para representação sem inquérito vinculado"
              placeholder="Ex.: medida autônoma, procedimento ainda não cadastrado ou vínculo pendente de confirmação."
              value={justificativaSemInquerito}
              onChange={(event) => setJustificativaSemInquerito(event.target.value)}
              required
            />
          )}
          <Field
            label="Processo judicial"
            placeholder="Ex.: 8001619-92.2025.8.05.0111"
            value={processo}
            onChange={(e) => setProcesso(e.target.value)}
          />
          <Select
            label="Tipo de Representação"
            options={REPRESENTATION_TYPE_OPTIONS.map((option) => option.value)}
            value={tipoRepresentacao}
            onChange={setTipoRepresentacao}
          />
          <Field
            label="Data da Representação"
            type="date"
            value={dataRepresentacao}
            onChange={(e) => setDataRepresentacao(e.target.value)}
          />
          <Field
            label="Responsável pela Representação"
            placeholder="Ex.: Del. Nome Completo"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
          />
          {exibeCampoOutra && (
            <Field
              label="Especificar representação"
              placeholder="Descreva o tipo de representação"
              value={tipoOutra}
              onChange={(e) => setTipoOutra(e.target.value)}
            />
          )}
        </SectionCard>

        <SectionCard
          title="Tramitação Judicial"
          subtitle="Acompanhamento da fase judicial, decisão e cumprimento."
        >
          <Select
            label="Status da Representação"
            options={statusRepresentacao}
            value={status}
            onChange={setStatus}
          />
          <OptionSelect
            label="Situação do cumprimento"
            options={COMPLIANCE_STATUS_OPTIONS}
            value={cumprimentoStatus}
            onChange={(value) => setCumprimentoStatus(value as ComplianceStatus)}
          />
          <InfoBox>{getStatusHint(status)}</InfoBox>
          {exibeDataEnvioEVara && (
            <Field
              label="Data de envio ao Judiciário"
              type="date"
              value={dataEnvioJudiciario}
              onChange={(e) => setDataEnvioJudiciario(e.target.value)}
            />
          )}
          {exibeDataEnvioEVara && (
            <Field
              label="Vara / Juízo"
              placeholder="Ex.: 2ª Vara Criminal"
              value={varaJuizo}
              onChange={(e) => setVaraJuizo(e.target.value)}
            />
          )}
          {exibeDecisaoEPrazo && (
            <Field
              label="Data da decisão judicial"
              type="date"
              value={dataDecisaoJudicial}
              onChange={(e) => setDataDecisaoJudicial(e.target.value)}
            />
          )}
          {exibeDecisaoEPrazo && (
            <Field
              label="Prazo concedido (dias)"
              type="number"
              min={0}
              value={prazoConcedidoDias}
              onChange={(e) => setPrazoConcedidoDias(e.target.value)}
            />
          )}
          {exibeDecisaoEPrazo && (
            <Field
              label="Data de vencimento"
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
            />
          )}
          {exibeDecisaoEObservacoes && (
            <Field
              label="Data da decisão judicial"
              type="date"
              value={dataDecisaoJudicial}
              onChange={(e) => setDataDecisaoJudicial(e.target.value)}
            />
          )}
          {exibeDecisaoEObservacoes && (
            <TextArea
              label="Observações da decisão"
              placeholder="Observações sobre decisão, condicionantes e determinações judiciais..."
              value={observacoesDecisao}
              onChange={(e) => setObservacoesDecisao(e.target.value)}
            />
          )}
        </SectionCard>

        <SectionCard
          title="Pessoas Envolvidas"
          subtitle="Partes relacionadas à medida representada."
        >
          <RepresentationPeopleEditor value={pessoasAdicionais} onChange={setPessoasAdicionais} />
          <Field
            label="Vítima"
            placeholder="Nome completo da vítima"
            value={vitima}
            onChange={(e) => setVitima(e.target.value)}
          />
          <Field
            label="Investigado / Representado"
            placeholder="Nome do investigado"
            value={investigado}
            onChange={(e) => setInvestigado(e.target.value)}
          />
          <Select
            label="Autor preso?"
            options={["Sim", "Não", "Não informado"]}
            value={autorPreso}
            onChange={setAutorPreso}
          />
        </SectionCard>

        <SectionCard
          title="Controle Interno"
          subtitle="Priorização e acompanhamento interno da unidade."
        >
          <Select
            label="Prioridade operacional"
            options={["Normal", "Atenção", "Urgente"]}
            value={prioridadeOperacional}
            onChange={setPrioridadeOperacional}
          />
          <Select
            label="Pedido sigiloso?"
            options={["Sim", "Não"]}
            value={pedidoSigiloso}
            onChange={setPedidoSigiloso}
          />
          <Field
            label="Equipe responsável"
            placeholder="Ex.: Equipe Alpha"
            value={equipeResponsavel}
            onChange={(e) => setEquipeResponsavel(e.target.value)}
          />
          <Select
            label="Acompanhamento especial?"
            options={["Sim", "Não"]}
            value={acompanhamentoEspecial}
            onChange={setAcompanhamentoEspecial}
          />
          <TextArea
            label="Observações internas"
            placeholder="Anotações internas da unidade sobre o acompanhamento da representação..."
            value={observacoesInternas}
            onChange={(e) => setObservacoesInternas(e.target.value)}
          />
        </SectionCard>

        <SectionCard
          title="Resumo e Fundamentação"
          subtitle="Contexto fático e base técnico-jurídica da medida."
        >
          <TextArea
            label="Resumo dos fatos"
            placeholder="Descreva resumidamente os fatos que motivam a representação..."
            value={resumoFatos}
            onChange={(e) => setResumoFatos(e.target.value)}
          />
          <TextArea
            label="Fundamentação da medida"
            placeholder="Informe a base jurídica e os elementos de convicção..."
            value={fundamentacao}
            onChange={(e) => setFundamentacao(e.target.value)}
          />
          <TextArea
            label="Objetivo da representação"
            placeholder="Ex.: garantir produção de prova, preservar vítima, capturar investigado..."
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
          />
          <TextArea
            label="Diligências relacionadas"
            placeholder="Liste diligências já realizadas e pendentes relacionadas ao pedido..."
            value={diligenciasRelacionadas}
            onChange={(e) => setDiligenciasRelacionadas(e.target.value)}
          />
        </SectionCard>

        {exibeBlocoCumprimento && (
          <SectionCard
            title="Cumprimento da Medida"
            subtitle="Registro operacional da execução da decisão."
          >
            <Field
              label="Data do cumprimento"
              type="date"
              value={dataCumprimento}
              onChange={(e) => setDataCumprimento(e.target.value)}
            />
            <Field
              label="Equipe responsável pelo cumprimento"
              placeholder="Ex.: Equipe Alpha"
              value={equipeCumprimento}
              onChange={(e) => setEquipeCumprimento(e.target.value)}
            />
            <OptionSelect
              label="Resultado do cumprimento"
              options={COMPLIANCE_RESULT_OPTIONS}
              value={resultadoCumprimento}
              onChange={setResultadoCumprimento}
              hint={
                resultadoCumprimento
                  ? COMPLIANCE_RESULT_DESCRIPTIONS[resultadoCumprimento as ComplianceResult]
                  : "Classifique o efeito efetivo da medida após a execução."
              }
            />
            <TextArea
              label="Observações do cumprimento"
              placeholder="Detalhes operacionais adicionais..."
              value={observacoesCumprimento}
              onChange={(e) => setObservacoesCumprimento(e.target.value)}
            />
          </SectionCard>
        )}

        {erro && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {erro}
          </div>
        )}
        {feedback && (
          <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            {feedback}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Link
            to="/representacoes"
            className="px-5 py-2.5 rounded-lg text-sm border border-border hover:bg-accent"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Salvando..." : "Salvar Representação"}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/60 bg-background/70 p-5 lg:p-7">
      <h2 className="text-sm font-bold tracking-[0.2em] text-primary uppercase">{title}</h2>
      {subtitle && <p className="mt-1 mb-5 text-xs text-muted-foreground">{subtitle}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </section>
  );
}
function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <FormFieldLabel label={label} />
      <input
        {...props}
        className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
      />
    </div>
  );
}
function TextArea({
  label,
  rows = 4,
  ...props
}: { label: string; rows?: number } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="md:col-span-2 lg:col-span-3">
      <FormFieldLabel label={label} />
      <textarea
        rows={rows}
        {...props}
        className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
      />
    </div>
  );
}
function Select({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div>
      <FormFieldLabel label={label} />
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
      >
        <option value="">Selecione…</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}
function OptionSelect({
  label,
  options,
  value,
  onChange,
  hint,
}: {
  label: string;
  options: readonly SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <FormFieldLabel label={label} hint={hint} />
      <select
        value={value ?? ""}
        onChange={(event) => onChange?.(event.target.value)}
        className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
      >
        {!options.some((option) => option.value === "") && (
          <option value="" disabled>
            Selecione...
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:col-span-2 lg:col-span-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
      {children}
    </div>
  );
}
