import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { createInquerito } from "@/lib/repositories/inqueritosRepository";

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
  const [prazo, setPrazo] = useState("");
  const [dataFato, setDataFato] = useState("");
  const [dataInstauracao, setDataInstauracao] = useState("");

  const handleHouveArmaDeFogoChange = (value: string) => {
    setHouveArmaDeFogo(value);
    if (value !== "Sim") {
      setArmaUtilizada("");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("submit novo caso iniciado");
    if (loading) return;
    setErro("");
    setFeedback("");
    setLoading(true);
    const payload = {
      numero_ppe: ppe.trim() || null,
      tipificacao: tipificacao.trim() || null,
      vitima: vitima.trim() || null,
      prazo: prazo || null,
      data_fato: dataFato || null,
      data_instauracao: dataInstauracao || null,
      tipo: "IP",
      prioridade: "MÉDIA",
      gravidade: "Média",
      status_diligencias: "Pendente",
      situacao: "Instaurado",
      houve_arma_fogo: houveArmaDeFogo || null,
      arma_utilizada: armaUtilizada || null,
    };
    console.log("payload enviado", payload);
    try {
      const created = await createInquerito(payload);
      console.log("resposta/erro do Supabase", created);
      setFeedback("Inquérito salvo com sucesso.");
      navigate({ to: "/inqueritos/$caseId", params: { caseId: created.id } });
    } catch (error) {
      console.error("resposta/erro do Supabase", error);
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

  return (
    <AppLayout>
      <PageHeader title="Novo Inquérito" subtitle="Cadastre um novo inquérito policial" showActions={false} />

      <form className="space-y-5 max-w-6xl pb-6" onSubmit={handleSubmit}>
        <SectionCard title="Identificação do Procedimento">
          <Field label="PPE" placeholder="Ex.: 001/2026-DPPC" value={ppe} onChange={(e) => setPpe(e.target.value)} />
          <Field label="Nº do B.O." placeholder="Ex.: 2026.000001" />
          <Field label="Nº Físico" placeholder="Ex.: 2026.001.0001" />
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
          <Select label="Tipo" options={["IP", "APF", "TCO", "BOC", "AIAI"]} />
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
            label="Situação"
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
          <Select label="Elucidado" options={["Sim", "Não"]} />
          <Select label="Houve arma de fogo?" options={["Sim", "Não"]} value={houveArmaDeFogo} onChange={handleHouveArmaDeFogoChange} />
          {houveArmaDeFogo === "Sim" && <Field label="Arma Utilizada" placeholder="Ex: revólver calibre .38" value={armaUtilizada} onChange={(e) => setArmaUtilizada(e.target.value)} />}
        </SectionCard>

        <SectionCard title="Pessoas Envolvidas">
          <Field label="Vítima" placeholder="Nome completo da vítima" value={vitima} onChange={(e) => setVitima(e.target.value)} />
          <Field label="Autor / Investigado" placeholder="Nome ou 'Desconhecido'" />
          <Select label="Autoria Determinada ou Indeterminada" options={["Determinada", "Indeterminada", "Desconhecida", "Sem Autoria"]} />
          <Select label="Réu Preso" options={["Sim", "Não"]} />
        </SectionCard>

        <SectionCard title="Dados Operacionais">
          <Field label="Delegado Responsável" placeholder="Del. Nome Completo" />
          <Field label="Equipe Responsável" placeholder="Ex.: DHPP - Equipe Alpha" />
          <Field label="Escrivão" placeholder="Nome completo" />
          <Field label="Bairro" placeholder="Informe o bairro" />
          <Field label="Distrito" placeholder="Ex.: 1º DP" />
          <Field label="Motivação" placeholder="Motivação principal" />
          <Select label="Vinculado a Facção" options={["Sim", "Não", "A definir"]} />
          <Field label="Nome da Facção" placeholder="Informe se houver" />
          <Select
            label="Status de Diligências"
            options={[
              "Pendente",
              "Em Andamento",
              "Concluída",
              "Aguardando Terceiros",
              "Aguardando Aprovação/Revisão",
            ]}
          />
          <TextArea label="Diligências Pendentes" rows={4} placeholder="Descreva as diligências pendentes..." />
          <TextArea label="Observações" rows={5} placeholder="Informações complementares..." />
        </SectionCard>

        <SectionCard title="Relatório e Jurídico">
          <Select label="Medida Protetiva" options={["Sim", "Não"]} />
          <Field label="Nº Processo da Medida" placeholder="0001234-55.2025.8.17.0001" />
          <Select label="Relatório Enviado" options={["Sim", "Não"]} />
          <Field label="Data de Envio do Relatório" type="date" />
          <Field label="Representações Legais" type="number" placeholder="0" />
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
