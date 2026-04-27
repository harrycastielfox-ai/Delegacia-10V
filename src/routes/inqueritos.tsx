import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Search, Filter } from "lucide-react";
import { INQUERITOS_AMOSTRA, PANORAMA } from "@/data/sipi";

export const Route = createFileRoute("/inqueritos")({
  head: () => ({
    meta: [
      { title: "Inquéritos — DT Itabela" },
      { name: "description", content: "Lista de inquéritos policiais." },
    ],
  }),
  component: Inqueritos,
});

const priorTone: Record<string, string> = {
  ALTA: "bg-destructive/15 text-destructive border-destructive/30",
  MÉDIA: "bg-warning/15 text-warning border-warning/30",
  BAIXA: "bg-info/15 text-info border-info/30",
};
const statusTone: Record<string, string> = {
  "Em Andamento": "bg-info/15 text-info border-info/30",
  Concluída: "bg-success/15 text-success border-success/30",
  Pendente: "bg-warning/15 text-warning border-warning/30",
};

function Inqueritos() {
  return (
    <AppLayout>
      <PageHeader
        title="Inquéritos"
        subtitle={`${PANORAMA.totalCadastrados} procedimentos cadastrados — ${PANORAMA.relatorioEnviado} concluídos`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Mini label="Total" value={PANORAMA.totalCadastrados} tone="info" />
        <Mini label="Em andamento" value={PANORAMA.emAndamento} tone="warning" />
        <Mini label="Concluídos" value={PANORAMA.relatorioEnviado} tone="success" />
        <Mini label="Prior. Alta" value={PANORAMA.prioridadeAlta} tone="destructive" />
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Buscar por PPE, tipificação ou bairro..."
            className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <button className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2.5 rounded-lg text-sm hover:bg-accent">
          <Filter className="h-4 w-4" /> Filtros
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead className="bg-muted/40 text-[10px] tracking-[0.15em] text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-bold">Nº PPE</th>
                <th className="text-left px-4 py-3 font-bold">PRIOR.</th>
                <th className="text-left px-4 py-3 font-bold">TIPIFICAÇÃO</th>
                <th className="text-left px-4 py-3 font-bold">GRAVIDADE</th>
                <th className="text-left px-4 py-3 font-bold">TIPO</th>
                <th className="text-left px-4 py-3 font-bold">BAIRRO</th>
                <th className="text-left px-4 py-3 font-bold">RÉU PRESO</th>
                <th className="text-left px-4 py-3 font-bold">STATUS</th>
                <th className="text-right px-4 py-3 font-bold">DIAS</th>
              </tr>
            </thead>
            <tbody>
              {INQUERITOS_AMOSTRA.map((r) => (
                <tr key={r.ppe + r.tipif} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">{r.ppe}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${priorTone[r.prior]}`}>
                      {r.prior}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs max-w-[260px] truncate" title={r.tipif}>
                    {r.tipif}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{r.grav}</td>
                  <td className="px-4 py-3 text-xs font-mono">{r.tipo}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{r.bairro}</td>
                  <td className="px-4 py-3">
                    {r.reuPreso ? (
                      <span className="text-[10px] font-bold px-2 py-1 rounded border bg-destructive/15 text-destructive border-destructive/30">
                        SIM
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${statusTone[r.status] ?? ""}`}>
                      {r.status.toUpperCase()}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-xs text-right tabular-nums ${r.dias < 0 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                    {r.dias < 0 ? `Vencido ${Math.abs(r.dias)}d` : `${r.dias}d`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground bg-muted/20">
          Exibindo {INQUERITOS_AMOSTRA.length} de {PANORAMA.totalCadastrados} procedimentos
        </div>
      </div>
    </AppLayout>
  );
}

function Mini({ label, value, tone }: { label: string; value: number; tone: "info" | "success" | "warning" | "destructive" }) {
  const c = `var(--${tone})`;
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="text-[10px] tracking-[0.15em] font-bold" style={{ color: c }}>
        {label.toUpperCase()}
      </div>
      <div className="text-2xl font-bold tabular-nums mt-1" style={{ color: c }}>
        {value}
      </div>
    </div>
  );
}
