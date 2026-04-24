import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Search, Filter } from "lucide-react";

export const Route = createFileRoute("/inqueritos")({
  head: () => ({
    meta: [
      { title: "Inquéritos — SIPI" },
      { name: "description", content: "Lista de inquéritos policiais." },
    ],
  }),
  component: Inqueritos,
});

const rows = [
  { id: "IPL 2024.0001234-5", titulo: "Homicídio - Bairro Centro", equipe: "Equipe 1", gravidade: "Alta", situacao: "Em andamento", prazo: "Vencido há 12 dias" },
  { id: "IPL 2024.0001230-2", titulo: "Furto qualificado", equipe: "Equipe 2", gravidade: "Média", situacao: "Em andamento", prazo: "5 dias" },
  { id: "IPL 2024.0001229-9", titulo: "Tráfico de drogas", equipe: "Equipe 1", gravidade: "Alta", situacao: "Em andamento", prazo: "12 dias" },
  { id: "IPL 2024.0001225-1", titulo: "Estelionato eletrônico", equipe: "Equipe 3", gravidade: "Média", situacao: "Finalizado", prazo: "—" },
  { id: "IPL 2024.0001220-8", titulo: "Lesão corporal", equipe: "Equipe 2", gravidade: "Baixa", situacao: "Em andamento", prazo: "20 dias" },
  { id: "IPL 2024.0001215-3", titulo: "Receptação", equipe: "Equipe 3", gravidade: "Baixa", situacao: "Finalizado", prazo: "—" },
  { id: "IPL 2024.0000987-1", titulo: "Roubo a transeunte", equipe: "Equipe 1", gravidade: "Alta", situacao: "Em andamento", prazo: "Vencido há 7 dias" },
];

const gravTone: Record<string, string> = {
  Alta: "bg-destructive/15 text-destructive border-destructive/30",
  Média: "bg-warning/15 text-warning border-warning/30",
  Baixa: "bg-info/15 text-info border-info/30",
};
const sitTone: Record<string, string> = {
  "Em andamento": "bg-success/15 text-success border-success/30",
  Finalizado: "bg-info/15 text-info border-info/30",
};

function Inqueritos() {
  return (
    <AppLayout>
      <PageHeader title="Inquéritos" subtitle="Gestão completa dos inquéritos cadastrados" />

      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Buscar por número, título ou responsável..."
            className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <button className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2.5 rounded-lg text-sm hover:bg-accent">
          <Filter className="h-4 w-4" /> Filtros
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[10px] tracking-[0.15em] text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-bold">NÚMERO</th>
              <th className="text-left px-4 py-3 font-bold">TÍTULO</th>
              <th className="text-left px-4 py-3 font-bold">EQUIPE</th>
              <th className="text-left px-4 py-3 font-bold">GRAVIDADE</th>
              <th className="text-left px-4 py-3 font-bold">SITUAÇÃO</th>
              <th className="text-left px-4 py-3 font-bold">PRAZO</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                <td className="px-4 py-3 font-semibold">{r.id}</td>
                <td className="px-4 py-3">{r.titulo}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.equipe}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded border ${gravTone[r.gravidade]}`}>
                    {r.gravidade.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded border ${sitTone[r.situacao]}`}>
                    {r.situacao.toUpperCase()}
                  </span>
                </td>
                <td className={`px-4 py-3 text-xs ${r.prazo.includes("Vencido") ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                  {r.prazo}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
