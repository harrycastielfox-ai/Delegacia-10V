import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Search, Filter } from "lucide-react";
import { PANORAMA } from "@/data/sipi";
import { saveInqueritos } from "@/lib/casesLocalState";
import { listarInqueritos, type InqueritoListItem } from "@/lib/inqueritosRepository";

export const Route = createFileRoute("/inqueritos")({
  validateSearch: (search: Record<string, unknown>) => ({
    status: typeof search.status === "string" ? search.status : undefined,
    prioridade: typeof search.prioridade === "string" ? search.prioridade : undefined,
    prazo: typeof search.prazo === "string" ? search.prazo : undefined,
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

  const [searchTerm, setSearchTerm] = useState("");
  const [rows, setRows] = useState<InqueritoListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function carregarInqueritos() {
      try {
        setIsLoading(true);
        setLoadError("");

        const data = await listarInqueritos();

        if (!ignore) {
          setRows(data);
        }
      } catch (error) {
        console.error("Erro ao carregar inquéritos:", error);

        if (!ignore) {
          setLoadError("Não foi possível carregar os inquéritos. Usando dados locais, se disponíveis.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    carregarInqueritos();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (rows.length > 0 && import.meta.env.VITE_DATA_SOURCE !== "supabase") {
      saveInqueritos(rows);
    }
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const nst = normalizeText(searchTerm);

        if (!nst) return true;

        return [
          r.id,
          r.ppe,
          r.tipificacao,
          r.bairroDistrito,
          r.prioridade,
          r.gravidade,
          r.tipo,
          r.statusDiligencias,
        ]
          .map((v) => normalizeText(String(v)))
          .some((v) => v.includes(nst));
      }),
    [rows, searchTerm],
  );

  const activeFilterLabel = getActiveFilterLabel({
    status: normalizeText(search.status),
    prioridade: normalizeText(search.prioridade),
    prazo: normalizeText(search.prazo),
  });

  return (
    <AppLayout>
      <PageHeader
        title="Inquéritos"
        subtitle={`${PANORAMA.totalCadastrados} procedimentos cadastrados — ${PANORAMA.relatorioEnviado} concluídos`}
      />

      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Buscar por PPE, tipificação ou bairro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm"
          />
        </div>

        <button className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2.5 rounded-lg text-sm hover:bg-accent">
          <Filter className="h-4 w-4" /> Filtros
        </button>
      </div>

      {activeFilterLabel && (
        <button
          className="text-xs border border-border bg-card px-3 py-1.5 rounded-md hover:bg-accent mb-3"
          onClick={() => navigate({ to: "/inqueritos" })}
        >
          Limpar filtro ({activeFilterLabel})
        </button>
      )}

      {loadError && (
        <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          {loadError}
        </div>
      )}

      {isLoading ? (
        <div className="bg-card border border-border rounded-xl px-4 py-8 text-center text-sm text-muted-foreground">
          Carregando inquéritos...
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-auto">
          <table className="w-full text-sm min-w-[1200px]">
            <thead className="bg-muted/40 text-[10px] tracking-[0.15em] text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-bold">ID</th>
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
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-3 font-semibold">{r.id}</td>
                  <td className="px-4 py-3 font-semibold">{r.ppe}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${priorTone[r.prioridade]}`}>
                      {r.prioridade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{r.tipificacao}</td>
                  <td className="px-4 py-3 text-xs">{r.gravidade}</td>
                  <td className="px-4 py-3 text-xs">{r.tipo}</td>
                  <td className="px-4 py-3 text-xs">{r.bairroDistrito}</td>
                  <td className="px-4 py-3 text-xs">{r.reuPreso ? "SIM" : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${statusTone[r.statusDiligencias] ?? ""}`}>
                      {r.statusDiligencias.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs">{r.diasCorridos}d</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="rounded-md border border-info/30 bg-info/10 px-2.5 py-1 text-[11px]"
                      onClick={() => navigate({ to: "/inqueritos/$caseId", params: { caseId: r.id } })}
                    >
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhum inquérito encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
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