import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { createInquerito } from "@/lib/repositories/inqueritosRepository";
import { getCurrentProfile } from "@/lib/auth";
import { canCreateCases, type UserProfile } from "@/lib/authz";

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
  const [vitima, setVitima] = useState("");
  const [investigado, setInvestigado] = useState("");
  const [numeroBo, setNumeroBo] = useState("");
  const [numeroFisico, setNumeroFisico] = useState("");
  const [prazo, setPrazo] = useState("");
  const [dataFato, setDataFato] = useState("");
  const [dataInstauracao, setDataInstauracao] = useState("");
  const [tipo, setTipo] = useState("IP");
  const [prioridade, setPrioridade] = useState("MÉDIA");
  const [gravidade, setGravidade] = useState("Média");
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
  const [relatorioEnviado, setRelatorioEnviado] = useState("");
  const [dataEnvioRelatorio, setDataEnvioRelatorio] = useState("");
  const [representacoesLegais, setRepresentacoesLegais] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);


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

  const handleHouveArmaDeFogoChange = (value: string) => {
    setHouveArmaDeFogo(value);
    if (value !== "Sim") {
      setArmaUtilizada("");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("submit novo caso iniciado");
    if (loading || !canCreateCases(profile)) return;
    setErro("");
    setFeedback("");
    setLoading(true);
    const payload = {
      numero_ppe: ppe.trim() || null,
      numero_bo: numeroBo.trim() || null,
      numero_fisico: numeroFisico.trim() || null,
      tipificacao: tipificacao.trim() || null,
      vitima: vitima.trim() || null,
      investigado: investigado.trim() || null,
      reu_preso: reuPreso || null,
      prazo: prazo || null,
      data_fato: dataFato || null,
      data_instauracao: dataInstauracao || null,
      tipo: tipo || null,
      prioridade: prioridade || null,
      gravidade: gravidade || null,
      status_diligencias: statusDiligencias || null,
      situacao: situacao || null,
      elucidado: elucidado || null,
      houve_arma_fogo: houveArmaDeFogo || null,
      arma_utilizada: armaUtilizada || null,
      delegado_responsavel: delegadoResponsavel.trim() || null,
      equipe: equipe.trim() || null,
      escrivao: escrivao.trim() || null,
      bairro: bairro.trim() || null,
      distrito: distrito.trim() || null,
      motivacao: motivacao.trim() || null,
      faccao: vinculadoFaccao || null,
      nome_faccao: nomeFaccao.trim() || null,
      diligencias_pendentes: diligenciasPendentes.trim() || null,
      observacoes: observacoes.trim() || null,
      medida_protetiva: medidaProtetiva || null,
      numero_processo_medida: numeroProcessoMedida.trim() || null,
      relatorio_enviado: relatorioEnviado || null,
      data_envio_relatorio: dataEnvioRelatorio || null,
      representacoes_legais: representacoesLegais.trim() || null,
    };
    console.log("payload enviado", payload);
    try {
      const created = await createInquerito(payload);
      console.log("resposta/erro do Supabase", created);
      setFeedback("Inquérito salvo com sucesso.");
      navigate({ to: "/inqueritos/$caseId", params: { caseId: created.id } });
    } catch (error) {
      console.error("resposta/erro do Supabase", error);
      if (typeof error === "object" && error !== null && "message" in error) {
        console.error("mensagem do erro Supabase:", error.message);
      }
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

  if (checkingAccess) return <AppLayout><p className="text-sm text-muted-foreground">Verificando permissões...</p></AppLayout>;

  if (!canCreateCases(profile)) return <AppLayout><div className="space-y-3"><h1 className="text-xl font-bold">Acesso restrito</h1><p className="text-sm text-muted-foreground">Seu perfil não possui permissão para criar inquéritos.</p></div></AppLayout>;

  return (
    <AppLayout>
      <PageHeader title="Novo Inquérito" subtitle="Cadastre um novo inquérito policial" showActions={false} />

      <form className="space-y-5 max-w-6xl pb-6" onSubmit={handleSubmit}>
        <SectionCard title="Identificação do Procedimento">
          <Field label="PPE" placeholder="Ex.: 001/2026-DPPC" value={ppe} onChange={(e) => setPpe(e.target.value)} />
          <Field label="Nº do B.O." placeholder="Ex.: 2026.000001" value={numeroBo} onChange={(e) => setNumeroBo(e.target.value)} />
          <Field label="Nº Físico" placeholder="Ex.: 2026.001.0001" value={numeroFisico} onChange={(e) => setNumeroFisico(e.target.value)} />
          <Select label="Tipo de Procedimento" options={["Inquérito Policial", "TCO", "Verificação Preliminar", "Outros"]} />
          <Select label="Visibilidade" options={["Público", "Privado"]} />
        </SectionCard>

        <SectionCard title="Datas">
          <Field label="Data do Fato" type="date" value={dataFato} onChange={(e) => setDataFato(e.target.value)} />
          <Field label="Data de Instauração" type="date" value={dataInstauracao} onChange={(e) => setDataInstauracao(e.target.value)} />
          <Field label="Prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </SectionCard>

        <SectionCard title="Classificação do Caso">
          <Field label="Tipificação" placeholder="Ex.: Homicídio Qualificado" value={tipificacao} onChange={(e) => setTipificacao(e.target.value)} />
          <Select label="Tipo" options={["IP", "APF", "TCO", "BOC", "AIAI"]} value={tipo} onChange={setTipo} />
          <Select
            label="Categoria do Caso"
            options={[
              "CVLI",
              "CVP",
              "MIAE",
              "Drogas",
              "Crimes Contra o Patrimônio",
              "Crimes Sexuais",
              "Violência Doméstica",
              "Violento",
              "Violência contra a Criança e o Adolescente",
              "Violência contra a Pessoa Idosa",
              "Crimes de Trânsito",
              "MAE",
              "Outro",
            ]}
          />
          <Select
            label="Situação" value={situacao} onChange={setSituacao}
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
          <Select label="Elucidado" options={["Sim", "Não"]} value={elucidado} onChange={setElucidado} />
          <Select label="Houve arma de fogo?" options={["Sim", "Não"]} value={houveArmaDeFogo} onChange={handleHouveArmaDeFogoChange} />
          {houveArmaDeFogo === "Sim" && <Field label="Arma Utilizada" placeholder="Ex: revólver calibre .38" value={armaUtilizada} onChange={(e) => setArmaUtilizada(e.target.value)} />}
        </SectionCard>

        <SectionCard title="Pessoas Envolvidas">
          <Field label="Vítima" placeholder="Nome completo da vítima" value={vitima} onChange={(e) => setVitima(e.target.value)} />
          <Field label="Autor / Investigado" placeholder="Nome ou 'Desconhecido'" value={investigado} onChange={(e) => setInvestigado(e.target.value)} />
          <Select label="Autoria Determinada ou Indeterminada" options={["Determinada", "Indeterminada", "Desconhecida", "Sem Autoria"]} />
          <Select label="Réu Preso" options={["Sim", "Não"]} value={reuPreso} onChange={setReuPreso} />
        </SectionCard>

        <SectionCard title="Dados Operacionais">
          <Field label="Delegado Responsável" placeholder="Del. Nome Completo" value={delegadoResponsavel} onChange={(e) => setDelegadoResponsavel(e.target.value)} />
          <Field label="Equipe Responsável" placeholder="Ex.: DHPP - Equipe Alpha" value={equipe} onChange={(e) => setEquipe(e.target.value)} />
          <Field label="Escrivão" placeholder="Nome completo" value={escrivao} onChange={(e) => setEscrivao(e.target.value)} />
          <Field label="Bairro" placeholder="Informe o bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
          <Field label="Distrito" placeholder="Ex.: 1º DP" value={distrito} onChange={(e) => setDistrito(e.target.value)} />
          <Field label="Motivação" placeholder="Motivação principal" value={motivacao} onChange={(e) => setMotivacao(e.target.value)} />
          <Select label="Vinculado a Facção" options={["Sim", "Não", "A definir"]} value={vinculadoFaccao} onChange={setVinculadoFaccao} />
          <Field label="Nome da Facção" placeholder="Informe se houver" value={nomeFaccao} onChange={(e) => setNomeFaccao(e.target.value)} />
          <Select
            label="Status de Diligências" value={statusDiligencias} onChange={setStatusDiligencias}
            options={[
              "Pendente",
              "Em Andamento",
              "Concluída",
              "Aguardando Terceiros",
              "Aguardando Aprovação/Revisão",
            ]}
          />
          <TextArea label="Diligências Pendentes" rows={4} placeholder="Descreva as diligências pendentes..." value={diligenciasPendentes} onChange={(e) => setDiligenciasPendentes(e.target.value)} />
          <TextArea label="Observações" rows={5} placeholder="Informações complementares..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </SectionCard>

        <SectionCard title="Relatório e Jurídico">
          <Select label="Medida Protetiva" options={["Sim", "Não"]} value={medidaProtetiva} onChange={setMedidaProtetiva} />
          <Field label="Nº Processo da Medida" placeholder="0001234-55.2025.8.17.0001" value={numeroProcessoMedida} onChange={(e) => setNumeroProcessoMedida(e.target.value)} />
          <Select label="Relatório Enviado" options={["Sim", "Não"]} value={relatorioEnviado} onChange={setRelatorioEnviado} />
          <Field label="Data de Envio do Relatório" type="date" value={dataEnvioRelatorio} onChange={(e) => setDataEnvioRelatorio(e.target.value)} />
          <Field label="Representações Legais" type="number" placeholder="0" value={representacoesLegais} onChange={(e) => setRepresentacoesLegais(e.target.value)} />
        </SectionCard>

        {(erro || feedback) && (
          <div className="space-y-2">
            {erro && <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">{erro}</p>}
            {feedback && <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">{feedback}</p>}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button type="button" className="px-5 py-2.5 rounded-lg text-sm border border-border hover:bg-accent">
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

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs font-bold tracking-wider text-muted-foreground mb-2">{label.toUpperCase()}</label>
      <input {...props} className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
    </div>
  );
}

function TextArea({ label, rows = 4, ...props }: { label: string; rows?: number } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="md:col-span-2 lg:col-span-3">
      <label className="block text-xs font-bold tracking-wider text-muted-foreground mb-2">{label.toUpperCase()}</label>
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
  options: string[];
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-bold tracking-wider text-muted-foreground mb-2">{label.toUpperCase()}</label>
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
