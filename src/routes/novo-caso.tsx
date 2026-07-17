import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { FormFieldLabel } from "@/components/FormFieldLabel";
import { PageHeader } from "@/components/PageHeader";
import { InquiryPeopleEditor } from "@/components/InquiryPeopleEditor";
import { RegistrationQualityPanel } from "@/components/RegistrationQualityPanel";
import {
  createInquerito,
  findInqueritosByPpe,
  replaceInqueritoPessoas,
  type InqueritoLinkOption,
} from "@/lib/repositories/inqueritosRepository";
import { logAuditoria } from "@/lib/repositories/auditoriaRepository";
import { getCurrentProfile } from "@/lib/auth";
import { canCreateCases, type UserProfile } from "@/lib/authz";
import { CASE_CATEGORY_OPTIONS, normalizeCaseCategory } from "@/lib/inqueritosPriority";
import {
  OCCURRENCE_ORIGIN_OPTIONS,
  PROCEDURE_TYPE_OPTIONS,
  REPORT_STATUS_OPTIONS,
  createInquiryPerson,
  getInquiryRegistrationChecks,
  isYesValue,
  normalizeCriminalCategory,
  normalizePriority,
  normalizeProcedureType,
  type OccurrenceOrigin,
  type InquiryPersonFormValue,
  type ReportStatus,
} from "@/lib/operationalContracts";

export const Route = createFileRoute("/novo-caso")({
  head: () => ({ meta: [{ title: "Novo Caso — SIPI" }] }),
  component: NovoCaso,
});

