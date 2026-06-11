import { Outlet, createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Clock3,
  FileSearch,
  Gavel,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { listInqueritos, type InqueritoRecord } from "@/lib/repositories/inqueritosRepository";
import { listRepresentacoes, type RepresentacaoRecord } from "@/lib/repositories/representacoesRepository";
import { buildModuleAlerts, buildSmartAlerts, moduleMeta, type ModuleKey } from "@/lib/alertasInteligentes";

export const Route = createFileRoute("/alertas")({
  component: Alertas,
  head: () => ({ meta: [{ title: "Central Operacional de Pendências - SIPI" }] }),
});

const icons: Record<ModuleKey, typeof AlertTriangle> = {
  criticos: AlertTriangle,
  prazos: Clock3,
  operacionais: Bell,
  judiciais: Gavel,
  "dados-incompletos": FileSearch,
  sigilosas: ShieldAlert,
};

const moduleTone: Record<ModuleKey, { icon: string; badge: string; cta: string; hover: string }> = {
  criticos: {
    icon: "border-red-500/30 bg-red-500/10 text-red-300/90",
    badge: "border-red-500/30 bg-red-500/10 text-red-200",
    cta: "text-red-300 group-hover:text-red-200 group-focus-visible:text-red-200",
    hover:
      "hover:border-red-500/45 hover:bg-red-500/[0.06] hover:shadow-[0_0_0_1px_rgba(239,68,68,0.2)] focus-visible:border-red-500/55 focus-visible:bg-red-500/[0.08] focus-visible:shadow-[0_0_0_1px_rgba(239,68,68,0.25)]",
  },
  prazos: {
    icon: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300/90",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    cta: "text-emerald-300 group-hover:text-emerald-200 group-focus-visible:text-emerald-200",
    hover:
      "hover:border-emerald-500/45 hover:bg-emerald-500/[0.06] hover:shadow-[0_0_0_1px_rgba(16,185,129,0.2)] focus-visible:border-emerald-500/55 focus-visible:bg-emerald-500/[0.08] focus-visible:shadow-[0_0_0_1px_rgba(16,185,129,0.25)]",
  },
  operacionais: {
    icon: "border-orange-500/30 bg-orange-500/10 text-orange-300/90",
    badge: "border-orange-500/30 bg-orange-500/10 text-orange-200",
    cta: "text-orange-300 group-hover:text-orange-200 group-focus-visible:text-orange-200",
    hover:
      "hover:border-orange-500/45 hover:bg-orange-500/[0.06] hover:shadow-[0_0_0_1px_rgba(249,115,22,0.2)] focus-visible:border-orange-500/55 focus-visible:bg-orange-500/[0.08] focus-visible:shadow-[0_0_0_1px_rgba(249,115,22,0.25)]",
  },
  judiciais: {
    icon: "border-blue-500/30 bg-blue-500/10 text-blue-300/90",
    badge: "border-blue-500/30 bg-blue-500/10 text-blue-200",
    cta: "text-blue-300 group-hover:text-blue-200 group-focus-visible:text-blue-200",
    hover:
      "hover:border-blue-500/45 hover:bg-blue-500/[0.06] hover:shadow-[0_0_0_1px_rgba(59,130,246,0.2)] focus-visible:border-blue-500/55 focus-visible:bg-blue-500/[0.08] focus-visible:shadow-[0_0_0_1px_rgba(59,130,246,0.25)]",
  },
  "dados-incompletos": {
    icon: "border-amber-500/30 bg-amber-500/10 text-amber-300/90",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    cta: "text-amber-300 group-hover:text-amber-200 group-focus-visible:text-amber-200",
    hover:
      "hover:border-amber-500/45 hover:bg-amber-500/[0.06] hover:shadow-[0_0_0_1px_rgba(245,158,11,0.2)] focus-visible:border-amber-500/55 focus-visible:bg-amber-500/[0.08] focus-visible:shadow-[0_0_0_1px_rgba(245,158,11,0.25)]",
  },
  sigilosas: {
    icon: "border-violet-500/30 bg-violet-500/10 text-violet-300/90",
    badge: "border-violet-500/30 bg-violet-500/10 text-violet-200",
    cta: "text-violet-300 group-hover:text-violet-200 group-focus-visible:text-violet-200",
    hover:
      "hover:border-violet-500/45 hover:bg-violet-500/[0.06] hover:shadow-[0_0_0_1px_rgba(139,92,246,0.2)] focus-visible:border-violet-500/55 focus-visible:bg-violet-500/[0.08] focus-visible:shadow-[0_0_0_1px_rgba(139,92,246,0.25)]",
  },
};

type ProcedureRow = {
  entityType: "inquerito" | "representacao";
  referenceDate: Date | null;
  raw: InqueritoRecord | RepresentacaoRecord;
};

type TableTarget =
  | { to: "/inqueritos"; search?: Record<string, string | boolean> }
  | { to: "/representacoes"; search?: Record<string, string | boolean> };

type OperationalRow = {
  label: string;
  value: string | number;
  desc: string;
  target?: TableTarget;
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function hasText(value: unknown) {
  return normalizeText(value).length > 0;
}

function isYesLike(value: unknown) {
  return ["sim", "s", "true", "1", "yes", "y", "ok"].includes(normalizeText(value));
}

function isStatus(value: unknown, terms: string[]) {
  const text = normalizeText(value);
  return terms.some((term) => text.includes(normalizeText(term)));
}

function parseDate(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/u.exec(raw);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]), 12, 0, 0, 0);

  const iso = /^(\d{4})-(\d{2})-(\d{2})/u.exec(raw);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12, 0, 0, 0);

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPeriodPreset(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days + 1);
  return { start: toDateInputValue(start), end: toDateInputValue(end) };
}

