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
  const [delegadoResponsavel, setDelegadoResponsavel] = useState("");
  const [equipe, setEquipe] = useState("");
  const [escrivao, setEscrivao] = useState("");
  const [diligenciasPendentes, setDiligenciasPendentes] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [relatorioEnviado, setRelatorioEnviado] = useState("");
  const [dataEnvioRelatorio, setDataEnvioRelatorio] = useState("");
  const [medidaProtetiva, setMedidaProtetiva] = useState("");
  const [numeroProcessoMedida, setNumeroProcessoMedida] = useState("");

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
        const visibility = String(raw.visibilidade ?? raw.visibility ?? raw.publico_privado ?? "publico").toLowerCase();
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
        setTipo(inquerito.tipo ?? "");
        setPrioridade(inquerito.prioridade ?? "");
        setSituacao(inquerito.situacao ?? "");
        setStatusDiligencias(inquerito.status_diligencias ?? "");
        setDataFato(toInputDate(inquerito.data_fato));
        setDataInstauracao(toInputDate(inquerito.data_instauracao));
        setPrazo(toInputDate(inquerito.prazo));
        setVitima(inquerito.vitima ?? "");
        setInvestigado(inquerito.investigado ?? "");
        setReuPreso(inquerito.reu_preso ?? "");
        setHouveArmaFogo(inquerito.houve_arma_fogo ?? "");
        setArmaUtilizada(inquerito.arma_utilizada ?? "");
        setBairro(inquerito.bairro ?? "");
        setDistrito(inquerito.distrito ?? "");
        setDelegadoResponsavel(inquerito.delegado_responsavel ?? "");
        setEquipe(inquerito.equipe ?? "");
        setEscrivao(inquerito.escrivao ?? "");
        setDiligenciasPendentes(inquerito.diligencias_pendentes ?? "");
        setObservacoes(inquerito.observacoes ?? "");
        setRelatorioEnviado(inquerito.relatorio_enviado ?? "");
        setDataEnvioRelatorio(toInputDate(inquerito.data_envio_relatorio));
        setMedidaProtetiva(inquerito.medida_protetiva ?? "");
        setNumeroProcessoMedida(inquerito.numero_processo_medida ?? "");
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
      await updateInquerito(caseId, {
        numero_ppe: numeroPpe.trim() || null,
        numero_fisico: numeroFisico.trim() || null,
        numero_bo: numeroBo.trim() || null,
        tipificacao: tipificacao.trim() || null,
        gravidade: gravidade.trim() || null,
        tipo: tipo.trim() || null,
        prioridade: prioridade.trim() || null,
        situacao: situacao.trim() || null,
        status_diligencias: statusDiligencias.trim() || null,
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
        delegado_responsavel: delegadoResponsavel.trim() || null,
        equipe: equipe.trim() || null,
        escrivao: escrivao.trim() || null,
        diligencias_pendentes: diligenciasPendentes.trim() || null,
        observacoes: observacoes.trim() || null,
        relatorio_enviado: relatorioEnviado.trim() || null,
        data_envio_relatorio: dataEnvioRelatorio || null,
        medida_protetiva: medidaProtetiva.trim() || null,
        numero_processo_medida: numeroProcessoMedida.trim() || null,
      });
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
          <SectionCard title="Identificação e Classificação">
            <Field label="PPE" value={numeroPpe} onChange={(e) => setNumeroPpe(e.target.value)} />
            <Field label="Nº Físico" value={numeroFisico} onChange={(e) => setNumeroFisico(e.target.value)} />
            <Field label="Nº B.O." value={numeroBo} onChange={(e) => setNumeroBo(e.target.value)} />
            <Field label="Tipificação" value={tipificacao} onChange={(e) => setTipificacao(e.target.value)} />
            <Field label="Gravidade" value={gravidade} onChange={(e) => setGravidade(e.target.value)} />
            <Field label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} />
            <Field label="Prioridade" value={prioridade} onChange={(e) => setPrioridade(e.target.value)} />
            <Field label="Situação" value={situacao} onChange={(e) => setSituacao(e.target.value)} />
            <Field label="Status Diligências" value={statusDiligencias} onChange={(e) => setStatusDiligencias(e.target.value)} />
          </SectionCard>

          <SectionCard title="Datas e Envolvidos">
            <Field label="Data do Fato" type="date" value={dataFato} onChange={(e) => setDataFato(e.target.value)} />
            <Field label="Data Instauração" type="date" value={dataInstauracao} onChange={(e) => setDataInstauracao(e.target.value)} />
            <Field label="Prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            <Field label="Vítima" value={vitima} onChange={(e) => setVitima(e.target.value)} />
            <Field label="Investigado" value={investigado} onChange={(e) => setInvestigado(e.target.value)} />
            <Field label="Réu Preso" value={reuPreso} onChange={(e) => setReuPreso(e.target.value)} />
            <Field label="Houve Arma de Fogo" value={houveArmaFogo} onChange={(e) => setHouveArmaFogo(e.target.value)} />
            <Field label="Arma Utilizada" value={armaUtilizada} onChange={(e) => setArmaUtilizada(e.target.value)} />
          </SectionCard>

          <SectionCard title="Operacional e Relatório">
            <Field label="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
            <Field label="Distrito" value={distrito} onChange={(e) => setDistrito(e.target.value)} />
            <Field label="Delegado Responsável" value={delegadoResponsavel} onChange={(e) => setDelegadoResponsavel(e.target.value)} />
            <Field label="Equipe" value={equipe} onChange={(e) => setEquipe(e.target.value)} />
            <Field label="Escrivão" value={escrivao} onChange={(e) => setEscrivao(e.target.value)} />
            <Field label="Relatório Enviado" value={relatorioEnviado} onChange={(e) => setRelatorioEnviado(e.target.value)} />
            <Field label="Data Envio Relatório" type="date" value={dataEnvioRelatorio} onChange={(e) => setDataEnvioRelatorio(e.target.value)} />
            <Field label="Medida Protetiva" value={medidaProtetiva} onChange={(e) => setMedidaProtetiva(e.target.value)} />
            <Field label="Nº Processo Medida" value={numeroProcessoMedida} onChange={(e) => setNumeroProcessoMedida(e.target.value)} />
            <TextArea label="Diligências Pendentes" value={diligenciasPendentes} onChange={(e) => setDiligenciasPendentes(e.target.value)} />
            <TextArea label="Observações" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
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

function TextArea({ label, ...props }: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="md:col-span-2 lg:col-span-3">
      <label className="block text-xs font-bold tracking-wider text-muted-foreground mb-2">{label.toUpperCase()}</label>
      <textarea {...props} rows={4} className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
    </div>
  );
}
