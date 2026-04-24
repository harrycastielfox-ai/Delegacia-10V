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
        <Field label="Número do Inquérito" placeholder="IPL 2026.0000000-0" />
        <Field label="Data de Instauração" type="date" />
        <Field label="Título do Caso" placeholder="Ex.: Homicídio - Bairro Centro" full />
        <Select label="Tipo Penal" options={["Homicídio", "Furto", "Roubo", "Tráfico", "Estelionato"]} />
        <Select label="Gravidade" options={["Alta", "Média", "Baixa"]} />
        <Select label="Equipe Responsável" options={["Equipe 1", "Equipe 2", "Equipe 3"]} />
        <Field label="Prazo Limite (dias)" type="number" placeholder="30" />
        <div className="lg:col-span-2">
          <label className="block text-xs font-bold tracking-wider text-muted-foreground mb-2">DESCRIÇÃO</label>
          <textarea
            rows={5}
            placeholder="Descreva os fatos preliminares..."
            className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
        </div>
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

function Field({ label, full, ...props }: { label: string; full?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={full ? "lg:col-span-2" : ""}>
      <label className="block text-xs font-bold tracking-wider text-muted-foreground mb-2">{label.toUpperCase()}</label>
      <input
        {...props}
        className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
      />
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
