import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/nova-representacao")({
  head: () => ({ meta: [{ title: "Cadastrar Representação — SIPI" }] }),
  component: NovaRepresentacao,
});

const tiposRepresentacao = [
  "Prisão Temporária",
  "Prisão Preventiva",
  "Busca e Apreensão",
  "Busca e Apreensão Domiciliar",
  "Quebra de Sigilo / Interceptação",
  "Interceptação Telefônica",
  "Medida Protetiva",
  "Outra",
] as const;

const statusRepresentacao = [
  "Em elaboração",
  "Enviada ao Judiciário",
  "Aguardando análise judicial",
  "Deferida",
  "Indeferida",
  "Cumprida",
  "Cumprida parcialmente",
  "Revogada / Prejudicada",
] as const;

const statusComDecisao = new Set(["Deferida", "Indeferida", "Cumprida", "Cumprida parcialmente", "Revogada / Prejudicada"]);
const statusComCumprimento = new Set(["Cumprida", "Cumprida parcialmente"]);

function NovaRepresentacao() {
  const [tipoRepresentacao, setTipoRepresentacao] = useState("");
  const [status, setStatus] = useState("");
  const [feedback, setFeedback] = useState("");

  const exibeCampoOutra = tipoRepresentacao === "Outra";
  const exibeDataDecisao = useMemo(() => statusComDecisao.has(status), [status]);
  const exibeBlocoCumprimento = useMemo(() => statusComCumprimento.has(status), [status]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("Representação cadastrada localmente. Integração com banco será feita futuramente.");
  }

  return (
    <AppLayout>
      <PageHeader
        title="Cadastrar Representação"
        subtitle="Registro de medida judicial vinculada a procedimento policial"
        showActions={false}
      />

      <form className="space-y-5 max-w-6xl pb-6" onSubmit={handleSubmit}>
        <SectionCard title="Identificação da Representação">
          <Field label="Nº PPE / Procedimento relacionado" placeholder="Ex.: 72921/2025" />
          <Field label="Nº Processo Judicial" placeholder="Ex.: 8001619-92.2025.8.05.0111" />
          <Select
            label="Tipo de Representação"
            options={tiposRepresentacao}
            value={tipoRepresentacao}
            onChange={setTipoRepresentacao}
          />
          <Field label="Data da Representação" type="date" />
          <Field label="Responsável pela Representação" placeholder="Ex.: Del. Nome Completo" />
          {exibeCampoOutra && <Field label="Especificar representação" placeholder="Descreva o tipo de representação" />}
        </SectionCard>

        <SectionCard title="Pessoas Envolvidas">
          <Field label="Vítima" placeholder="Nome completo da vítima" />
          <Field label="Investigado / Representado" placeholder="Nome do investigado" />
          <Select label="Autor preso?" options={["Sim", "Não", "Não informado"]} />
        </SectionCard>

        <SectionCard title="Fundamentação e Finalidade">
          <TextArea label="Resumo dos fatos" placeholder="Descreva resumidamente os fatos que motivam a representação..." />
          <TextArea label="Fundamentação da medida" placeholder="Informe a base jurídica e os elementos de convicção..." />
          <TextArea label="Objetivo da representação" placeholder="Ex.: garantir produção de prova, preservar vítima, capturar investigado..." />
          <TextArea label="Diligências relacionadas" placeholder="Liste diligências já realizadas e pendentes relacionadas ao pedido..." />
        </SectionCard>

        <SectionCard title="Tramitação Judicial">
          <Select label="Status da Representação" options={statusRepresentacao} value={status} onChange={setStatus} />
          <Field label="Data de envio ao Judiciário" type="date" />
          {exibeDataDecisao && <Field label="Data da decisão judicial" type="date" />}
          <TextArea label="Observações da decisão" placeholder="Observações sobre decisão, condicionantes e determinações judiciais..." />
        </SectionCard>

        {exibeBlocoCumprimento && (
          <SectionCard title="Cumprimento da Medida">
            <Field label="Data do cumprimento" type="date" />
            <Field label="Equipe responsável pelo cumprimento" placeholder="Ex.: Equipe Alpha" />
            <TextArea label="Resultado do cumprimento" placeholder="Ex.: positiva, parcial, sem êxito, com apreensões..." />
            <TextArea label="Observações do cumprimento" placeholder="Detalhes operacionais adicionais..." />
          </SectionCard>
        )}

        <SectionCard title="Controle Interno">
          <Select label="Prioridade operacional" options={["Normal", "Atenção", "Urgente"]} />
          <Select label="Pedido sigiloso?" options={["Sim", "Não"]} />
          <TextArea label="Observações internas" placeholder="Anotações internas da unidade sobre o acompanhamento da representação..." />
        </SectionCard>

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
            className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20"
          >
            Salvar Representação
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
  options: readonly string[];
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
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}