function NovoCaso() {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [houveArmaDeFogo, setHouveArmaDeFogo] = useState("");
  const [armaUtilizada, setArmaUtilizada] = useState("");
  const [ppe, setPpe] = useState("");
  const [tipificacao, setTipificacao] = useState("");
  const [pessoas, setPessoas] = useState<InquiryPersonFormValue[]>([
    createInquiryPerson("vitima"),
    createInquiryPerson("autor_investigado"),
  ]);
  const [autoria, setAutoria] = useState("");
  const [numeroBo, setNumeroBo] = useState("");
  const [numeroFisico, setNumeroFisico] = useState("");
  const [prazo, setPrazo] = useState("");
  const [dataFato, setDataFato] = useState("");
  const [dataInstauracao, setDataInstauracao] = useState("");
  const [tipo, setTipo] = useState("Inquérito Policial (IP)");
  const [origemRegistro, setOrigemRegistro] = useState<OccurrenceOrigin>("novo");
  const [ppeMatches, setPpeMatches] = useState<InqueritoLinkOption[]>([]);
  const [checkingPpe, setCheckingPpe] = useState(false);
  const [prioridade, setPrioridade] = useState("MÉDIA");
  const [gravidade, setGravidade] = useState("Outro");
  const [situacao, setSituacao] = useState("Instaurado");
  const [statusDiligencias, setStatusDiligencias] = useState("Pendente");
  const [elucidado, setElucidado] = useState("");
  const [reuPreso, setReuPreso] = useState("");
  const [delegadoResponsavel, setDelegadoResponsavel] = useState("");
  const [equipe, setEquipe] = useState("");
  const [escrivao, setEscrivao] = useState("");
  const [bairro, setBairro] = useState("");
  const [distrito, setDistrito] = useState("");
  const [motivacao, setMotivacao] = useState("");
  const [vinculadoFaccao, setVinculadoFaccao] = useState("");
  const [nomeFaccao, setNomeFaccao] = useState("");
  const [diligenciasPendentes, setDiligenciasPendentes] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [medidaProtetiva, setMedidaProtetiva] = useState("");
  const [numeroProcessoMedida, setNumeroProcessoMedida] = useState("");
  const [relatorioStatus, setRelatorioStatus] = useState<ReportStatus>("pendente");
  const [dataRelatorio, setDataRelatorio] = useState("");
  const [dataEnvioRelatorio, setDataEnvioRelatorio] = useState("");
  const [dataElucidacao, setDataElucidacao] = useState("");
  const [representacoesLegais, setRepresentacoesLegais] = useState("");
  const [visibilidade, setVisibilidade] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const vitima = pessoas.find((pessoa) => pessoa.papel === "vitima")?.nome ?? "";
  const investigado = pessoas.find((pessoa) => pessoa.papel === "autor_investigado")?.nome ?? "";

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const currentProfile = await getCurrentProfile();
        if (isMounted) {
          setProfile(currentProfile);
        }
      } catch (error) {
        console.error("Falha ao verificar permissões para /novo-caso", error);
      } finally {
        if (isMounted) {
          setCheckingAccess(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const normalizedPpe = ppe.trim();
    if (normalizedPpe.length < 2) {
      setPpeMatches([]);
      setCheckingPpe(false);
      return;
    }

    let isCurrent = true;
    const timer = window.setTimeout(() => {
      setCheckingPpe(true);
      void findInqueritosByPpe(normalizedPpe)
        .then((matches) => {
          if (isCurrent) setPpeMatches(matches);
        })
        .catch(() => {
          if (isCurrent) setPpeMatches([]);
        })
        .finally(() => {
          if (isCurrent) setCheckingPpe(false);
        });
    }, 350);

    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [ppe]);

  const registrationChecks = useMemo(
    () =>
      getInquiryRegistrationChecks({
        ppe,
        numeroBo,
        origemRegistro,
        visibilidade,
        tipoProcedimento: tipo,
        situacao,
        dataFato,
        dataInstauracao,
        prazo,
        tipificacao,
        gravidade,
        vitima,
        investigado,
        autoria,
        reuPreso,
        bairro,
        distrito,
        delegado: delegadoResponsavel,
        equipe,
        escrivao,
        statusDiligencias,
        elucidado,
        dataElucidacao,
        houveArmaDeFogo,
        armaUtilizada,
        vinculadoFaccao,
        nomeFaccao,
        medidaProtetiva,
        numeroProcessoMedida,
        relatorioStatus,
        dataRelatorio,
        dataEnvioRelatorio,
      }),
    [
      armaUtilizada,
      autoria,
      bairro,
      dataElucidacao,
      dataEnvioRelatorio,
      dataFato,
      dataInstauracao,
      dataRelatorio,
      delegadoResponsavel,
      distrito,
      elucidado,
      equipe,
      escrivao,
      gravidade,
      houveArmaDeFogo,
      investigado,
      medidaProtetiva,
      nomeFaccao,
      numeroBo,
      numeroProcessoMedida,
      origemRegistro,
      ppe,
      prazo,
      reuPreso,
      relatorioStatus,
      situacao,
      statusDiligencias,
      tipificacao,
      tipo,
      vinculadoFaccao,
      visibilidade,
      vitima,
    ],
  );

  const blockingChecks = registrationChecks.filter((item) => item.blocking && !item.complete);

  const handleHouveArmaDeFogoChange = (value: string) => {
    setHouveArmaDeFogo(value);
    if (value !== "Sim") {
      setArmaUtilizada("");
    }
  };

  const handleElucidadoChange = (value: string) => {
    setElucidado(value);
    if (!isYesValue(value)) setDataElucidacao("");
  };

  const handleVinculoFaccaoChange = (value: string) => {
    setVinculadoFaccao(value);
    if (!isYesValue(value)) setNomeFaccao("");
  };

  const handleMedidaProtetivaChange = (value: string) => {
    setMedidaProtetiva(value);
    if (!isYesValue(value)) setNumeroProcessoMedida("");
  };

  const handleRelatorioStatusChange = (value: ReportStatus) => {
    setRelatorioStatus(value);
    if (value === "pendente") {
      setDataRelatorio("");
      setDataEnvioRelatorio("");
    } else if (value === "relatado") {
      setDataEnvioRelatorio("");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || !canCreateCases(profile)) return;
    setErro("");
    setFeedback("");
    if (blockingChecks.length > 0) {
      setErro(`Revise antes de salvar: ${blockingChecks.map((item) => item.label).join("; ")}.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setLoading(true);
    const normalizedType = normalizeProcedureType(tipo);
    const normalizedCategory = normalizeCriminalCategory(normalizeCaseCategory(gravidade, "Outro"));
    const isCvli = normalizedCategory === "CVLI";
    const payload = {
      numero_ppe: ppe.trim() || null,
      numero_bo: numeroBo.trim() || null,
      numero_fisico: numeroFisico.trim() || null,
      origem_registro: origemRegistro,
      visibilidade: visibilidade.trim() || null,
      tipificacao: tipificacao.trim() || null,
      vitima: vitima.trim() || null,
      investigado: investigado.trim() || null,
      autoria_determinada: autoria || null,
      reu_preso: reuPreso || null,
      reu_preso_normalizado: reuPreso ? isYesValue(reuPreso) : null,
      prazo: prazo || null,
      data_fato: dataFato || null,
      data_instauracao: dataInstauracao || null,
      tipo: tipo || null,
      tipo_procedimento_normalizado: normalizedType,
      prioridade: prioridade || null,
      prioridade_operacional: normalizePriority(prioridade),
      gravidade: normalizeCaseCategory(gravidade, "Outro"),
      categoria_criminal: normalizedCategory,
      status_diligencias: statusDiligencias || null,
      situacao: situacao || null,
      elucidado: elucidado || null,
      cvli_elucidado: isCvli && elucidado ? isYesValue(elucidado) : null,
      data_elucidacao: isCvli && isYesValue(elucidado) ? dataElucidacao || null : null,
      houve_arma_fogo: houveArmaDeFogo || null,
      arma_utilizada: armaUtilizada || null,
      delegado_responsavel: delegadoResponsavel.trim() || null,
      equipe: equipe.trim() || null,
      equipe_responsavel: equipe.trim() || null,
      escrivao: escrivao.trim() || null,
      bairro: bairro.trim() || null,
      distrito: distrito.trim() || null,
      motivacao: motivacao.trim() || null,
      faccao: vinculadoFaccao || null,
      nome_faccao: nomeFaccao.trim() || null,
      diligencias_pendentes: diligenciasPendentes.trim() || null,
      observacoes: observacoes.trim() || null,
      medida_protetiva: medidaProtetiva || null,
      medida_protetiva_normalizada: medidaProtetiva ? isYesValue(medidaProtetiva) : null,
      numero_processo_medida: numeroProcessoMedida.trim() || null,
      relatorio_status: relatorioStatus,
      relatorio_enviado: relatorioStatus === "enviado" ? "Sim" : "Não",
      data_relatorio: relatorioStatus !== "pendente" ? dataRelatorio || null : null,
      data_envio_relatorio: relatorioStatus === "enviado" ? dataEnvioRelatorio || null : null,
      representacoes_legais: representacoesLegais.trim() || null,
    };
    try {
      const created = await createInquerito(payload);
      const pessoasPreenchidas = pessoas
        .filter((pessoa) => pessoa.nome.trim())
        .map((pessoa, ordem) => ({
          papel: pessoa.papel,
          nome: pessoa.nome.trim(),
          observacao: pessoa.observacao.trim() || null,
          ordem,
        }));
      let pessoasWarning = false;
      if (pessoasPreenchidas.length > 0) {
        try {
          await replaceInqueritoPessoas(created.id, pessoasPreenchidas);
        } catch (pessoasError) {
          pessoasWarning = true;
          console.warn(
            "[inqueritos:pessoas] Registro principal salvo sem pessoas adicionais",
            pessoasError,
          );
        }
      }
      try {
        const auditResult = await logAuditoria({
          acao: "create",
          modulo: "inqueritos",
          entidade: "inquerito",
          entidade_id: created.id,
          descricao: "Criou inquérito",
          metadata: {
            ppe: payload.numero_ppe ?? "",
            tipo: payload.tipo ?? "",
            prioridade: payload.prioridade ?? "",
            situacao: payload.situacao ?? "",
            status_diligencias: payload.status_diligencias ?? "",
          },
        });
        if (auditResult.error) console.warn("[auditoria]", auditResult.error);
      } catch (auditError) {
        console.warn("[auditoria]", auditError);
      }
      setFeedback(
        pessoasWarning
          ? "Inquérito salvo. As pessoas adicionais não puderam ser vinculadas agora."
          : "Inquérito salvo com sucesso.",
      );
      navigate({ to: "/inqueritos/$caseId", params: { caseId: created.id } });
    } catch (error) {
      const isRlsError =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error.code === "42501" || error.code === "PGRST301");
      setErro(
        isRlsError
          ? "Permissão negada ao inserir no Supabase (RLS). Verifique as políticas de INSERT da tabela public.inqueritos para a chave pública."
          : "Falha ao salvar no Supabase.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingAccess)
    return (
      <AppLayout>
        <p className="text-sm text-muted-foreground">Verificando permissões...</p>
      </AppLayout>
    );

  if (!canCreateCases(profile))
    return (
      <AppLayout>
        <div className="space-y-3">
          <h1 className="text-xl font-bold">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground">
            Seu perfil não possui permissão para criar inquéritos.
          </p>
        </div>
      </AppLayout>
    );

  return (
    <AppLayout>
      <PageHeader
        title="Novo Inquérito"
        subtitle="Cadastre um novo inquérito policial"
        showActions={false}
      />

      <form className="space-y-5 max-w-6xl pb-6" onSubmit={handleSubmit}>
        <RegistrationQualityPanel checks={registrationChecks} />

        <SectionCard title="Identificação do Procedimento">
          <Field
            label="PPE"
            placeholder="Ex.: 001/2026-DPPC"
            value={ppe}
            onChange={(e) => setPpe(e.target.value)}
          />
          <OptionSelect
            label="Origem do registro"
            options={OCCURRENCE_ORIGIN_OPTIONS}
            value={origemRegistro}
            onChange={(value) => setOrigemRegistro(value as OccurrenceOrigin)}
          />
          {checkingPpe && (
            <InlineNotice>Verificando ocorrências existentes com este PPE...</InlineNotice>
          )}
          {!checkingPpe && ppeMatches.length > 0 && (
            <InlineNotice tone="warning">
              Este PPE já aparece em {ppeMatches.length} ocorrência(s) ativa(s). O cadastro continua
              permitido para procedimentos restaurados ou relacionados; confirme a origem do
              registro antes de salvar.
            </InlineNotice>
          )}
          <Field
            label="Nº do B.O."
            placeholder="Ex.: 2026.000001"
            value={numeroBo}
            onChange={(e) => setNumeroBo(e.target.value)}
          />
          <Field
            label="Nº Físico"
            placeholder="Ex.: 2026.001.0001"
            value={numeroFisico}
            onChange={(e) => setNumeroFisico(e.target.value)}
          />
          <Select
            label="Tipo de Procedimento"
            value={tipo}
            onChange={setTipo}
            options={PROCEDURE_TYPE_OPTIONS.map((option) => option.label)}
          />
          <Select
            label="Visibilidade"
            options={["Público", "Privado"]}
            value={visibilidade}
            onChange={setVisibilidade}
          />
        </SectionCard>

        <SectionCard title="Datas">
          <Field
            label="Data do Fato"
            type="date"
            value={dataFato}
            onChange={(e) => setDataFato(e.target.value)}
          />
          <Field
            label="Data de Instauração"
            type="date"
            value={dataInstauracao}
            onChange={(e) => setDataInstauracao(e.target.value)}
          />
          <Field
            label="Prazo"
            type="date"
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
          />
        </SectionCard>

        <SectionCard title="Classificação do Caso">
          <Field
            label="Tipificação"
            placeholder="Ex.: Homicídio Qualificado"
            value={tipificacao}
            onChange={(e) => setTipificacao(e.target.value)}
          />
          <Select
            label="Categoria do Caso"
            options={[...CASE_CATEGORY_OPTIONS]}
            value={gravidade}
            onChange={setGravidade}
          />
          <Select
            label="Situação"
            value={situacao}
            onChange={setSituacao}
            options={[
              "Instaurado",
              "Em Andamento",
              "Para Relatar",
              "Relatado",
              "Aguardando Diligência",
              "Aguardando Laudo Pericial",
              "Requisição Ministerial/Judicial",
              "Remetido",
              "Arquivado",
            ]}
          />
          <Select
            label="Elucidado"
            options={["Sim", "Não"]}
            value={elucidado}
            onChange={handleElucidadoChange}
          />
          {normalizeCriminalCategory(gravidade) === "CVLI" && elucidado === "Sim" && (
            <Field
              label="Data da elucidação"
              type="date"
              value={dataElucidacao}
              onChange={(e) => setDataElucidacao(e.target.value)}
            />
          )}
          <Select
            label="Houve arma de fogo?"
            options={["Sim", "Não"]}
            value={houveArmaDeFogo}
            onChange={handleHouveArmaDeFogoChange}
          />
          {houveArmaDeFogo === "Sim" && (
            <Field
              label="Arma Utilizada"
              placeholder="Ex: revólver calibre .38"
              value={armaUtilizada}
              onChange={(e) => setArmaUtilizada(e.target.value)}
            />
          )}
        </SectionCard>

        <SectionCard title="Pessoas Envolvidas">
          <InquiryPeopleEditor value={pessoas} onChange={setPessoas} />
          <Select
            label="Autoria Determinada ou Indeterminada"
            options={["Determinada", "Indeterminada", "Desconhecida", "Sem Autoria"]}
            value={autoria}
            onChange={setAutoria}
          />
          <Select
            label="Réu Preso"
            options={["Sim", "Não"]}
            value={reuPreso}
            onChange={setReuPreso}
          />
        </SectionCard>

        <SectionCard title="Dados Operacionais">
          <Field
            label="Delegado Responsável"
            placeholder="Del. Nome Completo"
            value={delegadoResponsavel}
            onChange={(e) => setDelegadoResponsavel(e.target.value)}
          />
          <Field
            label="Equipe Responsável"
            placeholder="Ex.: DHPP - Equipe Alpha"
            value={equipe}
            onChange={(e) => setEquipe(e.target.value)}
          />
          <Field
            label="Escrivão"
            placeholder="Nome completo"
            value={escrivao}
            onChange={(e) => setEscrivao(e.target.value)}
          />
          <Field
            label="Bairro"
            placeholder="Informe o bairro"
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
          />
          <Field
            label="Distrito"
            placeholder="Ex.: 1º DP"
            value={distrito}
            onChange={(e) => setDistrito(e.target.value)}
          />
          <Field
            label="Motivação"
            placeholder="Motivação principal"
            value={motivacao}
            onChange={(e) => setMotivacao(e.target.value)}
          />
          <Select
            label="Vinculado a Facção"
            options={["Sim", "Não", "A definir"]}
            value={vinculadoFaccao}
            onChange={handleVinculoFaccaoChange}
          />
          {isYesValue(vinculadoFaccao) && (
            <Field
              label="Nome da Facção"
              placeholder="Informe a facção vinculada"
              value={nomeFaccao}
              onChange={(e) => setNomeFaccao(e.target.value)}
            />
          )}
          <Select
            label="Status de Diligências"
            value={statusDiligencias}
            onChange={setStatusDiligencias}
            options={[
              "Pendente",
              "Em Andamento",
              "Concluída",
              "Aguardando Terceiros",
              "Aguardando Aprovação/Revisão",
            ]}
          />
          <TextArea
            label="Diligências Pendentes"
            rows={4}
            placeholder="Descreva as diligências pendentes..."
            value={diligenciasPendentes}
            onChange={(e) => setDiligenciasPendentes(e.target.value)}
          />
          <TextArea
            label="Observações"
            rows={5}
            placeholder="Informações complementares..."
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </SectionCard>

        <SectionCard title="Relatório e Jurídico">
          <Select
            label="Medida Protetiva"
            options={["Sim", "Não"]}
            value={medidaProtetiva}
            onChange={handleMedidaProtetivaChange}
          />
          {isYesValue(medidaProtetiva) && (
            <Field
              label="Nº Processo da Medida"
              placeholder="0001234-55.2025.8.17.0001"
              value={numeroProcessoMedida}
              onChange={(e) => setNumeroProcessoMedida(e.target.value)}
            />
          )}
          <OptionSelect
            label="Situação do relatório"
            options={REPORT_STATUS_OPTIONS}
            value={relatorioStatus}
            onChange={(value) => handleRelatorioStatusChange(value as ReportStatus)}
          />
          {relatorioStatus !== "pendente" && (
            <Field
              label="Data do relatório"
              type="date"
              value={dataRelatorio}
              onChange={(e) => setDataRelatorio(e.target.value)}
            />
          )}
          {relatorioStatus === "enviado" && (
            <Field
              label="Data de envio do relatório"
              type="date"
              value={dataEnvioRelatorio}
              onChange={(e) => setDataEnvioRelatorio(e.target.value)}
            />
          )}
          <Field
            label="Representações Legais"
            type="number"
            placeholder="0"
            value={representacoesLegais}
            onChange={(e) => setRepresentacoesLegais(e.target.value)}
          />
        </SectionCard>

        {(erro || feedback) && (
          <div className="space-y-2">
            {erro && (
              <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {erro}
              </p>
            )}
            {feedback && (
              <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
                {feedback}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate({ to: "/inqueritos" })}
            className="px-5 py-2.5 rounded-lg text-sm border border-border hover:bg-accent"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Salvando..." : "Cadastrar Inquérito"}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border/60 bg-background/70 p-5 lg:p-7">
      <h2 className="text-sm font-bold tracking-[0.2em] text-primary uppercase mb-5">{title}</h2>
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
        {options.map((o) => (
          <option key={o}>{o}</option>
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
}: {
  label: string;
  options: readonly { value: string; label: string }[];
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div>
      <FormFieldLabel label={label} />
      <select
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function InlineNotice({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warning";
}) {
  const classes =
    tone === "warning"
      ? "border-amber-500/35 bg-amber-500/8 text-amber-100"
      : "border-primary/25 bg-primary/5 text-muted-foreground";

  return (
    <div className={`md:col-span-2 lg:col-span-3 rounded-lg border px-4 py-3 text-xs ${classes}`}>
      {children}
    </div>
  );
}
