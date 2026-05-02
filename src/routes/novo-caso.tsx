import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/novo-caso")({
  head: () => ({ meta: [{ title: "Novo Caso — SIPI" }] }),
  component: NovoCaso,
});

function NovoCaso() {
  return (
    <AppLayout>
      <PageHeader title="Novo Inquérito" subtitle="Cadastre um novo inquérito policial" showActions={false} />

      <form className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-5xl">
        <Section title="Identificação" />
        <Field label="ID Interno" value="INQ-000001" readOnly helperText="Gerado automaticamente pelo sistema" />
        <Field label="PPE" placeholder="PPE 0000/2026" />
        <Field label="Nº Físico" placeholder="IPL 2026.0000000-0" />
        <Select label="Tipo de Procedimento" options={["Inquérito Policial", "TCO", "Verificação Preliminar", "Outros"]} />
        <Select label="Prioridade" options={["Alta", "Média", "Baixa"]} />

        <Section title="Datas e Prazos" />
        <Field label="Data do Fato" type="date" />
        <Field label="Data de Instauração" type="date" />
        <Field label="Prazo" type="number" placeholder="30" />
        <Field label="Data Limite" type="date" />
        <Field label="Dias Corridos" type="number" placeholder="0" />

        <Section title="Classificação" />
        <Field label="Tipificação" placeholder="Ex.: Art. 157 CP" />
        <Select label="Gravidade" options={["Alta", "Média", "Baixa"]} />
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
          ]}
        />

        <Section title="Pessoas Envolvidas" />
        <Field label="Vítima" placeholder="Nome da vítima" />
        <Field label="Autor / Investigado" placeholder="Nome do autor/investigado" />
        <Select label="Autoria Determinada ou Indeterminada" options={["Determinada", "Indeterminada"]} />
        <Select label="Réu Preso" options={["Sim", "Não"]} />

        <Section title="Vínculo Operacional" />
        <Select label="Vinculado a Facção" options={["Sim", "Não"]} />
        <Field label="Nome da Facção" placeholder="Informe a facção, se houver" />
        <Field label="Bairro / Distrito" placeholder="Bairro ou distrito" />
        <Field label="Motivação" placeholder="Motivação principal" />
        <Select label="Equipe Responsável" options={["Equipe 1", "Equipe 2", "Equipe 3"]} />
        <Field label="Escrivão" placeholder="Nome do escrivão" />

        <Section title="Diligências e Andamento" />
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
        <Field label="Diligências Pendentes" placeholder="Resumo das diligências" />
        <Field label="Última Atualização" type="date" />
        <div className="lg:col-span-2">
          <label className="block text-xs font-bold tracking-wider text-muted-foreground mb-2">OBSERVAÇÕES</label>
          <textarea
            rows={4}
            placeholder="Observações gerais do caso..."
            className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
        </div>

        <Section title="Medidas e Relatório" />
        <Select label="Medida Protetiva" options={["Sim", "Não"]} />
        <Field label="Nº Processo da Medida" placeholder="0000000-00.0000.0.00.0000" />
        <Select label="Relatório Enviado" options={["Sim", "Não"]} />
        <Field label="Data de Envio do Relatório" type="date" />
        <Field label="Quantidade de Representações" type="number" placeholder="0" />

        <Section title="Controle do Sistema" />
        <Select label="Visibilidade" options={["Público", "Privado"]} />

        <div className="lg:col-span-2 flex gap-3 justify-end">
          <button type="button" className="px-5 py-2.5 rounded-lg text-sm border border-border hover:bg-accent">
            Cancelar
          </button>
          <button className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20">
            Cadastrar Inquérito
          </button>
        </div>
      </form>
    </AppLayout>
  );
}

function Section({ title }: { title: string }) {
  return <h2 className="lg:col-span-2 text-sm font-semibold text-foreground pt-2 border-t border-border/60">{title}</h2>;
}

function Field({
  label,
  helperText,
  ...props
}: { label: string; helperText?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const readOnlyStyles = props.readOnly || props.disabled ? "bg-muted/40 text-muted-foreground cursor-not-allowed" : "";

  return (
    <div>
      <label className="block text-xs font-bold tracking-wider text-muted-foreground mb-2">{label.toUpperCase()}</label>
      <input
        {...props}
        className={`w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary ${readOnlyStyles}`}
      />
      {helperText ? <p className="mt-1 text-xs text-muted-foreground">{helperText}</p> : null}
    </div>
  );
}

function Select({ label, options }: { label: string; options: string[] }) {
  return (
    <div>
      <label className="block text-xs font-bold tracking-wider text-muted-foreground mb-2">{label.toUpperCase()}</label>
      <select className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary">
        <option value="">Selecione…</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
