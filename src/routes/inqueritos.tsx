import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Search, Filter } from "lucide-react";
import { PANORAMA } from "@/data/sipi";
import { INQUERITOS_CASOS } from "@/data/inqueritos";

export const Route = createFileRoute("/inqueritos")({
  validateSearch: (search: Record<string, unknown>) => ({
    status: typeof search.status === "string" ? search.status : undefined,
    prioridade: typeof search.prioridade === "string" ? search.prioridade : undefined,
    prazo: typeof search.prazo === "string" ? search.prazo : undefined,
  }),
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
  const navigate = useNavigate();
  const search = Route.useSearch();

  const normalizedStatusFilter = normalizeText(search.status);
  const normalizedPriorityFilter = normalizeText(search.prioridade);
  const normalizedPrazoFilter = normalizeText(search.prazo);

  const filteredInqueritos = INQUERITOS_CASOS.filter((r) => {
    if (normalizedStatusFilter) {
      const status = normalizeText(r.statusDiligencias);
      const isAndamento = normalizedStatusFilter === "andamento" && status.includes("andamento");
      const isConcluido =
        normalizedStatusFilter === "concluido" &&
        (status.includes("concluida") || status.includes("concluido"));
      if (!isAndamento && !isConcluido) return false;
    }

    if (normalizedPriorityFilter) {
      const priority = normalizeText(r.prioridade);
      if (normalizedPriorityFilter === "alta" && priority !== "alta") return false;
    }

    if (normalizedPrazoFilter) {
      const isCritico = r.diasCorridos <= 3;
      if (normalizedPrazoFilter === "critico" && !isCritico) return false;
    }

    return true;
  });

  const activeFilterLabel = getActiveFilterLabel({
    status: normalizedStatusFilter,
    prioridade: normalizedPriorityFilter,
    prazo: normalizedPrazoFilter,
  });

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

      {activeFilterLabel && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="text-xs border border-border rounded-md bg-muted/30 px-3 py-1.5">
            Filtro ativo: {activeFilterLabel}
          </div>
          <button
            className="text-xs border border-border bg-card px-3 py-1.5 rounded-md hover:bg-accent"
            onClick={() => navigate({ to: "/inqueritos" })}
          >
            Limpar filtro
          </button>
        </div>
      )}

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
                <th className="text-right px-4 py-3 font-bold">AÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {filteredInqueritos.map((r) => (
                <tr key={r.ppe + r.tipificacao} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">{r.ppe}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${priorTone[r.prioridade]}`}>
                      {r.prioridade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs max-w-[260px] truncate" title={r.tipificacao}>
                    {r.tipificacao}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{r.gravidade}</td>
                  <td className="px-4 py-3 text-xs font-mono">{r.tipo}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{r.bairroDistrito}</td>
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
                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${statusTone[r.statusDiligencias] ?? ""}`}>
                      {r.statusDiligencias.toUpperCase()}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-xs text-right tabular-nums ${r.diasCorridos < 0 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                    {r.diasCorridos < 0 ? `Vencido ${Math.abs(r.diasCorridos)}d` : `${r.diasCorridos}d`}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to="/inqueritos/$caseId"
                      params={{ caseId: encodeURIComponent(r.ppe) }}
                      className="inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground bg-muted/20">
          Exibindo {filteredInqueritos.length} de {PANORAMA.totalCadastrados} procedimentos
          {activeFilterLabel ? ` (filtrados por ${activeFilterLabel})` : ""}
        </div>
      </div>
    </AppLayout>
  );
}

function normalizeText(value?: string) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getActiveFilterLabel({
  status,
  prioridade,
  prazo,
}: {
  status?: string;
  prioridade?: string;
  prazo?: string;
}) {
  if (status === "andamento") return "Status — Em andamento";
  if (status === "concluido") return "Status — Concluído";
  if (prioridade === "alta") return "Prioridade — Alta";
  if (prazo === "critico") return "Prazo — Crítico";
  return "";
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
