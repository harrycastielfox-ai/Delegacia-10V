import { Outlet, createFileRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Search, Filter } from "lucide-react";
import { listRepresentacoes, type RepresentacaoRecord } from "@/lib/repositories/representacoesRepository";

export const Route = createFileRoute("/representacoes")({ component: Representacoes });

const normalizeText = (v?: string) =>
  (v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

function Representacoes() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRepresentacoesIndex = location.pathname === "/representacoes";

  const [searchTerm, setSearchTerm] = useState("");
  const [representacoes, setRepresentacoes] = useState<RepresentacaoRecord[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isRepresentacoesIndex) return;

    (async () => {
      try {
        setLoading(true);
        setError("");
        setRepresentacoes(await listRepresentacoes());
      } catch {
        setError("Não foi possível carregar representações agora.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isRepresentacoesIndex]);

  const filtered = useMemo(() => {
    const s = normalizeText(searchTerm);
    if (!s) return representacoes;

    return representacoes.filter((r) =>
      [r.numero_ppe, r.vitima, r.investigado, r.tipo, r.processo_judicial, r.status]
        .map((value) => normalizeText(String(value ?? "")))
        .some((value) => value.includes(s)),
    );
  }, [representacoes, searchTerm]);

  const stats = useMemo(() => {
    const isCumprida = (status?: string) => normalizeText(status).includes("cumprid");
    const isIndeferida = (status?: string) => normalizeText(status).includes("indefer");
    const isDeferida = (status?: string) => {
      const statusN = normalizeText(status);
      return statusN.includes("defer") && !statusN.includes("indefer");
    };
    const isPendente = (status?: string) => {
      const statusN = normalizeText(status);
      return (
        !statusN ||
        statusN.includes("pend") ||
        statusN.includes("analis") ||
        statusN.includes("elabor") ||
        statusN.includes("aguard")
      );
    };

    const total = representacoes.length;
    const cumpridas = representacoes.filter((r) => isCumprida(r.status)).length;
    const indeferidas = representacoes.filter((r) => isIndeferida(r.status)).length;
    const deferidas = representacoes.filter((r) => isDeferida(r.status)).length;
    const pendentes = representacoes.filter((r) => isPendente(r.status)).length;

    const grouped = representacoes.reduce<
      Record<string, { tipo: string; total: number; deferidas: number; cumpridas: number }>
    >((acc, r) => {
      const tipo = (r.tipo || "").trim() || "Não informado";
      if (!acc[tipo]) {
        acc[tipo] = { tipo, total: 0, deferidas: 0, cumpridas: 0 };
      }

      acc[tipo].total += 1;
      if (isDeferida(r.status)) acc[tipo].deferidas += 1;
      if (isCumprida(r.status)) acc[tipo].cumpridas += 1;
      return acc;
    }, {});

    const porTipo = Object.values(grouped).sort((a, b) => b.total - a.total);
    const taxaDeferimento = total > 0 ? (deferidas / total) * 100 : 0;

    return {
      total,
      deferidas,
      cumpridas,
      indeferidas,
      pendentes,
      porTipo,
      taxaDeferimento,
    };
  }, [representacoes]);

  if (!isRepresentacoesIndex) return <Outlet />;

  const summaryCards = [
    { label: "TOTAL", value: stats.total, hint: "Representações", tone: "border-info/40 bg-info/10 text-info" },
    { label: "DEFERIDAS", value: stats.deferidas, hint: "Pedidos acolhidos", tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
    { label: "CUMPRIDAS", value: stats.cumpridas, hint: "Medidas cumpridas", tone: "border-teal-500/40 bg-teal-500/10 text-teal-300" },
    { label: "INDEFERIDAS", value: stats.indeferidas, hint: "Pedidos rejeitados", tone: "border-rose-500/40 bg-rose-500/10 text-rose-300" },
    { label: "PENDENTES", value: stats.pendentes, hint: "Em acompanhamento", tone: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  ];

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <PageHeader
          title="Representações Judiciais"
          subtitle="Medidas requeridas ao Poder Judiciário"
          showActions={false}
        />
        <Link
          to="/nova-representacao"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm md:mt-1"
        >
          Cadastrar Representação
        </Link>
      </div>

      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <div key={card.label} className={`rounded-xl border p-4 shadow-sm ${card.tone}`}>
            <p className="text-[10px] font-bold tracking-[0.22em]">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold leading-none">{card.value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{card.hint}</p>
          </div>
        ))}
      </section>

      <section className="mb-6 grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-border bg-card xl:col-span-2">
          <div className="border-b border-border p-4">
            <h2 className="text-xs tracking-[0.2em] font-semibold text-primary">POR TIPO DE REPRESENTAÇÃO</h2>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="text-[10px] tracking-[0.15em] text-muted-foreground bg-muted/20">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">TIPO</th>
                  <th className="px-4 py-3 text-right font-bold">TOTAL</th>
                  <th className="px-4 py-3 text-right font-bold">DEFERIDAS</th>
                  <th className="px-4 py-3 text-right font-bold">CUMPRIDAS</th>
                  <th className="px-4 py-3 text-right font-bold">% SUCESSO</th>
                </tr>
              </thead>
              <tbody>
                {stats.porTipo.map((item) => {
                  const sucesso = item.total > 0 ? (item.deferidas / item.total) * 100 : 0;
                  return (
                    <tr key={item.tipo} className="border-t border-border">
                      <td className="px-4 py-3">{item.tipo}</td>
                      <td className="px-4 py-3 text-right">{item.total}</td>
                      <td className="px-4 py-3 text-right text-emerald-300">{item.deferidas}</td>
                      <td className="px-4 py-3 text-right text-teal-300">{item.cumpridas}</td>
                      <td className="px-4 py-3 text-right text-amber-300">{formatPercent(sucesso)}</td>
                    </tr>
                  );
                })}
                {stats.porTipo.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Nenhuma representação cadastrada ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="text-xs tracking-[0.2em] font-semibold text-amber-300">STATUS GERAL</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between"><span>Total de pedidos</span><strong>{stats.total}</strong></div>
            <div className="flex items-center justify-between"><span>Cumpridas</span><strong className="text-teal-300">{stats.cumpridas}</strong></div>
            <div className="flex items-center justify-between"><span>Pendentes</span><strong className="text-amber-300">{stats.pendentes}</strong></div>
            <div className="flex items-center justify-between"><span>Indeferidas</span><strong className="text-rose-300">{stats.indeferidas}</strong></div>
            <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="text-sm">Taxa de deferimento</p>
              <p className="text-3xl font-semibold text-emerald-300">{formatPercent(stats.taxaDeferimento)}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar por PPE, vítima, investigado, tipo, processo ou status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm"
            />
          </div>
          <button className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2.5 rounded-lg text-sm hover:bg-accent">
            <Filter className="h-4 w-4" /> Filtros
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="px-4 py-3 border-b border-border text-xs tracking-[0.2em] font-semibold text-muted-foreground">
          REPRESENTAÇÕES RECENTES
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="bg-muted/40 text-[10px] tracking-[0.15em] text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-bold">PPE</th>
                <th className="text-left px-4 py-3 font-bold">VÍTIMA</th>
                <th className="text-left px-4 py-3 font-bold">INVESTIGADO</th>
                <th className="text-left px-4 py-3 font-bold">TIPO</th>
                <th className="text-left px-4 py-3 font-bold">PROCESSO</th>
                <th className="text-left px-4 py-3 font-bold">DATA</th>
                <th className="text-left px-4 py-3 font-bold">STATUS</th>
                <th className="text-right px-4 py-3 font-bold">AÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-3 font-semibold">{r.numero_ppe || "—"}</td>
                  <td className="px-4 py-3 text-xs">{r.vitima || "—"}</td>
                  <td className="px-4 py-3 text-xs">{r.investigado || "—"}</td>
                  <td className="px-4 py-3 text-xs">{r.tipo || "Não informado"}</td>
                  <td className="px-4 py-3 text-xs">{r.processo_judicial || "—"}</td>
                  <td className="px-4 py-3 text-xs">{r.data_representacao || "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="inline-flex rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-semibold">
                      {r.status || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() =>
                        navigate({
                          to: "/representacoes/$representacaoId",
                          params: { representacaoId: r.id },
                        })
                      }
                      className="rounded-md border border-info/30 bg-info/10 px-3 py-1.5 text-[11px] font-semibold text-info"
                    >
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && representacoes.length > 0 && (
                <tr>
                  <td colSpan={8} className="p-4 text-sm text-center text-muted-foreground">
                    Nenhum resultado para a busca informada.
                  </td>
                </tr>
              )}
              {!loading && representacoes.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-4 text-sm text-center text-muted-foreground">
                    Nenhuma representação cadastrada ainda.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={8} className="p-4 text-sm text-center text-muted-foreground">
                    Carregando representações...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
