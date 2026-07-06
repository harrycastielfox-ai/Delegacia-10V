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
import { isCvliElucidado, isCvliRecord } from "@/lib/cvliMetrics";
import { listInqueritos, type InqueritoRecord } from "@/lib/repositories/inqueritosRepository";
import {
  listRepresentacoes,
  type RepresentacaoRecord,
} from "@/lib/repositories/representacoesRepository";
import {
  buildModuleAlerts,
  buildSmartAlerts,
  moduleMeta,
  type ModuleKey,
} from "@/lib/alertasInteligentes";

export const Route = createFileRoute("/alertas")({
  component: Alertas,
  head: () => ({ meta: [{ title: "Central Operacional de PendÃªncias - SIPI" }] }),
});

const icons: Record<ModuleKey, typeof AlertTriangle> = {
  criticos: AlertTriangle,
  prazos: Clock3,
  operacionais: Bell,
  judiciais: Gavel,
  "dados-incompletos": FileSearch,
  sigilosas: ShieldAlert,
};

const moduleTone: Record<
  ModuleKey,
  {
    icon: string;
    badge: string;
    cta: string;
    hover: string;
    surface: string;
    glow: string;
    rail: string;
    count: string;
  }
> = {
  criticos: {
    icon: "border-red-500/30 bg-red-500/10 text-red-300/90",
    badge: "border-red-500/30 bg-red-500/10 text-red-200",
    cta: "text-red-300 group-hover:text-red-200 group-focus-visible:text-red-200",
    surface: "from-red-500/[0.055] via-card/55 to-card",
    glow: "bg-red-500/12",
    rail: "bg-red-400/55 shadow-[0_0_10px_rgba(248,113,113,0.24)]",
    count: "text-red-100 drop-shadow-[0_0_8px_rgba(248,113,113,0.16)]",
    hover:
      "hover:border-red-500/45 hover:bg-red-500/[0.06] hover:shadow-[0_0_0_1px_rgba(239,68,68,0.2)] focus-visible:border-red-500/55 focus-visible:bg-red-500/[0.08] focus-visible:shadow-[0_0_0_1px_rgba(239,68,68,0.25)]",
  },
  prazos: {
    icon: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300/90",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    cta: "text-emerald-300 group-hover:text-emerald-200 group-focus-visible:text-emerald-200",
    surface: "from-emerald-500/[0.055] via-card/55 to-card",
    glow: "bg-emerald-500/12",
    rail: "bg-emerald-400/55 shadow-[0_0_10px_rgba(52,211,153,0.24)]",
    count: "text-emerald-100 drop-shadow-[0_0_8px_rgba(52,211,153,0.16)]",
    hover:
      "hover:border-emerald-500/45 hover:bg-emerald-500/[0.06] hover:shadow-[0_0_0_1px_rgba(16,185,129,0.2)] focus-visible:border-emerald-500/55 focus-visible:bg-emerald-500/[0.08] focus-visible:shadow-[0_0_0_1px_rgba(16,185,129,0.25)]",
  },
  operacionais: {
    icon: "border-orange-500/30 bg-orange-500/10 text-orange-300/90",
    badge: "border-orange-500/30 bg-orange-500/10 text-orange-200",
    cta: "text-orange-300 group-hover:text-orange-200 group-focus-visible:text-orange-200",
    surface: "from-orange-500/[0.055] via-card/55 to-card",
    glow: "bg-orange-500/12",
    rail: "bg-orange-400/55 shadow-[0_0_10px_rgba(251,146,60,0.24)]",
    count: "text-orange-100 drop-shadow-[0_0_8px_rgba(251,146,60,0.16)]",
    hover:
      "hover:border-orange-500/45 hover:bg-orange-500/[0.06] hover:shadow-[0_0_0_1px_rgba(249,115,22,0.2)] focus-visible:border-orange-500/55 focus-visible:bg-orange-500/[0.08] focus-visible:shadow-[0_0_0_1px_rgba(249,115,22,0.25)]",
  },
  judiciais: {
    icon: "border-blue-500/30 bg-blue-500/10 text-blue-300/90",
    badge: "border-blue-500/30 bg-blue-500/10 text-blue-200",
    cta: "text-blue-300 group-hover:text-blue-200 group-focus-visible:text-blue-200",
    surface: "from-blue-500/[0.055] via-card/55 to-card",
    glow: "bg-blue-500/12",
    rail: "bg-blue-400/55 shadow-[0_0_10px_rgba(96,165,250,0.24)]",
    count: "text-blue-100 drop-shadow-[0_0_8px_rgba(96,165,250,0.16)]",
    hover:
      "hover:border-blue-500/45 hover:bg-blue-500/[0.06] hover:shadow-[0_0_0_1px_rgba(59,130,246,0.2)] focus-visible:border-blue-500/55 focus-visible:bg-blue-500/[0.08] focus-visible:shadow-[0_0_0_1px_rgba(59,130,246,0.25)]",
  },
  "dados-incompletos": {
    icon: "border-amber-500/30 bg-amber-500/10 text-amber-300/90",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    cta: "text-amber-300 group-hover:text-amber-200 group-focus-visible:text-amber-200",
    surface: "from-amber-500/[0.055] via-card/55 to-card",
    glow: "bg-amber-500/12",
    rail: "bg-amber-400/55 shadow-[0_0_10px_rgba(251,191,36,0.24)]",
    count: "text-amber-100 drop-shadow-[0_0_8px_rgba(251,191,36,0.16)]",
    hover:
      "hover:border-amber-500/45 hover:bg-amber-500/[0.06] hover:shadow-[0_0_0_1px_rgba(245,158,11,0.2)] focus-visible:border-amber-500/55 focus-visible:bg-amber-500/[0.08] focus-visible:shadow-[0_0_0_1px_rgba(245,158,11,0.25)]",
  },
  sigilosas: {
    icon: "border-violet-500/30 bg-violet-500/10 text-violet-300/90",
    badge: "border-violet-500/30 bg-violet-500/10 text-violet-200",
    cta: "text-violet-300 group-hover:text-violet-200 group-focus-visible:text-violet-200",
    surface: "from-violet-500/[0.055] via-card/55 to-card",
    glow: "bg-violet-500/12",
    rail: "bg-violet-400/55 shadow-[0_0_10px_rgba(167,139,250,0.24)]",
    count: "text-violet-100 drop-shadow-[0_0_8px_rgba(167,139,250,0.16)]",
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
  disabledReason?: string;
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
  return isCvliRecord(record);
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
  return isYesLike(record.relatorio_enviado) || hasText(record.data_envio_relatorio);
}

function isEmAndamento(record: InqueritoRecord) {
  return !isConcluido(record) && !isStatus(record.situacao, ["arquiv", "finaliz", "encerr"]);
}

function isRelatadoNaoEnviado(record: InqueritoRecord) {
  return isStatus(record.situacao, ["relat"]) && !isConcluido(record);
}

function getInqueritoDate(record: InqueritoRecord) {
  return (
    parseDate(record.data_instauracao) ??
    parseDate(record.created_at) ??
    parseDate(record.data_fato)
  );
}

function getRepresentacaoDate(record: RepresentacaoRecord) {
  return (
    parseDate(record.data_representacao) ??
    parseDate(record.created_at) ??
    parseDate(record.data_envio_judiciario)
  );
}

function toProcedureRows(
  inqueritos: InqueritoRecord[],
  representacoes: RepresentacaoRecord[],
): ProcedureRow[] {
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

  return [...inqueritoRows, ...representacaoRows].sort(
    (a, b) => (b.referenceDate?.getTime() ?? 0) - (a.referenceDate?.getTime() ?? 0),
  );
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
        setError("NÃ£o foi possÃ­vel carregar a central operacional de pendÃªncias.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const smartAlerts = useMemo(
    () => buildSmartAlerts(inqueritos, representacoes),
    [inqueritos, representacoes],
  );
  const moduleAlerts = useMemo(() => buildModuleAlerts(smartAlerts), [smartAlerts]);
  const allRows = useMemo(
    () => toProcedureRows(inqueritos, representacoes),
    [inqueritos, representacoes],
  );
  const filteredRows = useMemo(
    () => allRows.filter((row) => inDateRange(row.referenceDate, dataInicial, dataFinal)),
    [allRows, dataFinal, dataInicial],
  );

  const filteredInqueritos = useMemo(
    () =>
      filteredRows
        .filter((row) => row.entityType === "inquerito")
        .map((row) => row.raw as InqueritoRecord),
    [filteredRows],
  );
  const filteredRepresentacoes = useMemo(
    () =>
      filteredRows
        .filter((row) => row.entityType === "representacao")
        .map((row) => row.raw as RepresentacaoRecord),
    [filteredRows],
  );

  const panorama = useMemo(() => {
    const periodSearch = {
      ...(dataInicial ? { dataInicial } : {}),
      ...(dataFinal ? { dataFinal } : {}),
      ...(dataInicial || dataFinal ? { dataCampo: "entrada" } : {}),
    };
    const ip = filteredInqueritos.filter((item) => getProcedureType(item.tipo) === "IP");
    const apf = filteredInqueritos.filter((item) => getProcedureType(item.tipo) === "APF");
    const tco = filteredInqueritos.filter((item) => getProcedureType(item.tipo) === "TCO");
    const boc = filteredInqueritos.filter((item) => getProcedureType(item.tipo) === "BOC");
    const aiai = filteredInqueritos.filter((item) => getProcedureType(item.tipo) === "AIAI");
    const concluidos = filteredInqueritos.filter(isConcluido).length;
    const taxaConclusao =
      filteredInqueritos.length === 0 ? 0 : (concluidos / filteredInqueritos.length) * 100;

    return [
      {
        label: "Total de Procedimentos",
        value: filteredInqueritos.length,
        desc: "InquÃ©ritos cadastrados ativos",
        target: { to: "/inqueritos", search: periodSearch },
      },
      {
        label: "InquÃ©ritos Policiais (IP)",
        value: ip.length,
        desc: "Procedimentos do tipo IP",
        target: { to: "/inqueritos", search: { ...periodSearch, tipo: "IP" } },
      },
      {
        label: "IP sem Relatar",
        value: ip.filter(isInqueritoSemRelatorio).length,
        desc: "IP pendentes de relatÃ³rio",
        target: {
          to: "/inqueritos",
          search: { ...periodSearch, tipo: "IP", relatorio: "sem_relatar" },
        },
      },
      {
        label: "IP CVLI sem Relatar",
        value: ip.filter((item) => isCvli(item) && isInqueritoSemRelatorio(item)).length,
        desc: "CVLI pendentes de relatÃ³rio",
        target: {
          to: "/inqueritos",
          search: { ...periodSearch, tipo: "IP", relatorio: "sem_relatar", categoria: "cvli" },
        },
      },
      {
        label: "IP Patrimoniais sem Relatar",
        value: ip.filter((item) => isPatrimonial(item) && isInqueritoSemRelatorio(item)).length,
        desc: "Patrimoniais pendentes",
        target: {
          to: "/inqueritos",
          search: {
            ...periodSearch,
            tipo: "IP",
            relatorio: "sem_relatar",
            categoria: "patrimonial",
          },
        },
      },
      {
        label: "IP ViolÃªncia DomÃ©stica sem Relatar",
        value: ip.filter((item) => isViolenciaDomestica(item) && isInqueritoSemRelatorio(item))
          .length,
        desc: "Maria da Penha pendentes",
        target: {
          to: "/inqueritos",
          search: {
            ...periodSearch,
            tipo: "IP",
            relatorio: "sem_relatar",
            categoria: "violencia_domestica",
          },
        },
      },
      {
        label: "IP Sexuais sem Relatar",
        value: ip.filter((item) => isSexual(item) && isInqueritoSemRelatorio(item)).length,
        desc: "Crimes sexuais pendentes",
        target: {
          to: "/inqueritos",
          search: { ...periodSearch, tipo: "IP", relatorio: "sem_relatar", categoria: "sexual" },
        },
      },
      {
        label: "Auto de PrisÃ£o em Flagrante (APF)",
        value: apf.length,
        desc: "Flagrantes cadastrados",
        target: { to: "/inqueritos", search: { ...periodSearch, tipo: "APF" } },
      },
      {
        label: "APF sem Relatar",
        value: apf.filter(isInqueritoSemRelatorio).length,
        desc: "Flagrantes nÃ£o relatados",
        target: {
          to: "/inqueritos",
          search: { ...periodSearch, tipo: "APF", relatorio: "sem_relatar" },
        },
      },
      {
        label: "Termo Circunstanciado (TCO)",
        value: tco.length,
        desc: "Termos circunstanciados",
        target: { to: "/inqueritos", search: { ...periodSearch, tipo: "TCO" } },
      },
      {
        label: "Boletim de OcorrÃªncia Circunstanciado (BOC)",
        value: boc.length,
        desc: "ComunicaÃ§Ãµes ao MP",
        target: { to: "/inqueritos", search: { ...periodSearch, tipo: "BOC" } },
      },
      {
        label: "Ato de InvestigaÃ§Ã£o de Ato Infracional (AIAI)",
        value: aiai.length,
        desc: "Atos infracionais",
        target: { to: "/inqueritos", search: { ...periodSearch, tipo: "AIAI" } },
      },
      {
        label: "RelatÃ³rios Enviados",
        value: concluidos,
        desc: "Procedimentos finalizados",
        target: { to: "/inqueritos", search: { ...periodSearch, relatorio: "enviado" } },
      },
      {
        label: "Taxa de ConclusÃ£o",
        value: formatPercent(taxaConclusao),
        desc: "Percentual concluÃ­do",
        disabledReason: "Indicador percentual; filtro de registros ainda nÃ£o disponÃ­vel.",
      },
      {
        label: "Procedimentos Em Andamento",
        value: filteredInqueritos.filter(isEmAndamento).length,
        desc: "Procedimentos ainda ativos",
        target: { to: "/inqueritos", search: { ...periodSearch, status: "em_andamento" } },
      },
      {
        label: "Relatados e não enviados",
        value: filteredInqueritos.filter(isRelatadoNaoEnviado).length,
        desc: "Revisar envio formal",
        target: {
          to: "/inqueritos",
          search: { ...periodSearch, relatorio: "relatado_nao_enviado" },
        },
      },
    ] satisfies OperationalRow[];
  }, [dataFinal, dataInicial, filteredInqueritos]);

  const periodStats = useMemo(() => {
    const relatoriosEnviados = inqueritos.filter(
      (item) =>
        hasText(item.data_envio_relatorio) &&
        inDateRange(parseDate(item.data_envio_relatorio), dataInicial, dataFinal),
    ).length;
    const apf = filteredInqueritos.filter((item) => getProcedureType(item.tipo) === "APF").length;
    const mpu = filteredRepresentacoes.filter((item) =>
      normalizeText(item.tipo).includes("protetiva"),
    ).length;
    const tco = filteredInqueritos.filter((item) => getProcedureType(item.tipo) === "TCO").length;
    const cvli = filteredInqueritos.filter(isCvli);
    const cvliElucidados = cvli.filter(isCvliElucidado).length;
    const periodSearch = {
      ...(dataInicial ? { dataInicial } : {}),
      ...(dataFinal ? { dataFinal } : {}),
    };

    return [
      {
        label: "InquÃ©ritos instaurados no perÃ­odo",
        value: filteredInqueritos.length,
        desc: "Data de instauraÃ§Ã£o ou criaÃ§Ã£o dentro do filtro",
        target: { to: "/inqueritos", search: periodSearch },
      },
      {
        label: "RelatÃ³rios enviados no perÃ­odo",
        value: relatoriosEnviados,
        desc: "Data de envio entre as datas filtradas",
        target: {
          to: "/inqueritos",
          search: { ...periodSearch, relatorio: "enviado", dataCampo: "relatorio" },
        },
      },
      {
        label: "APF lavrados no perÃ­odo",
        value: apf,
        desc: "Flagrantes cadastrados no perÃ­odo",
        target: { to: "/inqueritos", search: { ...periodSearch, tipo: "APF" } },
      },
      {
        label: "MPU representadas no perÃ­odo",
        value: mpu,
        desc: "RepresentaÃ§Ãµes de medida protetiva",
        target: {
          to: "/representacoes",
          search: { ...periodSearch, operationalFilter: "todas", tipo: "medida_protetiva" },
        },
      },
      {
        label: "TCO remetidos no perÃ­odo",
        value: tco,
        desc: "TCO cadastrados no perÃ­odo",
        target: { to: "/inqueritos", search: { ...periodSearch, tipo: "TCO" } },
      },
      {
        label: "CVLI no perÃ­odo",
        value: cvli.length,
        desc: "CVLI/HomicÃ­dios filtrados",
        target: { to: "/inqueritos", search: { ...periodSearch, categoria: "cvli" } },
      },
      {
        label: "CVLI elucidados",
        value: cvliElucidados,
        desc: "CVLI com elucidação registrada",
        target: {
          to: "/inqueritos",
          search: { ...periodSearch, categoria: "cvli", elucidado: "sim" },
        },
      },
      {
        label: "ViolÃªncia domÃ©stica no perÃ­odo",
        value: filteredInqueritos.filter(isViolenciaDomestica).length,
        desc: "Casos Maria da Penha",
        target: {
          to: "/inqueritos",
          search: { ...periodSearch, categoria: "violencia_domestica" },
        },
      },
      {
        label: "Crimes sexuais no perÃ­odo",
        value: filteredInqueritos.filter(isSexual).length,
        desc: "TipificaÃ§Ã£o sexual",
        target: { to: "/inqueritos", search: { ...periodSearch, categoria: "sexual" } },
      },
      {
        label: "Crimes de trÃ¢nsito no perÃ­odo",
        value: filteredInqueritos.filter(isTransito).length,
        desc: "Casos de trÃ¢nsito",
        target: { to: "/inqueritos", search: { ...periodSearch, categoria: "transito" } },
      },
      {
        label: "Crimes contra o patrimÃ´nio",
        value: filteredInqueritos.filter(isPatrimonial).length,
        desc: "Patrimoniais no perÃ­odo",
        target: { to: "/inqueritos", search: { ...periodSearch, categoria: "patrimonial" } },
      },
      {
        label: "PrisÃµes vinculadas no perÃ­odo",
        value: filteredInqueritos.filter((item) => isYesLike(item.reu_preso)).length,
        desc: "Registros com rÃ©u preso",
        target: { to: "/inqueritos", search: { ...periodSearch, reu_preso: "sim" } },
      },
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
          title="Central Operacional de PendÃªncias"
          subtitle="PendÃªncias, alertas e indicadores operacionais extraÃ­dos dos procedimentos ativos."
          showActions={false}
        />

        <section className="rounded-2xl border border-border/70 bg-[#020607] p-4 shadow-[0_18px_52px_rgba(0,0,0,0.18)]">
          <div className="mb-4 flex flex-col gap-2 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-primary">
                CENTRAL ODP
              </h2>
            </div>
            <span className="w-fit rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
              {smartAlerts.length} pendÃªncia(s) ativas
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                  className={`group relative min-h-[164px] overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br ${tone.surface} p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.02),0_12px_30px_rgba(0,0,0,0.16)] transition-all duration-200 cursor-pointer ${tone.hover}`}
                >
                  <span className={`absolute left-0 top-5 h-16 w-1 rounded-r-full ${tone.rail}`} />
                  <span
                    className={`pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl ${tone.glow} opacity-45 transition-opacity duration-200 group-hover:opacity-70`}
                  />
                  <span className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                  <div className="relative mb-4 flex items-center justify-between">
                    <span
                      className={`rounded-xl border p-2.5 shadow-[0_0_24px_rgba(0,0,0,0.2)] ${tone.icon}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${tone.badge}`}
                    >
                      {meta.badge}
                    </span>
                  </div>
                  <h3 className="relative text-base font-black tracking-tight text-foreground">
                    {meta.title}
                  </h3>
                  <p className="relative mt-1 min-h-[38px] text-xs leading-5 text-muted-foreground">
                    {meta.desc}
                  </p>
                  <div className="relative mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                        Alertas
                      </p>
                      <p
                        className={`mt-0.5 text-3xl font-black leading-none tabular-nums ${tone.count}`}
                      >
                        {count}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border border-current/25 bg-background/35 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] transition-colors ${tone.cta}`}
                    >
                      Abrir{" "}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-border/70 bg-card/60 p-4 shadow-[0_16px_42px_rgba(0,0,0,0.14)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-black uppercase tracking-[0.16em] text-foreground">
                  Filtro por perÃ­odo
                </h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Informe uma data Ãºnica ou um intervalo para atualizar os nÃºmeros abaixo.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset(7)}
                className="rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs font-semibold transition hover:border-primary/40 hover:text-primary"
              >
                Ãšltimos 7 dias
              </button>
              <button
                type="button"
                onClick={() => applyPreset(30)}
                className="rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs font-semibold transition hover:border-primary/40 hover:text-primary"
              >
                Ãšltimos 30 dias
              </button>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/15"
                >
                  Limpar perÃ­odo
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              type="date"
              value={dataInicial}
              onChange={(event) => setDataInicial(event.target.value)}
              className="date-picker-neon h-11 rounded-xl border border-border/90 bg-background/70 px-3 text-sm outline-none transition focus:border-primary/50"
              aria-label="Data inicial"
            />
            <input
              type="date"
              value={dataFinal}
              onChange={(event) => setDataFinal(event.target.value)}
              className="date-picker-neon h-11 rounded-xl border border-border/90 bg-background/70 px-3 text-sm outline-none transition focus:border-primary/50"
              aria-label="Data final"
            />
          </div>
        </section>

        {loading ? (
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            Carregando central operacional...
          </div>
        ) : null}
        {!loading && error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {!loading && !error ? (
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <OperationalTable
              title="Panorama System Geral"
              accent="info"
              rows={panorama}
              onOpen={openTableTarget}
            />
            <OperationalTable
              title="EstatÃ­sticas do PerÃ­odo"
              accent="warning"
              rows={periodStats}
              onOpen={openTableTarget}
            />
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
              <th className="px-4 py-2.5 text-left font-black">DescriÃ§Ã£o</th>
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
                  title={canOpen ? `Abrir filtro: ${row.label}` : row.disabledReason}
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
                  <td className="px-4 py-2.5 text-right text-lg font-black tabular-nums text-primary">
                    {row.value}
                  </td>
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
