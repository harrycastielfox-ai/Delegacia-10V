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

const getStatusBadgeClass = (status?: string) => {
  const statusN = normalizeText(status);

  if (statusN.includes("indefer")) return "border-rose-400/35 bg-rose-500/15 text-rose-200 shadow-[0_0_18px_rgba(244,63,94,0.2)]";
  if (statusN.includes("cumprid") || (statusN.includes("defer") && !statusN.includes("indefer"))) {
    return "border-emerald-400/35 bg-emerald-500/15 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.2)]";
  }
  if (statusN.includes("pend") || statusN.includes("aguard")) {
    return "border-amber-400/40 bg-amber-500/15 text-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.2)]";
  }
  if (statusN.includes("analis")) return "border-cyan-400/35 bg-cyan-500/15 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.2)]";
  if (statusN.includes("elabor")) return "border-sky-400/30 bg-sky-500/10 text-sky-200";

  return "border-slate-500/35 bg-slate-500/10 text-slate-200";
};

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
    { label: "TOTAL", value: stats.total, hint: "Representações", tone: "border-cyan-400/35 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/60 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.16)]", hoverTone: "hover:border-cyan-300/50 hover:shadow-[0_0_34px_rgba(34,211,238,0.26)]" },
    { label: "DEFERIDAS", value: stats.deferidas, hint: "Pedidos acolhidos", tone: "border-emerald-400/35 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/65 text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.18)]", hoverTone: "hover:border-emerald-300/50 hover:shadow-[0_0_34px_rgba(16,185,129,0.28)]" },
    { label: "CUMPRIDAS", value: stats.cumpridas, hint: "Medidas cumpridas", tone: "border-teal-400/35 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950/65 text-teal-200 shadow-[0_0_24px_rgba(20,184,166,0.18)]", hoverTone: "hover:border-teal-300/50 hover:shadow-[0_0_34px_rgba(20,184,166,0.28)]" },
    { label: "INDEFERIDAS", value: stats.indeferidas, hint: "Pedidos rejeitados", tone: "border-rose-400/35 bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950/65 text-rose-200 shadow-[0_0_24px_rgba(244,63,94,0.18)]", hoverTone: "hover:border-rose-300/55 hover:shadow-[0_0_34px_rgba(244,63,94,0.28)]" },
    { label: "PENDENTES", value: stats.pendentes, hint: "Em acompanhamento", tone: "border-amber-400/35 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/65 text-amber-200 shadow-[0_0_24px_rgba(245,158,11,0.18)]", hoverTone: "hover:border-amber-300/50 hover:shadow-[0_0_34px_rgba(245,158,11,0.28)]" },
  ];

  return (
    <AppLayout>
      <div className="mb-7 flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-slate-950/90 via-slate-900/75 to-slate-950/90 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <PageHeader
          title="Representações Judiciais"
          subtitle="Medidas requeridas ao Poder Judiciário"
          showActions={false}
        />
        <Link
          to="/nova-representacao"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-500/90 px-5 py-2.5 text-sm font-semibold text-emerald-950 shadow-[0_0_20px_rgba(34,197,94,0.32)] transition hover:bg-emerald-400 md:mt-1"
        >
          Cadastrar Representação
        </Link>
      </div>

      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className={`group rounded-xl border p-4 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:brightness-110 ${card.tone} ${card.hoverTone}`}
          >
            <p className="text-[10px] font-bold tracking-[0.22em]">{card.label}</p>
            <p className="mt-2 text-3xl font-bold leading-none tracking-tight text-white transition-all duration-300 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.35)]">
              {card.value}
            </p>
            <p className="mt-2 text-xs text-slate-300/90">{card.hint}</p>
          </div>
        ))}
      </section>

      <section className="mb-6 grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-cyan-500/20 bg-gradient-to-b from-slate-950/90 to-slate-900/85 shadow-[0_0_24px_rgba(34,211,238,0.08)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-cyan-400/35 hover:shadow-[0_0_28px_rgba(34,211,238,0.16)] xl:col-span-2">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-sm tracking-[0.18em] font-semibold text-cyan-200">POR TIPO DE REPRESENTAÇÃO</h2>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-slate-800/60 text-[10px] tracking-[0.16em] text-slate-300">
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
                    <tr key={item.tipo} className="border-t border-white/10 transition-colors hover:bg-sky-900/20">
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

        <div className="overflow-hidden rounded-xl border border-amber-400/25 bg-gradient-to-b from-slate-950/90 to-slate-900/85 shadow-[0_0_20px_rgba(245,158,11,0.08)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-amber-300/40 hover:shadow-[0_0_28px_rgba(245,158,11,0.16)]">
          <div className="border-b border-border p-4">
            <h2 className="text-sm tracking-[0.18em] font-semibold text-amber-200">STATUS GERAL</h2>
          </div>
          <div className="space-y-2 p-4 text-sm">
            <div className="flex items-center justify-between border-b border-white/10 pb-2"><span className="text-slate-300">Total de pedidos</span><strong className="text-white">{stats.total}</strong></div>
            <div className="flex items-center justify-between border-b border-white/10 pb-2"><span className="text-slate-300">Cumpridas</span><strong className="text-teal-200">{stats.cumpridas}</strong></div>
            <div className="flex items-center justify-between border-b border-white/10 pb-2"><span className="text-slate-300">Pendentes</span><strong className="text-amber-200">{stats.pendentes}</strong></div>
            <div className="flex items-center justify-between"><span className="text-slate-300">Indeferidas</span><strong className="text-rose-200">{stats.indeferidas}</strong></div>
            <div className="mt-4 rounded-lg border border-emerald-400/35 bg-emerald-500/12 p-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <p className="text-sm">Taxa de deferimento</p>
              <p className="text-3xl font-semibold text-emerald-300">{formatPercent(stats.taxaDeferimento)}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-5 rounded-xl border border-white/10 bg-slate-950/70 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar por PPE, vítima, investigado, tipo, processo ou status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-400 focus:border-cyan-400/45 focus:outline-none"
            />
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-800">
            <Filter className="h-4 w-4" /> Filtros
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/75 shadow-[0_0_22px_rgba(56,189,248,0.06)]">
        <div className="border-b border-white/10 px-4 py-3 text-xs font-semibold tracking-[0.2em] text-slate-300">
          REPRESENTAÇÕES CADASTRADAS
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="bg-slate-800/65 text-[10px] tracking-[0.16em] text-slate-300">
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
                <tr key={r.id} className="border-t border-white/10 transition-colors duration-200 hover:bg-sky-950/55">
                  <td className="px-4 py-3 font-semibold">{r.numero_ppe || "—"}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-xs text-slate-200">{r.vitima || "—"}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-xs text-slate-200">{r.investigado || "—"}</td>
                  <td className="max-w-[250px] truncate px-4 py-3 text-xs text-slate-200">{r.tipo || "Não informado"}</td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-xs text-slate-200">{r.processo_judicial || "—"}</td>
                  <td className="px-4 py-3 text-xs">{r.data_representacao || "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusBadgeClass(r.status)}`}>
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
                      className="rounded-md border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-200 transition hover:border-cyan-300/45 hover:bg-cyan-500/20"
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
