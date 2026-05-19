import { Outlet, createFileRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Search, Filter, Activity } from "lucide-react";
import { listRepresentacoes, type RepresentacaoRecord } from "@/lib/repositories/representacoesRepository";
import { getCurrentProfile } from "@/lib/auth";
import { canViewRepresentacoes } from "@/lib/authz";

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

  if (statusN.includes("indefer")) return "border-rose-400/30 bg-rose-500/10 text-rose-200";
  if (statusN.includes("cumprid") || (statusN.includes("defer") && !statusN.includes("indefer"))) {
    return "border-emerald-400/30 bg-emerald-500/12 text-emerald-200";
  }
  if (statusN.includes("pend") || statusN.includes("aguard")) {
    return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  }
  if (statusN.includes("analis")) return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  if (statusN.includes("elabor")) return "border-emerald-400/25 bg-emerald-500/8 text-emerald-100";

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
  const [restricted, setRestricted] = useState(false);

  useEffect(() => {
    if (!isRepresentacoesIndex) return;

    (async () => {
      try {
        const currentProfile = await getCurrentProfile();
        if (!canViewRepresentacoes(currentProfile)) {
          setRestricted(true);
          return;
        }
        setRestricted(false);
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
  if (restricted) return <AppLayout><div className="space-y-4"><h1 className="text-xl font-bold">Acesso restrito</h1><p className="text-sm text-muted-foreground">Seu perfil não possui permissão para acessar Representações.</p><Link to="/modulos" className="px-4 py-2 border border-border rounded-lg inline-block">Voltar</Link></div></AppLayout>;

  const summaryCards = [
    { label: "TOTAL", value: stats.total, hint: "Representações" },
    { label: "DEFERIDAS", value: stats.deferidas, hint: "Pedidos acolhidos" },
    { label: "CUMPRIDAS", value: stats.cumpridas, hint: "Medidas cumpridas" },
    { label: "INDEFERIDAS", value: stats.indeferidas, hint: "Pedidos rejeitados" },
    { label: "PENDENTES", value: stats.pendentes, hint: "Em acompanhamento" },
  ];

  return (
    <AppLayout>
      <div className="rounded-2xl bg-black px-3 py-4 md:px-4 md:py-5">
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-[#050606]/98 via-[#0a0d0d]/96 to-[#070909]/98 px-5 py-3.5 md:flex-row md:items-center md:justify-between md:px-6 md:py-3.5">
        <div className="flex items-start gap-3">
          <Activity className="mt-0.5 h-6 w-6 text-emerald-300/80" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white lg:text-[2rem]">Representações Judiciais</h1>
            <p className="mt-0.5 text-sm text-slate-300">Medidas requeridas ao Poder Judiciário</p>
          </div>
        </div>
        <Link
          to="/nova-representacao"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/22 px-5 py-2.5 text-sm font-semibold text-emerald-100 transition-colors hover:border-emerald-400/45 hover:bg-emerald-500/30"
        >
          Cadastrar Representação
        </Link>
      </div>

      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="group rounded-xl border border-white/10 bg-gradient-to-br from-[#080a0a]/95 via-[#0c1010]/95 to-[#090c0c]/95 p-4 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-emerald-500/25 hover:shadow-[0_6px_20px_rgba(0,0,0,0.35)]"
          >
            <p className="text-[10px] font-bold tracking-[0.22em] text-emerald-100/70">{card.label}</p>
            <p className="mt-2 text-3xl font-bold leading-none tracking-tight text-white">
              {card.value}
            </p>
            <p className="mt-2 text-xs text-slate-300/90">{card.hint}</p>
          </div>
        ))}
      </section>

      <section className="mb-6 grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#090b0b]/96 to-[#0e1111]/94 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all duration-300 ease-out hover:border-emerald-500/20 xl:col-span-2">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-sm tracking-[0.18em] font-semibold text-emerald-100/85">POR TIPO DE REPRESENTAÇÃO</h2>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-[#121615]/90 text-[10px] tracking-[0.16em] text-slate-300">
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
                    <tr key={item.tipo} className="border-t border-white/10 transition-colors hover:bg-white/5">
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

        <div className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#090b0b]/96 to-[#111313]/94 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all duration-300 ease-out hover:border-emerald-500/20">
          <div className="border-b border-border p-4">
            <h2 className="text-sm tracking-[0.18em] font-semibold text-emerald-100/85">STATUS GERAL</h2>
          </div>
          <div className="space-y-2 p-4 text-sm">
            <div className="flex items-center justify-between border-b border-white/10 pb-2"><span className="text-slate-300">Total de pedidos</span><strong className="text-white">{stats.total}</strong></div>
            <div className="flex items-center justify-between border-b border-white/10 pb-2"><span className="text-slate-300">Cumpridas</span><strong className="text-teal-200">{stats.cumpridas}</strong></div>
            <div className="flex items-center justify-between border-b border-white/10 pb-2"><span className="text-slate-300">Pendentes</span><strong className="text-amber-200">{stats.pendentes}</strong></div>
            <div className="flex items-center justify-between"><span className="text-slate-300">Indeferidas</span><strong className="text-rose-200">{stats.indeferidas}</strong></div>
            <div className="mt-4 rounded-lg border border-emerald-500/20 bg-gradient-to-br from-[#101615]/80 to-[#0f1413]/78 p-3">
              <p className="text-sm">Taxa de deferimento</p>
              <p className="text-3xl font-semibold text-emerald-300">{formatPercent(stats.taxaDeferimento)}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-5 rounded-xl border border-white/10 bg-[#0a0d0d]/92 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar por PPE, vítima, investigado, tipo, processo ou status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-700/90 bg-[#121617]/90 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-400 focus:border-emerald-400/45 focus:outline-none"
            />
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#121617]/85 px-4 py-2.5 text-sm text-slate-200 transition hover:border-emerald-500/35 hover:bg-[#181f1f]">
            <Filter className="h-4 w-4" /> Filtros
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0a0d0d]/94 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
        <div className="border-b border-white/10 px-4 py-3 text-xs font-semibold tracking-[0.2em] text-slate-300">
          REPRESENTAÇÕES CADASTRADAS
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-[#121615]/90 text-[10px] tracking-[0.16em] text-slate-300">
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
                <tr key={r.id} className="border-t border-white/10 transition-colors duration-200 hover:bg-white/5">
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
                      className="rounded-md border border-emerald-500/25 bg-emerald-500/8 px-3 py-1.5 text-[11px] font-semibold text-emerald-100 transition hover:border-emerald-400/35 hover:bg-emerald-500/16"
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
      </div>
    </AppLayout>
  );
}
