import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes, useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { getInqueritoById, updateInquerito } from "@/lib/repositories/inqueritosRepository";
import { logAuditoria } from "@/lib/repositories/auditoriaRepository";
import { getCurrentProfile } from "@/lib/auth";
import { canEditCases, canOnlyViewPublicCases, type UserProfile } from "@/lib/authz";

export const Route = createFileRoute("/inqueritos/$caseId/editar")({ component: EditarInquerito });

function toInputDate(value: string | null | undefined) {
  if (!value) return "";
  const normalized = value.trim();
  if (!normalized) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "";
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeProcedureValue(value: string | null | undefined) {
  const normalized = (value ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  if (!normalized) return "";
  if (normalized === "ip" || normalized === "inquerito policial") return "Inquérito Policial";
  if (normalized === "tco") return "TCO";
  if (normalized === "vp" || normalized === "verificacao preliminar") return "Verificação Preliminar";
  if (normalized === "outro" || normalized === "outros") return "Outros";
  return value ?? "";
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string" && error.message.trim()) {
    return `${fallback} (${error.message})`;
  }
  return fallback;
}

function EditarInquerito() {
  const { caseId } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [feedback, setFeedback] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [restricted, setRestricted] = useState(false);

  const [numeroPpe, setNumeroPpe] = useState("");
  const [numeroFisico, setNumeroFisico] = useState("");
  const [numeroBo, setNumeroBo] = useState("");
  const [tipificacao, setTipificacao] = useState("");
  const [gravidade, setGravidade] = useState("");
  const [tipo, setTipo] = useState("");
  const [prioridade, setPrioridade] = useState("");
  const [situacao, setSituacao] = useState("");
  const [statusDiligencias, setStatusDiligencias] = useState("");
  const [elucidado, setElucidado] = useState("");
  const [dataFato, setDataFato] = useState("");
  const [dataInstauracao, setDataInstauracao] = useState("");
  const [prazo, setPrazo] = useState("");
  const [vitima, setVitima] = useState("");
  const [investigado, setInvestigado] = useState("");
  const [reuPreso, setReuPreso] = useState("");
  const [houveArmaFogo, setHouveArmaFogo] = useState("");
  const [armaUtilizada, setArmaUtilizada] = useState("");
  const [bairro, setBairro] = useState("");
  const [distrito, setDistrito] = useState("");
  const [motivacao, setMotivacao] = useState("");
  const [vinculadoFaccao, setVinculadoFaccao] = useState("");
  const [nomeFaccao, setNomeFaccao] = useState("");
  const [delegadoResponsavel, setDelegadoResponsavel] = useState("");
  const [equipe, setEquipe] = useState("");
  const [escrivao, setEscrivao] = useState("");
  const [diligenciasPendentes, setDiligenciasPendentes] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [relatorioEnviado, setRelatorioEnviado] = useState("");
  const [dataEnvioRelatorio, setDataEnvioRelatorio] = useState("");
  const [medidaProtetiva, setMedidaProtetiva] = useState("");
  const [numeroProcessoMedida, setNumeroProcessoMedida] = useState("");
  const [representacoesLegais, setRepresentacoesLegais] = useState("");
  const [visibilidade, setVisibilidade] = useState("");
  const [autoria, setAutoria] = useState("");

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      setLoading(true);
      setErro("");
      setNotFound(false);
      try {
        const [currentProfile, inquerito] = await Promise.all([getCurrentProfile(), getInqueritoById(caseId)]);
        setProfile(currentProfile);
        if (!canEditCases(currentProfile)) { setRestricted(true); return; }
        const raw = inquerito as unknown as Record<string, unknown>;
        const visibility = String(raw.visibilidade ?? raw.visibility ?? raw.publico_privado ?? "").toLowerCase();
        const isPrivate = visibility.includes("priv") || visibility.includes("sig");
        if (isPrivate && canOnlyViewPublicCases(currentProfile)) { setRestricted(true); return; }
        if (!ativo) return;
        if (!inquerito) {
          setNotFound(true);
          return;
        }

        setNumeroPpe(inquerito.numero_ppe ?? "");
        setNumeroFisico(inquerito.numero_fisico ?? "");
        setNumeroBo(inquerito.numero_bo ?? "");
        setTipificacao(inquerito.tipificacao ?? "");
        setGravidade(inquerito.gravidade ?? "");
        setTipo(normalizeProcedureValue(inquerito.tipo));
        setPrioridade(inquerito.prioridade ?? "");
        setSituacao(inquerito.situacao ?? "");
        setStatusDiligencias(inquerito.status_diligencias ?? "");
        setElucidado(inquerito.elucidado ?? "");
        setDataFato(toInputDate(inquerito.data_fato));
        setDataInstauracao(toInputDate(inquerito.data_instauracao));
        setPrazo(toInputDate(inquerito.prazo));
        setVitima(inquerito.vitima ?? "");
        setInvestigado(inquerito.investigado ?? "");
        setAutoria(String(raw.autoria_determinada ?? ""));
        setReuPreso(inquerito.reu_preso ?? "");
        setHouveArmaFogo(inquerito.houve_arma_fogo ?? "");
        setArmaUtilizada(inquerito.arma_utilizada ?? "");
        setBairro(inquerito.bairro ?? "");
        setDistrito(inquerito.distrito ?? "");
        setMotivacao(inquerito.motivacao ?? "");
        setVinculadoFaccao(inquerito.faccao ?? "");
        setNomeFaccao(inquerito.nome_faccao ?? "");
        setDelegadoResponsavel(inquerito.delegado_responsavel ?? "");
        setEquipe(inquerito.equipe ?? "");
        setEscrivao(inquerito.escrivao ?? "");
        setDiligenciasPendentes(inquerito.diligencias_pendentes ?? "");
        setObservacoes(inquerito.observacoes ?? "");
        setRelatorioEnviado(inquerito.relatorio_enviado ?? "");
        setDataEnvioRelatorio(toInputDate(inquerito.data_envio_relatorio));
        setMedidaProtetiva(inquerito.medida_protetiva ?? "");
        setNumeroProcessoMedida(inquerito.numero_processo_medida ?? "");
        setRepresentacoesLegais(inquerito.representacoes_legais ?? "");
        const savedVisibilidade = (inquerito.visibilidade ?? "").trim();
        setVisibilidade(savedVisibilidade);
        console.debug("[DEV][Inqueritos][Editar] visibilidade carregada", {
          inqueritoId: caseId,
          visibilidade: savedVisibilidade || null,
        });
      } catch (error) {
        if (!ativo) return;
        setErro(getErrorMessage(error, "Erro ao carregar"));
      } finally {
        if (ativo) setLoading(false);
      }
    };
    carregar();
    return () => {
      ativo = false;
    };
  }, [caseId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || !canEditCases(profile)) return;
    setErro("");
    setFeedback("");
    setSaving(true);

    try {
      const payload = {
        numero_ppe: numeroPpe.trim() || null,
        numero_fisico: numeroFisico.trim() || null,
        numero_bo: numeroBo.trim() || null,
        visibilidade: visibilidade.trim() || null,
        tipificacao: tipificacao.trim() || null,
        gravidade: gravidade.trim() || null,
        tipo: tipo.trim() || null,
        prioridade: prioridade.trim() || null,
        situacao: situacao.trim() || null,
        status_diligencias: statusDiligencias.trim() || null,
        elucidado: elucidado.trim() || null,
        data_fato: dataFato || null,
        data_instauracao: dataInstauracao || null,
        prazo: prazo || null,
        vitima: vitima.trim() || null,
        investigado: investigado.trim() || null,
        reu_preso: reuPreso.trim() || null,
        houve_arma_fogo: houveArmaFogo.trim() || null,
        arma_utilizada: armaUtilizada.trim() || null,
        bairro: bairro.trim() || null,
        distrito: distrito.trim() || null,
        motivacao: motivacao.trim() || null,
        faccao: vinculadoFaccao.trim() || null,
        nome_faccao: nomeFaccao.trim() || null,
        delegado_responsavel: delegadoResponsavel.trim() || null,
        equipe: equipe.trim() || null,
        escrivao: escrivao.trim() || null,
        diligencias_pendentes: diligenciasPendentes.trim() || null,
        observacoes: observacoes.trim() || null,
        relatorio_enviado: relatorioEnviado.trim() || null,
        data_envio_relatorio: dataEnvioRelatorio || null,
        medida_protetiva: medidaProtetiva.trim() || null,
        numero_processo_medida: numeroProcessoMedida.trim() || null,
        representacoes_legais: representacoesLegais.trim() || null,
      };

      await updateInquerito(caseId, payload);
      try {
        const auditResult = await logAuditoria({
          acao: "update",
          modulo: "inqueritos",
          entidade: "inquerito",
          entidade_id: caseId,
          descricao: "Editou inquérito",
          metadata: {
            ppe: numeroPpe.trim() || "",
            campos_possivelmente_atualizados: [
              "numero_ppe", "numero_fisico", "numero_bo", "tipificacao", "gravidade", "tipo", "prioridade", "situacao", "status_diligencias",
            ],
          },
        });
        if (auditResult.error) console.warn("[auditoria]", auditResult.error);
      } catch (auditError) {
        console.warn("[auditoria]", auditError);
      }

      setFeedback("Inquérito atualizado com sucesso");
      setTimeout(() => {
        navigate({ to: "/inqueritos/$caseId", params: { caseId } });
      }, 300);
    } catch (error) {
      setErro(getErrorMessage(error, "Erro ao salvar"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AppLayout><div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">Carregando dados do inquérito...</div></AppLayout>;

  if (restricted) {
    return <AppLayout><div className="max-w-3xl space-y-3"><Link to="/inqueritos" className="text-xs border border-border rounded-md px-3 py-1.5 inline-block">← Voltar para inquéritos</Link><p className="rounded-lg border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-warning">Acesso restrito</p></div></AppLayout>;
  }

  if (notFound) {
    return (
      <AppLayout>
        <div className="max-w-3xl space-y-3">
          <Link to="/inqueritos/$caseId" params={{ caseId }} className="text-xs border border-border rounded-md px-3 py-1.5 inline-block">← Voltar aos detalhes</Link>
          <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">Inquérito não encontrado</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl space-y-4 pb-6">
        <Link to="/inqueritos/$caseId" params={{ caseId }} className="text-xs border border-border rounded-md px-3 py-1.5 inline-block">← Voltar aos detalhes</Link>
        <h1 className="text-2xl font-bold">Editar Inquérito</h1>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <SectionCard title="Identificação do Procedimento">
            <Field label="PPE" placeholder="Ex.: 001/2026-DPPC" value={numeroPpe} onChange={(e) => setNumeroPpe(e.target.value)} />
            <Field label="Nº do B.O." placeholder="Ex.: 2026.000001" value={numeroBo} onChange={(e) => setNumeroBo(e.target.value)} />
            <Field label="Nº Físico" placeholder="Ex.: 2026.001.0001" value={numeroFisico} onChange={(e) => setNumeroFisico(e.target.value)} />
            <Select label="Tipo de Procedimento" value={tipo} onChange={setTipo} options={["Inquérito Policial", "TCO", "Verificação Preliminar", "Outros"]} />
            <Select label="Visibilidade" options={["Público", "Privado"]} value={visibilidade} onChange={setVisibilidade} />
          </SectionCard>

          <SectionCard title="Datas">
            <Field label="Data do Fato" type="date" value={dataFato} onChange={(e) => setDataFato(e.target.value)} />
            <Field label="Data de Instauração" type="date" value={dataInstauracao} onChange={(e) => setDataInstauracao(e.target.value)} />
            <Field label="Prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </SectionCard>

          <SectionCard title="Classificação do Caso">
            <Field label="Tipificação" placeholder="Ex.: Homicídio Qualificado" value={tipificacao} onChange={(e) => setTipificacao(e.target.value)} />
            <Select label="Categoria do Caso" value={gravidade} onChange={setGravidade} options={["CVLI", "CVP", "MIAE", "Drogas", "Crimes Contra o Patrimônio", "Crimes Sexuais", "Violência Doméstica", "Violento", "Violência contra a Criança e o Adolescente", "Violência contra a Pessoa Idosa", "Crimes de Trânsito", "MAE", "Outro"]} />
            <Select label="Situação" value={situacao} onChange={setSituacao} options={["Instaurado", "Em Andamento", "Para Relatar", "Relatado", "Aguardando Diligência", "Aguardando Laudo Pericial", "Requisição Ministerial/Judicial", "Remetido", "Arquivado"]} />
            <Select label="Elucidado" value={elucidado} onChange={setElucidado} options={["Sim", "Não"]} />
            <Select label="Houve arma de fogo?" value={houveArmaFogo} onChange={setHouveArmaFogo} options={["Sim", "Não"]} />
            {houveArmaFogo === "Sim" && <Field label="Arma Utilizada" placeholder="Ex: revólver calibre .38" value={armaUtilizada} onChange={(e) => setArmaUtilizada(e.target.value)} />}
          </SectionCard>

          <SectionCard title="Pessoas Envolvidas">
            <Field label="Vítima" placeholder="Nome completo da vítima" value={vitima} onChange={(e) => setVitima(e.target.value)} />
            <Field label="Autor / Investigado" placeholder="Nome ou 'Desconhecido'" value={investigado} onChange={(e) => setInvestigado(e.target.value)} />
            <Select label="Autoria Determinada ou Indeterminada" value={autoria} onChange={setAutoria} options={["Determinada", "Indeterminada", "Desconhecida", "Sem Autoria"]} />
            <Select label="Réu Preso" value={reuPreso} onChange={setReuPreso} options={["Sim", "Não"]} />
          </SectionCard>

          <SectionCard title="Dados Operacionais">
            <Field label="Delegado Responsável" value={delegadoResponsavel} onChange={(e) => setDelegadoResponsavel(e.target.value)} />
            <Field label="Equipe Responsável" value={equipe} onChange={(e) => setEquipe(e.target.value)} />
            <Field label="Escrivão" value={escrivao} onChange={(e) => setEscrivao(e.target.value)} />
            <Field label="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
            <Field label="Distrito" value={distrito} onChange={(e) => setDistrito(e.target.value)} />
            <Field label="Motivação" value={motivacao} onChange={(e) => setMotivacao(e.target.value)} />
            <Select label="Vinculado a Facção" value={vinculadoFaccao} onChange={setVinculadoFaccao} options={["Sim", "Não", "A definir"]} />
            <Field label="Nome da Facção" value={nomeFaccao} onChange={(e) => setNomeFaccao(e.target.value)} />
            <Select label="Status de Diligências" value={statusDiligencias} onChange={setStatusDiligencias} options={["Pendente", "Em Andamento", "Concluída", "Aguardando Terceiros", "Aguardando Aprovação/Revisão"]} />
            <TextArea label="Diligências Pendentes" rows={4} placeholder="Descreva as diligências pendentes..." value={diligenciasPendentes} onChange={(e) => setDiligenciasPendentes(e.target.value)} />
            <TextArea label="Observações" rows={5} placeholder="Informações complementares..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </SectionCard>

          <SectionCard title="Relatório e Jurídico">
            <Select label="Medida Protetiva" value={medidaProtetiva} onChange={setMedidaProtetiva} options={["Sim", "Não"]} />
            <Field label="Nº Processo da Medida" value={numeroProcessoMedida} onChange={(e) => setNumeroProcessoMedida(e.target.value)} />
            <Select label="Relatório Enviado" value={relatorioEnviado} onChange={setRelatorioEnviado} options={["Sim", "Não"]} />
            <Field label="Data de Envio do Relatório" type="date" value={dataEnvioRelatorio} onChange={(e) => setDataEnvioRelatorio(e.target.value)} />
            <Field label="Representações Legais" type="number" value={representacoesLegais} onChange={(e) => setRepresentacoesLegais(e.target.value)} />
          </SectionCard>

          {(erro || feedback || saving) && (
            <div className="space-y-2">
              {erro && <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">{erro}</p>}
              {saving && <p className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground">Salvando...</p>}
              {feedback && <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">Inquérito atualizado com sucesso</p>}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => navigate({ to: "/inqueritos/$caseId", params: { caseId } })} className="px-5 py-2.5 rounded-lg text-sm border border-border hover:bg-accent">Cancelar</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Salvando..." : "Salvar alterações"}</button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border/60 bg-background/70 p-5 lg:p-7">
      <h2 className="text-sm font-bold tracking-[0.2em] text-primary uppercase mb-5">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </section>
  );
}

function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs font-bold tracking-wider text-muted-foreground mb-2">{label.toUpperCase()}</label>
      <input {...props} className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
    </div>
  );
}

function TextArea({ label, rows = 4, ...props }: { label: string; rows?: number } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="md:col-span-2 lg:col-span-3">
      <label className="block text-xs font-bold tracking-wider text-muted-foreground mb-2">{label.toUpperCase()}</label>
      <textarea {...props} rows={rows} className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
    </div>
  );
}

function Select({ label, options, value, onChange }: { label: string; options: string[]; value?: string; onChange?: (value: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-bold tracking-wider text-muted-foreground mb-2">{label.toUpperCase()}</label>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
      >
        <option value="">Selecione…</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}
