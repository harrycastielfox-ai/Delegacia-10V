import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FormEvent, useMemo, useState } from "react";
import { createRepresentacao } from "@/lib/repositories/representacoesRepository";
import { logAuditoria } from "@/lib/repositories/auditoriaRepository";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/nova-representacao")({
  head: () => ({ meta: [{ title: "Cadastrar Representação — SIPI" }] }),
  component: NovaRepresentacao,
});

const tiposRepresentacao = ["Prisão Temporária", "Prisão Preventiva", "Busca e Apreensão", "Busca e Apreensão Domiciliar", "Quebra de Sigilo / Interceptação", "Interceptação Telefônica", "Medida Protetiva", "Outra"] as const;
const statusRepresentacao = ["Em elaboração", "Enviada ao Judiciário", "Aguardando análise judicial", "Deferida", "Indeferida", "Cumprida", "Cumprida parcialmente", "Revogada / Prejudicada"] as const;

const statusComDecisao = new Set(["Deferida", "Indeferida", "Cumprida", "Cumprida parcialmente", "Revogada / Prejudicada"]);
const statusComCumprimento = new Set(["Cumprida", "Cumprida parcialmente"]);

function NovaRepresentacao() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [erro, setErro] = useState("");

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setErro("");
    setFeedback("");
    setLoading(true);

    const tipoFinal = tipoRepresentacao === "Outra" ? tipoOutra : tipoRepresentacao;

    try {
      const created = await createRepresentacao({
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
      setFeedback("Representação salva com sucesso.");
      navigate({ to: "/representacoes" });
    } catch (error) {
      const isRlsError = typeof error === "object" && error !== null && "code" in error && (error.code === "42501" || error.code === "PGRST301");
      setErro(isRlsError ? "Permissão negada ao inserir no Supabase (RLS). Verifique as políticas de INSERT da tabela public.representacoes para a chave pública." : "Falha ao salvar representação no Supabase.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout>
      <PageHeader title="Cadastrar Representação" subtitle="Registro de medida judicial vinculada a procedimento policial" showActions={false} />
      <form className="space-y-5 max-w-6xl pb-6" onSubmit={handleSubmit}>
        <SectionCard title="Identificação da Representação">
          <Field label="Nº PPE / Procedimento relacionado" placeholder="Ex.: 72921/2025" value={ppe} onChange={(e) => setPpe(e.target.value)} />
          <Field label="Nº Processo Judicial" placeholder="Ex.: 8001619-92.2025.8.05.0111" value={processo} onChange={(e) => setProcesso(e.target.value)} />
          <Select label="Tipo de Representação" options={tiposRepresentacao} value={tipoRepresentacao} onChange={setTipoRepresentacao} />
          <Field label="Data da Representação" type="date" value={dataRepresentacao} onChange={(e) => setDataRepresentacao(e.target.value)} />
          <Field label="Responsável pela Representação" placeholder="Ex.: Del. Nome Completo" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
          {exibeCampoOutra && <Field label="Especificar representação" placeholder="Descreva o tipo de representação" value={tipoOutra} onChange={(e) => setTipoOutra(e.target.value)} />}
        </SectionCard>

        <SectionCard title="Pessoas Envolvidas">
          <Field label="Vítima" placeholder="Nome completo da vítima" value={vitima} onChange={(e) => setVitima(e.target.value)} />
          <Field label="Investigado / Representado" placeholder="Nome do investigado" value={investigado} onChange={(e) => setInvestigado(e.target.value)} />
          <Select label="Autor preso?" options={["Sim", "Não", "Não informado"]} value={autorPreso} onChange={setAutorPreso} />
        </SectionCard>

        <SectionCard title="Fundamentação e Finalidade">
          <TextArea label="Resumo dos fatos" placeholder="Descreva resumidamente os fatos que motivam a representação..." value={resumoFatos} onChange={(e) => setResumoFatos(e.target.value)} />
          <TextArea label="Fundamentação da medida" placeholder="Informe a base jurídica e os elementos de convicção..." value={fundamentacao} onChange={(e) => setFundamentacao(e.target.value)} />
          <TextArea label="Objetivo da representação" placeholder="Ex.: garantir produção de prova, preservar vítima, capturar investigado..." value={objetivo} onChange={(e) => setObjetivo(e.target.value)} />
          <TextArea label="Diligências relacionadas" placeholder="Liste diligências já realizadas e pendentes relacionadas ao pedido..." value={diligenciasRelacionadas} onChange={(e) => setDiligenciasRelacionadas(e.target.value)} />
        </SectionCard>

        <SectionCard title="Tramitação Judicial">
          <Select label="Status da Representação" options={statusRepresentacao} value={status} onChange={setStatus} />
          <Field label="Data de envio ao Judiciário" type="date" value={dataEnvioJudiciario} onChange={(e) => setDataEnvioJudiciario(e.target.value)} />
          {exibeDataDecisao && <Field label="Data da decisão judicial" type="date" value={dataDecisaoJudicial} onChange={(e) => setDataDecisaoJudicial(e.target.value)} />}
          <TextArea label="Observações da decisão" placeholder="Observações sobre decisão, condicionantes e determinações judiciais..." value={observacoesDecisao} onChange={(e) => setObservacoesDecisao(e.target.value)} />
        </SectionCard>

        {exibeBlocoCumprimento && (
          <SectionCard title="Cumprimento da Medida">
            <Field label="Data do cumprimento" type="date" value={dataCumprimento} onChange={(e) => setDataCumprimento(e.target.value)} />
            <Field label="Equipe responsável pelo cumprimento" placeholder="Ex.: Equipe Alpha" value={equipeCumprimento} onChange={(e) => setEquipeCumprimento(e.target.value)} />
            <TextArea label="Resultado do cumprimento" placeholder="Ex.: positiva, parcial, sem êxito, com apreensões..." value={resultadoCumprimento} onChange={(e) => setResultadoCumprimento(e.target.value)} />
            <TextArea label="Observações do cumprimento" placeholder="Detalhes operacionais adicionais..." value={observacoesCumprimento} onChange={(e) => setObservacoesCumprimento(e.target.value)} />
          </SectionCard>
        )}

        <SectionCard title="Controle Interno">
          <Select label="Prioridade operacional" options={["Normal", "Atenção", "Urgente"]} value={prioridadeOperacional} onChange={setPrioridadeOperacional} />
          <Select label="Pedido sigiloso?" options={["Sim", "Não"]} value={pedidoSigiloso} onChange={setPedidoSigiloso} />
          <TextArea label="Observações internas" placeholder="Anotações internas da unidade sobre o acompanhamento da representação..." value={observacoesInternas} onChange={(e) => setObservacoesInternas(e.target.value)} />
        </SectionCard>

        {erro && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{erro}</div>}
        {feedback && <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{feedback}</div>}

        <div className="flex gap-3 justify-end">
          <Link to="/representacoes" className="px-5 py-2.5 rounded-lg text-sm border border-border hover:bg-accent">Cancelar</Link>
          <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "Salvando..." : "Salvar Representação"}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-xl border border-border/60 bg-background/70 p-5 lg:p-7"><h2 className="text-sm font-bold tracking-[0.2em] text-primary uppercase mb-5">{title}</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div></section>; }
function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) { return <div><label className="block text-xs font-bold tracking-wider text-muted-foreground mb-2">{label.toUpperCase()}</label><input {...props} className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" /></div>; }
function TextArea({ label, rows = 4, ...props }: { label: string; rows?: number } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <div className="md:col-span-2 lg:col-span-3"><label className="block text-xs font-bold tracking-wider text-muted-foreground mb-2">{label.toUpperCase()}</label><textarea rows={rows} {...props} className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" /></div>; }
function Select({ label, options, value, onChange }: { label: string; options: readonly string[]; value?: string; onChange?: (value: string) => void; }) { return <div><label className="block text-xs font-bold tracking-wider text-muted-foreground mb-2">{label.toUpperCase()}</label><select value={value} onChange={(e) => onChange?.(e.target.value)} className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"><option value="">Selecione…</option>{options.map((option) => <option key={option}>{option}</option>)}</select></div>; }