function inDateRange(date: Date | null, start: string, end: string) {
  if (!start && !end) return true;
  if (!date) return false;

  const startDate = start ? parseDate(start) : null;
  const endDate = end ? parseDate(end) : null;

  if (startDate && date < startDate) return false;
  if (endDate) {
    const final = new Date(endDate);
    final.setHours(23, 59, 59, 999);
    if (date > final) return false;
  }

  return true;
}

function getProcedureType(value: unknown) {
  const text = normalizeText(value);
  if (!text) return "";
  if (text === "ip" || text.includes("inquerito policial")) return "IP";
  if (text === "apf" || text.includes("flagrante")) return "APF";
  if (text === "tco" || text.includes("termo circunstanciado")) return "TCO";
  if (text === "boc" || text.includes("boletim de ocorrencia")) return "BOC";
  if (text === "aiai" || text.includes("ato infracional")) return "AIAI";
  return String(value ?? "").trim();
}

function isInqueritoSemRelatorio(record: InqueritoRecord) {
  return !isYesLike(record.relatorio_enviado) && !hasText(record.data_envio_relatorio);
}

function isCvli(record: InqueritoRecord) {
  return ["cvli", "homic", "latrocin", "feminic"].some((term) =>
    normalizeText(`${record.gravidade} ${record.tipificacao} ${record.tipo} ${record.motivacao}`).includes(term),
  );
}

function isPatrimonial(record: InqueritoRecord) {
  return ["patrimonio", "furto", "roubo", "receptacao", "estelionato", "dano"].some((term) =>
    normalizeText(`${record.gravidade} ${record.tipificacao} ${record.tipo}`).includes(term),
  );
}

function isViolenciaDomestica(record: InqueritoRecord) {
  return ["violencia domestica", "maria da penha"].some((term) =>
    normalizeText(`${record.gravidade} ${record.tipificacao} ${record.tipo}`).includes(term),
  );
}

function isSexual(record: InqueritoRecord) {
  return ["sexual", "estupro", "importunacao"].some((term) =>
    normalizeText(`${record.gravidade} ${record.tipificacao} ${record.tipo}`).includes(term),
  );
}

function isTransito(record: InqueritoRecord) {
  return ["transito", "ctb", "direcao perigosa", "embriaguez"].some((term) =>
    normalizeText(`${record.gravidade} ${record.tipificacao} ${record.tipo}`).includes(term),
  );
}

function isConcluido(record: InqueritoRecord) {
  return isYesLike(record.relatorio_enviado) || hasText(record.data_envio_relatorio) || isStatus(record.situacao, ["conclu", "relat"]);
}

function isEmAndamento(record: InqueritoRecord) {
  return !isConcluido(record) && !isStatus(record.situacao, ["arquiv", "finaliz", "encerr"]);
}

function getInqueritoDate(record: InqueritoRecord) {
  return parseDate(record.data_instauracao) ?? parseDate(record.created_at) ?? parseDate(record.data_fato);
}

function getRepresentacaoDate(record: RepresentacaoRecord) {
  return parseDate(record.data_representacao) ?? parseDate(record.created_at) ?? parseDate(record.data_envio_judiciario);
}

function toProcedureRows(inqueritos: InqueritoRecord[], representacoes: RepresentacaoRecord[]): ProcedureRow[] {
  const inqueritoRows: ProcedureRow[] = inqueritos.map((record) => ({
    entityType: "inquerito",
    referenceDate: getInqueritoDate(record),
    raw: record,
  }));

  const representacaoRows: ProcedureRow[] = representacoes.map((record) => ({
    entityType: "representacao",
    referenceDate: getRepresentacaoDate(record),
    raw: record,
  }));

  return [...inqueritoRows, ...representacaoRows].sort((a, b) => (b.referenceDate?.getTime() ?? 0) - (a.referenceDate?.getTime() ?? 0));
}

function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function Alertas() {
  const location = useLocation();
  const isAlertasIndex = location.pathname === "/alertas";
  const navigate = Route.useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inqueritos, setInqueritos] = useState<InqueritoRecord[]>([]);
  const [representacoes, setRepresentacoes] = useState<RepresentacaoRecord[]>([]);
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [inq, rep] = await Promise.all([listInqueritos(), listRepresentacoes()]);
        setInqueritos(inq);
        setRepresentacoes(rep);
      } catch {
        setError("Não foi possível carregar a central operacional de pendências.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const smartAlerts = useMemo(() => buildSmartAlerts(inqueritos, representacoes), [inqueritos, representacoes]);
  const moduleAlerts = useMemo(() => buildModuleAlerts(smartAlerts), [smartAlerts]);
  const allRows = useMemo(() => toProcedureRows(inqueritos, representacoes), [inqueritos, representacoes]);
  const filteredRows = useMemo(() => allRows.filter((row) => inDateRange(row.referenceDate, dataInicial, dataFinal)), [allRows, dataFinal, dataInicial]);

  const filteredInqueritos = useMemo(
    () => filteredRows.filter((row) => row.entityType === "inquerito").map((row) => row.raw as InqueritoRecord),
    [filteredRows],
  );
  const filteredRepresentacoes = useMemo(
    () => filteredRows.filter((row) => row.entityType === "representacao").map((row) => row.raw as RepresentacaoRecord),
    [filteredRows],
  );

  const panorama = useMemo(() => {
    const ip = inqueritos.filter((item) => getProcedureType(item.tipo) === "IP");
    const apf = inqueritos.filter((item) => getProcedureType(item.tipo) === "APF");
    const tco = inqueritos.filter((item) => getProcedureType(item.tipo) === "TCO");
    const boc = inqueritos.filter((item) => getProcedureType(item.tipo) === "BOC");
    const aiai = inqueritos.filter((item) => getProcedureType(item.tipo) === "AIAI");
    const concluidos = inqueritos.filter(isConcluido).length;
    const taxaConclusao = inqueritos.length === 0 ? 0 : (concluidos / inqueritos.length) * 100;

    return [
      { label: "Total de Procedimentos", value: inqueritos.length, desc: "Inquéritos cadastrados ativos", target: { to: "/inqueritos" } },
      { label: "Inquéritos Policiais (IP)", value: ip.length, desc: "Procedimentos do tipo IP", target: { to: "/inqueritos", search: { tipo: "IP" } } },
      { label: "IP sem Relatar", value: ip.filter(isInqueritoSemRelatorio).length, desc: "IP pendentes de relatório", target: { to: "/inqueritos", search: { tipo: "IP", situacao: "em-andamento" } } },
      { label: "IP CVLI sem Relatar", value: ip.filter((item) => isCvli(item) && isInqueritoSemRelatorio(item)).length, desc: "CVLI pendentes de relatório", target: { to: "/inqueritos", search: { tipo: "IP", gravidade: "CVLI" } } },
      { label: "IP Patrimoniais sem Relatar", value: ip.filter((item) => isPatrimonial(item) && isInqueritoSemRelatorio(item)).length, desc: "Patrimoniais pendentes", target: { to: "/inqueritos", search: { tipo: "IP", busca: "patrimonio" } } },
      { label: "IP Violência Doméstica sem Relatar", value: ip.filter((item) => isViolenciaDomestica(item) && isInqueritoSemRelatorio(item)).length, desc: "Maria da Penha pendentes", target: { to: "/inqueritos", search: { tipo: "IP", busca: "maria da penha" } } },
      { label: "IP Sexuais sem Relatar", value: ip.filter((item) => isSexual(item) && isInqueritoSemRelatorio(item)).length, desc: "Crimes sexuais pendentes", target: { to: "/inqueritos", search: { tipo: "IP", busca: "sexual" } } },
      { label: "Auto de Prisão em Flagrante (APF)", value: apf.length, desc: "Flagrantes cadastrados", target: { to: "/inqueritos", search: { tipo: "APF" } } },
      { label: "APF sem Relatar", value: apf.filter(isInqueritoSemRelatorio).length, desc: "Flagrantes não relatados", target: { to: "/inqueritos", search: { tipo: "APF", situacao: "em-andamento" } } },
      { label: "Termo Circunstanciado (TCO)", value: tco.length, desc: "Termos circunstanciados", target: { to: "/inqueritos", search: { tipo: "TCO" } } },
      { label: "Boletim de Ocorrência Circunstanciado (BOC)", value: boc.length, desc: "Comunicações ao MP", target: { to: "/inqueritos", search: { tipo: "BOC" } } },
      { label: "Ato de Investigação de Ato Infracional (AIAI)", value: aiai.length, desc: "Atos infracionais", target: { to: "/inqueritos", search: { tipo: "AIAI" } } },
      { label: "Relatórios Enviados", value: concluidos, desc: "Procedimentos finalizados", target: { to: "/inqueritos", search: { situacao: "concluidos" } } },
      { label: "Taxa de Conclusão", value: formatPercent(taxaConclusao), desc: "Percentual concluído", target: { to: "/inqueritos", search: { situacao: "concluidos" } } },
      { label: "Procedimentos Em Andamento", value: inqueritos.filter(isEmAndamento).length, desc: "Procedimentos ainda ativos", target: { to: "/inqueritos", search: { situacao: "em-andamento" } } },
      { label: "Relatados e não enviados", value: Math.max(inqueritos.filter(isConcluido).length - inqueritos.filter((item) => hasText(item.data_envio_relatorio)).length, 0), desc: "Revisar envio formal", target: { to: "/inqueritos", search: { situacao: "relatado" } } },
    ] satisfies OperationalRow[];
  }, [inqueritos]);

  const periodStats = useMemo(() => {
    const relatoriosEnviados = inqueritos.filter((item) => hasText(item.data_envio_relatorio) && inDateRange(parseDate(item.data_envio_relatorio), dataInicial, dataFinal)).length;
    const apf = filteredInqueritos.filter((item) => getProcedureType(item.tipo) === "APF").length;
    const mpu = filteredRepresentacoes.filter((item) => normalizeText(item.tipo).includes("protetiva")).length;
    const tco = filteredInqueritos.filter((item) => getProcedureType(item.tipo) === "TCO").length;
    const cvli = filteredInqueritos.filter(isCvli);
    const cvliElucidados = cvli.filter((item) => isYesLike(item.elucidado) || isConcluido(item)).length;
    const periodSearch = { ...(dataInicial ? { dataInicial } : {}), ...(dataFinal ? { dataFinal } : {}) };

    return [
      { label: "Inquéritos instaurados no período", value: filteredInqueritos.length, desc: "Data de instauração ou criação dentro do filtro", target: { to: "/inqueritos", search: periodSearch } },
      { label: "Relatórios enviados no período", value: relatoriosEnviados, desc: "Data de envio entre as datas filtradas", target: { to: "/inqueritos", search: { ...periodSearch, situacao: "concluidos" } } },
      { label: "APF lavrados no período", value: apf, desc: "Flagrantes cadastrados no período", target: { to: "/inqueritos", search: { ...periodSearch, tipo: "APF" } } },
      { label: "MPU representadas no período", value: mpu, desc: "Representações de medida protetiva", target: { to: "/representacoes", search: { ...periodSearch, operationalFilter: "todas", tipo: "medida_protetiva" } } },
      { label: "TCO remetidos no período", value: tco, desc: "TCO cadastrados no período", target: { to: "/inqueritos", search: { ...periodSearch, tipo: "TCO" } } },
      { label: "CVLI no período", value: cvli.length, desc: "CVLI/Homicídios filtrados", target: { to: "/inqueritos", search: { ...periodSearch, gravidade: "CVLI" } } },
      { label: "CVLI elucidados", value: cvliElucidados, desc: "CVLI com elucidação ou relatório", target: { to: "/inqueritos", search: { ...periodSearch, gravidade: "CVLI", situacao: "concluidos" } } },
      { label: "Violência doméstica no período", value: filteredInqueritos.filter(isViolenciaDomestica).length, desc: "Casos Maria da Penha", target: { to: "/inqueritos", search: { ...periodSearch, busca: "maria da penha" } } },
      { label: "Crimes sexuais no período", value: filteredInqueritos.filter(isSexual).length, desc: "Tipificação sexual", target: { to: "/inqueritos", search: { ...periodSearch, busca: "sexual" } } },
      { label: "Crimes de trânsito no período", value: filteredInqueritos.filter(isTransito).length, desc: "Casos de trânsito", target: { to: "/inqueritos", search: { ...periodSearch, busca: "transito" } } },
      { label: "Crimes contra o patrimônio", value: filteredInqueritos.filter(isPatrimonial).length, desc: "Patrimoniais no período", target: { to: "/inqueritos", search: { ...periodSearch, busca: "patrimonio" } } },
      { label: "Prisões vinculadas no período", value: filteredInqueritos.filter((item) => isYesLike(item.reu_preso)).length, desc: "Registros com réu preso", target: { to: "/inqueritos", search: { ...periodSearch, reuPreso: true } } },
    ] satisfies OperationalRow[];
  }, [dataFinal, dataInicial, filteredInqueritos, filteredRepresentacoes, inqueritos]);

  const hasActiveFilters = Boolean(dataInicial) || Boolean(dataFinal);

  function applyPreset(days: number) {
    const next = getPeriodPreset(days);
    setDataInicial(next.start);
    setDataFinal(next.end);
  }

  function clearFilters() {
    setDataInicial("");
    setDataFinal("");
  }

  function openTableTarget(target?: TableTarget) {
    if (!target) return;
    if (target.to === "/representacoes") {
      navigate({ to: "/representacoes", search: target.search ?? {} });
      return;
    }
    navigate({ to: "/inqueritos", search: target.search ?? {} });
  }

  if (!isAlertasIndex) return <Outlet />;

  return (
    <AppLayout>
      <div className="space-y-5">
        <PageHeader
          title="Central Operacional de Pendências"
          subtitle="Pendências, alertas e indicadores operacionais extraídos dos procedimentos ativos."
          showActions={false}
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(Object.keys(moduleMeta) as ModuleKey[]).map((key) => {
            const meta = moduleMeta[key];
            const Icon = icons[key];
            const count = moduleAlerts[key].length;
            const tone = moduleTone[key];
            return (
              <Link
                key={key}
                to="/alertas/$modulo"
                params={{ modulo: key }}
                className={`group rounded-xl border border-border bg-card p-4 text-left transition-all duration-200 cursor-pointer ${tone.hover}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className={`rounded-md border p-1 ${tone.icon}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${tone.badge}`}>
                    {meta.badge}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-foreground">{meta.title}</h3>
                <p className="mt-1 min-h-[36px] text-xs text-muted-foreground">{meta.desc}</p>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Alertas</p>
                    <p className="text-xl font-semibold text-foreground">{count}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${tone.cta}`}>
                    Abrir módulo <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </section>

        <section className="rounded-2xl border border-border/70 bg-card/60 p-4 shadow-[0_16px_42px_rgba(0,0,0,0.14)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-black uppercase tracking-[0.16em] text-foreground">Filtro por período</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Informe uma data única ou um intervalo para atualizar os números abaixo.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => applyPreset(7)} className="rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs font-semibold transition hover:border-primary/40 hover:text-primary">
                Últimos 7 dias
              </button>
              <button type="button" onClick={() => applyPreset(30)} className="rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs font-semibold transition hover:border-primary/40 hover:text-primary">
                Últimos 30 dias
              </button>
              {hasActiveFilters ? (
                <button type="button" onClick={clearFilters} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/15">
                  Limpar período
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              type="date"
              value={dataInicial}
              onChange={(event) => setDataInicial(event.target.value)}
              className="h-11 rounded-xl border border-border/90 bg-background/70 px-3 text-sm outline-none transition focus:border-primary/50"
              aria-label="Data inicial"
            />
            <input
              type="date"
              value={dataFinal}
              onChange={(event) => setDataFinal(event.target.value)}
              className="h-11 rounded-xl border border-border/90 bg-background/70 px-3 text-sm outline-none transition focus:border-primary/50"
              aria-label="Data final"
            />
          </div>
        </section>

        {loading ? <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">Carregando central operacional...</div> : null}
        {!loading && error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}

        {!loading && !error ? (
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <OperationalTable title="Panorama Geral - Todos os Períodos" accent="info" rows={panorama} onOpen={openTableTarget} />
            <OperationalTable title="Estatísticas do Período Selecionado" accent="warning" rows={periodStats} onOpen={openTableTarget} />
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}

function OperationalTable({
  title,
  rows,
  accent,
  onOpen,
}: {
  title: string;
  rows: OperationalRow[];
  accent: "info" | "warning";
  onOpen: (target?: TableTarget) => void;
}) {
  const accentClass = accent === "warning" ? "text-amber-300" : "text-sky-300";

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/65 shadow-[0_16px_42px_rgba(0,0,0,0.14)]">
      <div className="border-b border-border/70 px-4 py-3">
        <h2 className={`text-xs font-black uppercase tracking-[0.16em] ${accentClass}`}>{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="border-b border-border/70 bg-background/35 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-black">Indicador</th>
              <th className="w-28 px-4 py-2.5 text-right font-black">Valor</th>
              <th className="px-4 py-2.5 text-left font-black">Descrição</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((row) => {
              const canOpen = Boolean(row.target);
              return (
                <tr
                  key={row.label}
                  role={canOpen ? "button" : undefined}
                  tabIndex={canOpen ? 0 : undefined}
                  title={canOpen ? `Abrir filtro: ${row.label}` : undefined}
                  className={`transition ${canOpen ? "cursor-pointer hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-none" : "hover:bg-primary/5"}`}
                  onClick={() => onOpen(row.target)}
                  onKeyDown={(event) => {
                    if (!canOpen) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onOpen(row.target);
                    }
                  }}
                >
                  <td className="px-4 py-2.5 font-semibold text-foreground">{row.label}</td>
                  <td className="px-4 py-2.5 text-right text-lg font-black tabular-nums text-primary">{row.value}</td>
                  <td className="px-4 py-2.5 text-xs italic text-muted-foreground">{row.desc}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
