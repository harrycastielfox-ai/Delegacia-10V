import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  AlertOctagon,
  Bell,
  Maximize2,
  ChevronRight,
  Gavel,
  Shield,
  Gauge,
  CalendarDays,
  MapPin,
  Users,
  ArrowUpRight,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line,
  ComposedChart,
  BarChart,
} from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Panel } from "@/components/Panel";
import { listInqueritos, type InqueritoRecord } from "@/lib/repositories/inqueritosRepository";
import {
  listRepresentacoes,
  type RepresentacaoRecord,
} from "@/lib/repositories/representacoesRepository";
import {
  listEscrivaoProductivity,
  type EscrivaoProductivityRow,
} from "@/lib/repositories/productivityRepository";
import { normalizeCaseCategory } from "@/lib/inqueritosPriority";
import { buildCvliMonthlyComparison, isCvliRecord } from "@/lib/cvliMetrics";
import {
  hasDiligenciasPendentes,
  hasRelatorioEnviado,
  isInqueritoEmAndamento,
  isOperationalDateDueWithin,
  isOperationalDateOverdue,
  isRelatadoNaoEnviado,
  isRepresentacaoCumprida,
  isRepresentacaoDeferida,
  isRepresentacaoIndeferida,
  isRepresentacaoPendente,
  isRepresentacaoSigilosaValue,
  isRepresentacaoVencendo,
  isRepresentacaoVencida,
  isYesLike,
  normalizeOperationalText,
  parseOperationalDate,
} from "@/lib/operationalMetrics";
import { buildModuleAlerts, buildSmartAlerts, type ModuleKey } from "@/lib/alertasInteligentes";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel — DT Itabela / 23ª COORPIN" },
      { name: "description", content: "Dashboard executivo da Delegacia Territorial de Itabela." },
    ],
  }),
  component: Dashboard,
});

const PROCEDIMENTO_TYPES = [
  { sigla: "IP", label: "Inquérito Policial", searchValue: "Inquérito Policial" },
  { sigla: "APF", label: "Auto de Prisão em Flagrante", searchValue: "APF" },
  { sigla: "TCO", label: "Termo Circunstanciado", searchValue: "TCO" },
  { sigla: "BOC", label: "Boletim de Ocorrência Circunstanciada", searchValue: "BOC" },
  { sigla: "AIAI", label: "Ato Infracional", searchValue: "AIAI" },
] as const;

const GRAVIDADE_TYPES = [
  {
    key: "cvli",
    label: "CVLI",
    color: "var(--destructive)",
    terms: ["CVLI", "HOMICIDIO", "LATROCINIO", "FEMINICIDIO"],
  },
  {
    key: "violencia_domestica",
    label: "Violência Doméstica",
    color: "var(--destructive)",
    terms: ["VIOLENCIA DOMESTICA", "MARIA DA PENHA"],
  },
  {
    key: "patrimoniais",
    label: "Crimes Patrimoniais",
    color: "var(--warning)",
    terms: [
      "CRIMES CONTRA O PATRIMONIO",
      "PATRIMONIO",
      "FURTO",
      "ROUBO",
      "RECEPTACAO",
      "ESTELIONATO",
      "DANO",
    ],
  },
  {
    key: "drogas",
    label: "Drogas",
    color: "var(--info)",
    terms: ["DROGAS", "TRAFICO", "ENTORPECENTE"],
  },
  {
    key: "sexuais",
    label: "Crimes Sexuais",
    color: "var(--destructive)",
    terms: ["CRIMES SEXUAIS", "ESTUPRO", "SEXUAL", "IMPORTUNACAO"],
  },
  { key: "miae", label: "MIAE", color: "var(--warning)", terms: ["MIAE", "MORTE POR INTERVENCAO"] },
  {
    key: "violento",
    label: "Violento",
    color: "var(--destructive)",
    terms: ["VIOLENTO", "LESÃO CORPORAL", "LESAO CORPORAL", "AMEACA", "AMEAÇA"],
  },
  {
    key: "crianca_adolescente",
    label: "Viol. Criança/Adolesc.",
    color: "var(--destructive)",
    terms: ["CRIANCA", "CRIANÇA", "ADOLESCENTE", "ECA"],
  },
  { key: "outros", label: "Outros", color: "var(--muted-foreground)", terms: ["OUTRO", "OUTROS"] },
] as const;

const WEEKDAY_LOAD_TYPES = [
  { key: 1, label: "Segunda" },
  { key: 2, label: "Terça" },
  { key: 3, label: "Quarta" },
  { key: 4, label: "Quinta" },
  { key: 5, label: "Sexta" },
  { key: 6, label: "Sábado" },
  { key: 0, label: "Domingo" },
] as const;

const DAY_MS = 1000 * 60 * 60 * 24;
const CVLI_MONTH_SHORT_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];
const CVLI_YEAR_COLORS = [
  "var(--muted-foreground)",
  "var(--info)",
  "var(--warning)",
  "var(--destructive)",
  "var(--success)",
  "var(--purple)",
];

function normalizeProcedureText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function getProcedureType(value: unknown) {
  const normalized = normalizeProcedureText(value);
  if (!normalized) return null;
  if (normalized === "IP" || normalized.includes("INQUERITO POLICIAL")) return "IP";
  if (
    normalized === "APF" ||
    normalized.includes("AUTO DE PRISAO EM FLAGRANTE") ||
    normalized.includes("FLAGRANTE")
  )
    return "APF";
  if (normalized === "TCO" || normalized.includes("TERMO CIRCUNSTANCIADO")) return "TCO";
  if (normalized === "BOC" || normalized.includes("BOLETIM DE OCORRENCIA")) return "BOC";
  if (normalized === "AIAI" || normalized.includes("ATO INFRACIONAL")) return "AIAI";
  return null;
}

function pickRecordText(record: InqueritoRecord, ...keys: string[]) {
  const source = record as unknown as Record<string, unknown>;
  return keys
    .map((key) => source[key])
    .filter(Boolean)
    .join(" ");
}

function getGravidadeType(record: InqueritoRecord) {
  const formalCategory = normalizeCaseCategory(
    pickRecordText(record, "categoria_caso", "categoriaCaso", "gravidade"),
    "",
  );
  const searchable = normalizeProcedureText(
    [
      formalCategory,
      pickRecordText(record, "gravidade", "tipificacao", "classificacao", "tipo_penal", "tipo"),
    ].join(" "),
  );

  return (
    GRAVIDADE_TYPES.find((category) => category.terms.some((term) => searchable.includes(term)))
      ?.key ?? "outros"
  );
}

function isValidTeamName(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "Sem equipe") return true;

  const normalized = normalizeProcedureText(trimmed);
  const knownOperationalTerms = [
    "DT",
    "ITABELA",
    "DELEGACIA",
    "EQUIPE",
    "PLANTAO",
    "POLICIA",
    "CIVIL",
    "COORPIN",
    "INVESTIG",
    "OPERACIONAL",
  ];

  if (knownOperationalTerms.some((term) => normalized.includes(term))) return true;
  if (/^\d/u.test(trimmed)) return false;
  if (/\d{3,}/u.test(trimmed)) return false;
  if (/\\/u.test(trimmed)) return false;
  if (!/[AEIOUÁÉÍÓÚÂÊÔÃÕ]/iu.test(trimmed)) return false;

  return true;
}

function Dashboard() {
  const navigate = Route.useNavigate();
  const [isClient, setIsClient] = useState(false);
  const [updatedAtLabel, setUpdatedAtLabel] = useState("");
  const [nowTs, setNowTs] = useState<number | null>(null);
  const [inqueritos, setInqueritos] = useState<InqueritoRecord[]>([]);
  const [representacoes, setRepresentacoes] = useState<RepresentacaoRecord[]>([]);
  const [escrivaoProductivity, setEscrivaoProductivity] = useState<EscrivaoProductivityRow[]>([]);
  const [escrivaoProductivityError, setEscrivaoProductivityError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadRequestIdRef = useRef(0);

  useEffect(() => {
    setIsClient(true);
    setUpdatedAtLabel(new Date().toLocaleDateString("pt-BR"));
    setNowTs(Date.now());
  }, []);

  const normalizeText = normalizeOperationalText;
  const isStatus = (value: unknown, terms: string[]) =>
    terms.some((t) => normalizeText(value).includes(t));
  const isWithinLastDays = useCallback(
    (value: unknown, days: number) => {
      const date = parseOperationalDate(value);
      if (!date || nowTs === null) return false;
      const diff = (nowTs - date.getTime()) / DAY_MS;
      return diff >= 0 && diff <= days;
    },
    [nowTs],
  );
  const getConclusaoDate = (inquerito: InqueritoRecord) => {
    if (!hasRelatorioEnviado(inquerito)) return null;
    return parseOperationalDate(inquerito.data_envio_relatorio);
  };
  const getOperationalEntryDate = (inquerito: InqueritoRecord) =>
    parseOperationalDate(inquerito.created_at) ?? parseOperationalDate(inquerito.data_instauracao);
  const loadDashboardData = useCallback(async (forceRefresh = false) => {
    const requestId = ++loadRequestIdRef.current;
    setLoadError(null);
    setEscrivaoProductivityError(null);

    const [inqueritosResult, representacoesResult, productivityResult] = await Promise.allSettled([
      listInqueritos({ forceRefresh }),
      listRepresentacoes({ forceRefresh }),
      listEscrivaoProductivity(30, { forceRefresh }),
    ]);

    if (requestId !== loadRequestIdRef.current) return;

    const failures: string[] = [];
    if (inqueritosResult.status === "fulfilled") {
      setInqueritos(inqueritosResult.value);
    } else {
      failures.push("inquéritos");
    }

    if (representacoesResult.status === "fulfilled") {
      setRepresentacoes(representacoesResult.value);
    } else {
      failures.push("representações");
    }

    if (productivityResult.status === "fulfilled") {
      setEscrivaoProductivity(productivityResult.value);
    } else {
      setEscrivaoProductivityError(
        "Não foi possível carregar a produtividade institucional agora.",
      );
    }

    setNowTs(Date.now());
    setUpdatedAtLabel(new Date().toLocaleString("pt-BR"));
    if (failures.length > 0) {
      setLoadError(`Não foi possível atualizar: ${failures.join(" e ")}.`);
    }
  }, []);

  useEffect(() => {
    void loadDashboardData(true);

    const refreshOnFocus = () => void loadDashboardData(true);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void loadDashboardData(true);
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      loadRequestIdRef.current += 1;
    };
  }, [loadDashboardData]);

  const total = inqueritos.length;
  const totalRepresentacoes = representacoes.length;
  const alertasPorModulo = useMemo(
    () => buildModuleAlerts(buildSmartAlerts(inqueritos, representacoes)),
    [inqueritos, representacoes],
  );
  const emAndamento = inqueritos.filter(isInqueritoEmAndamento).length;
  const finalizados = inqueritos.filter(hasRelatorioEnviado).length;
  const prioridadeAlta = inqueritos.filter((i) => isStatus(i.prioridade, ["alta"])).length;
  const reuPreso = inqueritos.filter((i) => isYesLike(i.reu_preso)).length;
  const medidasProtetivas = inqueritos.filter((i) => isYesLike(i.medida_protetiva)).length;
  const prazoCritico = inqueritos.filter((i) =>
    isOperationalDateDueWithin(i.prazo, 3, nowTs ?? Date.now()),
  ).length;
  const prazoVencido = inqueritos.filter((i) =>
    isOperationalDateOverdue(i.prazo, nowTs ?? Date.now()),
  ).length;
  const prazoVencendo7 = inqueritos.filter((i) =>
    isOperationalDateDueWithin(i.prazo, 7, nowTs ?? Date.now()),
  ).length;
  const diligenciasPendentes = inqueritos.filter(hasDiligenciasPendentes).length;

  const repsPendentes = representacoes.filter(isRepresentacaoPendente).length;
  const repsDeferidas = representacoes.filter(isRepresentacaoDeferida).length;
  const repsIndeferidas = representacoes.filter(isRepresentacaoIndeferida).length;
  const repsCumpridas = representacoes.filter(isRepresentacaoCumprida).length;
  const repsSigilosas = representacoes.filter((r) =>
    isRepresentacaoSigilosaValue(r.pedido_sigiloso),
  ).length;
  const repsVencidas = representacoes.filter((r) =>
    isRepresentacaoVencida(r, nowTs ?? Date.now()),
  ).length;
  const repsVencendo7 = representacoes.filter((r) =>
    isRepresentacaoVencendo(r, 7, nowTs ?? Date.now()),
  ).length;
  const repsAcompanhamentoEspecial = representacoes.filter((r) =>
    isYesLike(r.acompanhamento_especial),
  ).length;
  const taxaConclusao = total === 0 ? 0 : Number(((finalizados / total) * 100).toFixed(1));
  const relatadosNaoEnviados = inqueritos.filter(isRelatadoNaoEnviado).length;
  const cvliSemRelatar = inqueritos.filter(
    (inquerito) => isCvliRecord(inquerito) && !hasRelatorioEnviado(inquerito),
  ).length;
  const produtividade = useMemo(() => {
    const novos7 = inqueritos.filter((i) => isWithinLastDays(i.created_at, 7)).length;
    const novos30 = inqueritos.filter((i) => isWithinLastDays(i.created_at, 30)).length;
    const concluidos7 = inqueritos.filter((i) => {
      const conclusao = getConclusaoDate(i);
      return conclusao ? isWithinLastDays(conclusao, 7) : false;
    }).length;
    const concluidos30 = inqueritos.filter((i) => {
      const conclusao = getConclusaoDate(i);
      return conclusao ? isWithinLastDays(conclusao, 30) : false;
    }).length;
    const backlogGerado = novos30 - concluidos30;
    const taxaConclusao30 = novos30 === 0 ? 0 : Math.round((concluidos30 / novos30) * 100);
    const situacaoOperacional =
      concluidos30 >= novos30
        ? "Controlada"
        : concluidos30 >= novos30 * 0.8
          ? "Atenção"
          : "Acumulando";
    return {
      novos7,
      novos30,
      concluidos7,
      concluidos30,
      backlogGerado,
      taxaConclusao30,
      situacaoOperacional,
    };
  }, [inqueritos, isWithinLastDays]);
  const backlogGeradoColor =
    produtividade.backlogGerado > 0 ? "var(--destructive)" : "var(--success)";
  const situacaoOperacionalColor =
    produtividade.situacaoOperacional === "Controlada"
      ? "var(--success)"
      : produtividade.situacaoOperacional === "Atenção"
        ? "var(--warning)"
        : "var(--destructive)";
  const cargaPorDiaSemana = useMemo(() => {
    const counts = new Map<number, number>();
    WEEKDAY_LOAD_TYPES.forEach((day) => counts.set(day.key, 0));
    let totalAnalisado = 0;

    inqueritos.forEach((inquerito) => {
      const entryDate = getOperationalEntryDate(inquerito);
      if (!entryDate) return;
      const dayKey = entryDate.getDay();
      counts.set(dayKey, (counts.get(dayKey) ?? 0) + 1);
      totalAnalisado += 1;
    });

    const maxValue = Math.max(0, ...Array.from(counts.values()));
    const dias = WEEKDAY_LOAD_TYPES.map((day) => ({
      ...day,
      total: counts.get(day.key) ?? 0,
      percent: maxValue === 0 ? 0 : Math.round(((counts.get(day.key) ?? 0) / maxValue) * 100),
      isPeak: totalAnalisado > 0 && (counts.get(day.key) ?? 0) === maxValue,
    }));
    const peakDay = totalAnalisado === 0 ? null : (dias.find((day) => day.isPeak) ?? null);
    const mediaDiaria =
      totalAnalisado === 0 ? 0 : Number((totalAnalisado / WEEKDAY_LOAD_TYPES.length).toFixed(1));

    return { dias, totalAnalisado, maxValue, peakDay, mediaDiaria };
  }, [inqueritos]);
  const POR_STATUS = useMemo(
    () => [
      { name: "Em andamento", value: emAndamento, color: "var(--info)" },
      { name: "Concluídos", value: finalizados, color: "var(--success)" },
    ],
    [emAndamento, finalizados],
  );
  const POR_PRIORIDADE = useMemo(
    () => [
      { name: "Alta", value: prioridadeAlta, color: "var(--warning)" },
      {
        name: "Outras",
        value: Math.max(total - prioridadeAlta, 0),
        color: "var(--muted-foreground)",
      },
    ],
    [prioridadeAlta, total],
  );
  const POR_GRAVIDADE = useMemo(() => {
    const counts = new Map<(typeof GRAVIDADE_TYPES)[number]["key"], number>();
    GRAVIDADE_TYPES.forEach((category) => counts.set(category.key, 0));
    inqueritos.forEach((inquerito) => {
      const key = getGravidadeType(inquerito);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return GRAVIDADE_TYPES.map((category, order) => ({
      ...category,
      order,
      value: counts.get(category.key) ?? 0,
    })).sort((a, b) => b.value - a.value || a.order - b.order);
  }, [inqueritos]);
  const maxGravidadeCount = useMemo(
    () => Math.max(1, ...POR_GRAVIDADE.map((item) => item.value)),
    [POR_GRAVIDADE],
  );
  const PROCEDIMENTOS = useMemo(
    () =>
      PROCEDIMENTO_TYPES.map((type) => {
        const totalPorTipo = inqueritos.filter(
          (i) => getProcedureType(i.tipo) === type.sigla,
        ).length;
        return {
          ...type,
          total: totalPorTipo,
          percent: total === 0 ? 0 : Math.round((totalPorTipo / total) * 100),
        };
      }),
    [inqueritos, total],
  );
  const maxProcedimentoCount = useMemo(
    () => Math.max(1, ...PROCEDIMENTOS.map((item) => item.total)),
    [PROCEDIMENTOS],
  );
  const CVLI_COMPARISON = useMemo(() => buildCvliMonthlyComparison(inqueritos), [inqueritos]);
  const CVLI_ANUAL = useMemo(() => {
    return CVLI_COMPARISON.years.map((ano) => {
      const metric = CVLI_COMPARISON.totals[ano];
      return {
        ano,
        registros: metric.registros,
        elucidados: metric.elucidados,
        pendentes: Math.max(metric.registros - metric.elucidados, 0),
        taxa: metric.taxa,
      };
    });
  }, [CVLI_COMPARISON]);
  const CVLI_TOTAL = useMemo(() => {
    const registros = CVLI_ANUAL.reduce((acc, row) => acc + row.registros, 0);
    const elucidados = CVLI_ANUAL.reduce((acc, row) => acc + row.elucidados, 0);
    const pendentes = Math.max(registros - elucidados, 0);
    const taxa = registros === 0 ? 0 : Number(((elucidados / registros) * 100).toFixed(1));
    return { registros, elucidados, pendentes, taxa };
  }, [CVLI_ANUAL]);
  const CVLI_MENSAL_YEARS = CVLI_COMPARISON.years;
  const CVLI_MENSAL_TITLE =
    CVLI_MENSAL_YEARS.length === 0
      ? "CVLI — REGISTROS MENSAIS"
      : `CVLI — REGISTROS MENSAIS (${CVLI_MENSAL_YEARS[0]}${CVLI_MENSAL_YEARS.length > 1 ? `–${CVLI_MENSAL_YEARS[CVLI_MENSAL_YEARS.length - 1]}` : ""})`;
  const CVLI_MENSAL = useMemo(
    () =>
      CVLI_COMPARISON.rows.map((row) => {
        const item: Record<string, number | string> = {
          mes: CVLI_MONTH_SHORT_LABELS[row.monthIndex] ?? row.month.slice(0, 3),
        };

        CVLI_MENSAL_YEARS.forEach((year) => {
          item[`y${year}`] = row.byYear[year]?.registros ?? 0;
        });

        return item;
      }),
    [CVLI_COMPARISON, CVLI_MENSAL_YEARS],
  );
  const POR_BAIRRO = useMemo(() => {
    const byBairro = new Map<string, { total: number; cvli: number; alta: number }>();
    inqueritos.forEach((i) => {
      const key = i.bairro || "Não informado";
      const current = byBairro.get(key) || { total: 0, cvli: 0, alta: 0 };
      current.total += 1;
      current.cvli += isCvliRecord(i) ? 1 : 0;
      current.alta += i.prioridade?.toLowerCase().includes("alta") ? 1 : 0;
      byBairro.set(key, current);
    });
    return Array.from(byBairro.entries()).map(([bairro, v]) => ({ bairro, ...v }));
  }, [inqueritos]);
  const EQUIPES = useMemo(() => {
    const byEquipe = new Map<string, number>();
    inqueritos.forEach((i) => {
      const equipe = String(i.equipe || "Sem equipe").trim() || "Sem equipe";
      if (!isValidTeamName(equipe)) return;
      byEquipe.set(equipe, (byEquipe.get(equipe) || 0) + 1);
    });
    return Array.from(byEquipe.entries()).map(([name, value]) => ({
      name,
      value,
      pct: total === 0 ? 0 : Math.round((value / total) * 100),
    }));
  }, [inqueritos, total]);
  const RANKING_ESCRIVAES = useMemo(
    () =>
      escrivaoProductivity
        .slice()
        .sort(
          (a, b) =>
            b.pontos - a.pontos ||
            b.relatorios_enviados - a.relatorios_enviados ||
            b.cadastros - a.cadastros ||
            a.nome.localeCompare(b.nome, "pt-BR"),
        )
        .slice(0, 5),
    [escrivaoProductivity],
  );
  const panelFxClass =
    "rounded-xl transition-all duration-300 border border-border/70 hover:border-success/55 hover:shadow-[0_0_0_1px_rgba(34,197,94,0.25),0_14px_28px_-22px_rgba(34,197,94,0.75)]";
  const kpiFxClass = "h-full rounded-xl";
  const interactiveItemClass =
    "rounded-md px-1.5 py-1 transition-colors duration-200 hover:bg-success/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/50";

  const goTo = (to: "/inqueritos" | "/representacoes", search?: Record<string, string>) => {
    const params = new URLSearchParams();
    Object.entries(search ?? {}).forEach(([key, value]) => {
      const normalized = String(value ?? "").trim();
      if (normalized) params.set(key, normalized);
    });
    navigate({ to, search: Object.fromEntries(params.entries()) as Record<string, string> });
  };
  const goToAlertasModulo = (modulo: ModuleKey) => {
    navigate({ to: "/alertas/$modulo", params: { modulo } });
  };
  const goToGravidade = (category: { key?: string; value?: number } | undefined) => {
    if (!category?.key || (category.value ?? 0) <= 0) return;
    goTo("/inqueritos", { categoria: category.key });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Painel de Controle"
        subtitle={`SIPI — atualizado em ${updatedAtLabel || "—"}`}
        showActions={false}
      />
      {loadError ? <p className="text-xs text-muted-foreground mb-3">{loadError}</p> : null}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4 mb-6">
        <div className={kpiFxClass}>
          <StatCard
            label="TOTAL"
            value={total}
            hint="Inquéritos ativos acessíveis"
            icon={FileText}
            tone="success"
            onClick={() => navigate({ to: "/inqueritos" })}
          />
        </div>
        <div className={kpiFxClass}>
          <StatCard
            label="EM ANDAMENTO"
            value={emAndamento}
            hint={`${total === 0 ? 0 : Math.round((emAndamento / total) * 100)}% do total`}
            icon={Clock}
            tone="info"
            onClick={() => goTo("/inqueritos", { status: "em_andamento" })}
          />
        </div>
        <div className={kpiFxClass}>
          <StatCard
            label="CONCLUÍDOS"
            value={finalizados}
            hint={`${taxaConclusao}% taxa atual`}
            secondaryHint="Relatórios enviados"
            icon={CheckCircle2}
            tone="primary"
            onClick={() => goTo("/inqueritos", { relatorio: "enviado" })}
          />
        </div>
        <div className={kpiFxClass}>
          <StatCard
            label="PRIOR. ALTA"
            value={prioridadeAlta}
            hint="Requer atenção"
            icon={TrendingUp}
            tone="warning"
            onClick={() => navigate({ to: "/inqueritos", search: { prioridade: "alta" } })}
          />
        </div>
        <div className={kpiFxClass}>
          <StatCard
            label="PRAZO CRÍTICO"
            value={prazoCritico}
            hint="< 3 dias"
            icon={AlertTriangle}
            tone="destructive"
            onClick={() => goTo("/inqueritos", { prazo: "critico" })}
          />
        </div>
        <div className={kpiFxClass}>
          <StatCard
            label="RÉU PRESO"
            value={reuPreso}
            hint="Casos com prisão"
            icon={Shield}
            tone="purple"
            onClick={() => goTo("/inqueritos", { reuPreso: "true" })}
          />
        </div>
        <div className={kpiFxClass}>
          <StatCard
            label="MED. PROTETIVAS"
            value={medidasProtetivas}
            hint="Ativas"
            icon={Gavel}
            tone="warning"
            onClick={() => goTo("/inqueritos", { medidaProtetiva: "true" })}
          />
        </div>
      </div>

      {/* Mid row */}
      <div className="grid grid-cols-1 items-stretch gap-5 mb-6 lg:grid-cols-2 xl:grid-cols-3">
        <div className={`${panelFxClass} h-full`}>
          <Panel
            title="ALERTAS CRÍTICOS"
            accent="destructive"
            icon={<AlertOctagon className="h-4 w-4 text-destructive" />}
            className="h-full"
          >
            <ul className="space-y-3">
              <li
                className={`flex items-center gap-3 ${interactiveItemClass}`}
                role="button"
                tabIndex={0}
                title="Abrir inquéritos com prazo crítico"
                aria-label="Abrir inquéritos com prazo crítico"
                onClick={() => goTo("/inqueritos", { prazo: "critico" })}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") && goTo("/inqueritos", { prazo: "critico" })
                }
              >
                <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-semibold">Inquéritos em prazo crítico</div>
                  <div className="text-xs text-muted-foreground">Menos de 3 dias para vencer</div>
                </div>
                <span className="text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30 px-2 py-1 rounded">
                  {prazoCritico}
                </span>
              </li>
              <li
                className={`flex items-center gap-3 ${interactiveItemClass}`}
                role="button"
                tabIndex={0}
                title="Abrir inquéritos com prioridade alta"
                aria-label="Abrir inquéritos com prioridade alta"
                onClick={() => goTo("/inqueritos", { prioridade: "alta" })}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  goTo("/inqueritos", { prioridade: "alta" })
                }
              >
                <span className="h-2 w-2 rounded-full bg-warning shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-semibold">Casos prioridade ALTA</div>
                  <div className="text-xs text-muted-foreground">Demandam ação imediata</div>
                </div>
                <span className="text-[10px] font-bold bg-warning/15 text-warning border border-warning/30 px-2 py-1 rounded">
                  {prioridadeAlta}
                </span>
              </li>
              <li
                className={`flex items-center gap-3 ${interactiveItemClass}`}
                role="button"
                tabIndex={0}
                title="Abrir CVLI sem relatório enviado"
                aria-label="Abrir CVLI sem relatório enviado"
                onClick={() => goTo("/inqueritos", { categoria: "cvli", relatorio: "sem_relatar" })}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  goTo("/inqueritos", { categoria: "cvli", relatorio: "sem_relatar" })
                }
              >
                <span className="h-2 w-2 rounded-full bg-info shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-semibold">CVLI sem relatar</div>
                  <div className="text-xs text-muted-foreground">IP de homicídios pendentes</div>
                </div>
                <span className="text-[10px] font-bold bg-info/15 text-info border border-info/30 px-2 py-1 rounded">
                  {cvliSemRelatar}
                </span>
              </li>
              <li
                className={`flex items-center gap-3 ${interactiveItemClass}`}
                role="button"
                tabIndex={0}
                title="Abrir representações vencendo em até 7 dias"
                aria-label="Abrir representações vencendo em até 7 dias"
                onClick={() => goTo("/representacoes", { operationalFilter: "vencendo" })}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  goTo("/representacoes", { operationalFilter: "vencendo" })
                }
              >
                <span className="h-2 w-2 rounded-full bg-purple shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-semibold">Representações vencendo (7 dias)</div>
                  <div className="text-xs text-muted-foreground">Urgência judicial</div>
                </div>
                <span className="text-[10px] font-bold bg-purple/15 text-purple border border-purple/30 px-2 py-1 rounded">
                  {repsVencendo7}
                </span>
              </li>
            </ul>
          </Panel>
        </div>

        <div className={`${panelFxClass} h-full`}>
          <Panel
            title="PENDÊNCIAS POR CATEGORIA"
            accent="warning"
            icon={<Bell className="h-4 w-4 text-warning" />}
            className="h-full"
          >
            <ul className="grid gap-2">
              {[
                {
                  label: "Representações",
                  value: totalRepresentacoes,
                  onClick: () => goTo("/representacoes"),
                  title: "Abrir lista de representações",
                },
                {
                  label: "Em andamento",
                  value: emAndamento,
                  onClick: () => goTo("/inqueritos", { status: "em_andamento" }),
                  title: "Abrir inquéritos em andamento",
                },
                {
                  label: "Concluídos",
                  value: finalizados,
                  onClick: () => goTo("/inqueritos", { relatorio: "enviado" }),
                  title: "Abrir inquéritos concluídos",
                },
                {
                  label: "Alertas/Prazos",
                  value: alertasPorModulo.prazos.length,
                  onClick: () => goToAlertasModulo("prazos"),
                  title: "Abrir módulo de alertas de prazo",
                },
                {
                  label: "Críticos",
                  value: alertasPorModulo.criticos.length,
                  onClick: () => goToAlertasModulo("criticos"),
                  title: "Abrir módulo de alertas críticos",
                },
                {
                  label: "Dados incompletos",
                  value: alertasPorModulo["dados-incompletos"].length,
                  onClick: () => goToAlertasModulo("dados-incompletos"),
                  title: "Abrir módulo de dados incompletos",
                },
              ].map((p) => (
                <li
                  key={p.label}
                  className={`flex items-center gap-3 py-1.5 ${interactiveItemClass}`}
                  role="button"
                  tabIndex={0}
                  title={p.title}
                  aria-label={p.title}
                  onClick={p.onClick}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && p.onClick()}
                >
                  <span className="h-2 w-2 rounded-full bg-warning shrink-0" />
                  <div className="flex-1 text-sm">{p.label}</div>
                  <div className="text-sm font-bold tabular-nums text-warning">{p.value}</div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className={`${panelFxClass} h-full`}>
          <Panel
            title="META DE CONCLUSÃO"
            accent="success"
            icon={<CheckCircle2 className="h-4 w-4 text-success" />}
            className="h-full"
          >
            <ul className="space-y-3 text-sm">
              <Row
                label="Procedimentos cadastrados"
                value={String(total)}
                color="var(--info)"
                onClick={() => goTo("/inqueritos")}
                title="Abrir todos os inquéritos"
              />
              <Row
                label="Relatórios enviados"
                value={String(finalizados)}
                color="var(--success)"
                onClick={() => goTo("/inqueritos", { relatorio: "enviado" })}
                title="Abrir inquéritos relatados"
              />
              <Row
                label="Em andamento"
                value={String(emAndamento)}
                color="var(--warning)"
                onClick={() => goTo("/inqueritos", { status: "em_andamento" })}
                title="Abrir inquéritos em andamento"
              />
              <Row
                label="Relatados não enviados"
                value={String(relatadosNaoEnviados)}
                color="var(--purple)"
                onClick={() => goTo("/inqueritos", { relatorio: "relatado_nao_enviado" })}
                title="Abrir inquéritos relatados sem envio formal"
              />
            </ul>
            <div className="mt-4 p-3 rounded-lg bg-success/5 border border-success/20 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-xs font-semibold">Taxa de conclusão atual</div>
                <div className="text-[11px] text-muted-foreground">
                  Meta: 100% — atual {taxaConclusao}%
                </div>
              </div>
              <div className="relative h-12 w-12">
                <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="var(--success)"
                    strokeWidth="3"
                    strokeDasharray={`${(taxaConclusao / 100) * 94} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-success">
                  {Math.round(taxaConclusao)}%
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Blocos operacionais/judiciais/urgência */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
        <div className={panelFxClass}>
          <Panel title="VISÃO OPERACIONAL" accent="success">
            <ul className="space-y-2 text-sm">
              <Row
                label="Em andamento"
                value={String(emAndamento)}
                color="var(--info)"
                onClick={() => goTo("/inqueritos", { status: "em_andamento" })}
              />
              <Row
                label="Concluídos"
                value={String(finalizados)}
                color="var(--success)"
                onClick={() => goTo("/inqueritos", { relatorio: "enviado" })}
              />
              <Row
                label="Alta prioridade"
                value={String(prioridadeAlta)}
                color="var(--warning)"
                onClick={() => goTo("/inqueritos", { prioridade: "alta" })}
              />
              <Row
                label="Diligências pendentes"
                value={String(diligenciasPendentes)}
                color="var(--destructive)"
                onClick={() => goTo("/inqueritos", { diligenciasPendentes: "true" })}
              />
              <Row
                label="Réu preso"
                value={String(reuPreso)}
                color="var(--purple)"
                onClick={() => goTo("/inqueritos", { reuPreso: "true" })}
              />
              <Row
                label="Medida protetiva"
                value={String(medidasProtetivas)}
                color="var(--warning)"
                onClick={() => goTo("/inqueritos", { medidaProtetiva: "true" })}
              />
            </ul>
          </Panel>
        </div>
        <div className={panelFxClass}>
          <Panel title="VISÃO JUDICIAL" accent="info">
            <ul className="space-y-2 text-sm">
              <Row
                label="Total de representações"
                value={String(totalRepresentacoes)}
                color="var(--info)"
                onClick={() => goTo("/representacoes")}
              />
              <Row
                label="Pendentes"
                value={String(repsPendentes)}
                color="var(--warning)"
                onClick={() => goTo("/representacoes", { operationalFilter: "pendentes" })}
              />
              <Row
                label="Deferidas"
                value={String(repsDeferidas)}
                color="var(--success)"
                onClick={() => goTo("/representacoes", { operationalFilter: "deferidas" })}
              />
              <Row
                label="Indeferidas"
                value={String(repsIndeferidas)}
                color="var(--destructive)"
                onClick={() => goTo("/representacoes", { operationalFilter: "indeferidas" })}
              />
              <Row
                label="Cumpridas"
                value={String(repsCumpridas)}
                color="var(--primary)"
                onClick={() => goTo("/representacoes", { operationalFilter: "cumpridas" })}
              />
              <Row
                label="Sigilosas"
                value={String(repsSigilosas)}
                color="var(--purple)"
                onClick={() => goTo("/representacoes", { operationalFilter: "sigilosas" })}
              />
            </ul>
          </Panel>
        </div>
        <div className={panelFxClass}>
          <Panel title="VISÃO DE URGÊNCIA" accent="destructive">
            <ul className="space-y-2 text-sm">
              <Row
                label="Prazo vencido"
                value={String(prazoVencido)}
                color="var(--destructive)"
                onClick={() => goTo("/inqueritos", { prazo: "vencido" })}
              />
              <Row
                label="Vencendo em 7 dias"
                value={String(prazoVencendo7)}
                color="var(--warning)"
                onClick={() => goTo("/inqueritos", { prazo: "vencendo" })}
              />
              <Row
                label="Prazo crítico (0-3 dias)"
                value={String(prazoCritico)}
                color="var(--destructive)"
                onClick={() => goTo("/inqueritos", { prazo: "critico" })}
              />
              <Row
                label="Representações vencidas"
                value={String(repsVencidas)}
                color="var(--destructive)"
                onClick={() => goTo("/representacoes", { operationalFilter: "vencidas" })}
              />
              <Row
                label="Representações vencendo (7 dias)"
                value={String(repsVencendo7)}
                color="var(--warning)"
                onClick={() => goTo("/representacoes", { operationalFilter: "vencendo" })}
              />
              <Row
                label="Acompanhamento especial"
                value={String(repsAcompanhamentoEspecial)}
                color="var(--info)"
                onClick={() => goTo("/representacoes", { operationalFilter: "especial" })}
              />
            </ul>
          </Panel>
        </div>
      </div>

      {/* Donut row */}
      <div className="grid grid-cols-1 items-stretch gap-5 mb-6 lg:grid-cols-3">
        <div className={`${panelFxClass} h-full`}>
          <DonutPanel
            isClient={isClient}
            title="POR STATUS DE DILIGÊNCIA"
            data={POR_STATUS}
            total={POR_STATUS.reduce((a, b) => a + b.value, 0)}
            getItemAction={(name) =>
              name === "Em andamento"
                ? {
                    title: "Abrir inquéritos em andamento",
                    onClick: () => goTo("/inqueritos", { status: "em_andamento" }),
                  }
                : name === "Concluídos"
                  ? {
                      title: "Abrir inquéritos concluídos",
                      onClick: () => goTo("/inqueritos", { relatorio: "enviado" }),
                    }
                  : undefined
            }
          />
        </div>
        <div className={`${panelFxClass} h-full`}>
          <DonutPanel
            isClient={isClient}
            title="POR PRIORIDADE"
            data={POR_PRIORIDADE}
            total={POR_PRIORIDADE.reduce((a, b) => a + b.value, 0)}
            getItemAction={(name) =>
              name === "Alta"
                ? {
                    title: "Abrir inquéritos com prioridade alta",
                    onClick: () => goTo("/inqueritos", { prioridade: "alta" }),
                  }
                : undefined
            }
          />
        </div>
        <div className={`${panelFxClass} h-full`}>
          <Panel
            title="PROCEDIMENTOS POR TIPO"
            accent="success"
            className="h-full"
            action={<Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />}
          >
            <ul className="space-y-4">
              {PROCEDIMENTOS.map((t) => {
                const width =
                  t.total === 0
                    ? 0
                    : Math.max(5, Math.round((t.total / maxProcedimentoCount) * 100));
                return (
                  <li
                    key={t.sigla}
                    className="cursor-pointer rounded-md px-0.5 py-0.5 transition-colors duration-200 hover:bg-success/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/50"
                    role="button"
                    tabIndex={0}
                    title={`Abrir inquéritos do tipo ${t.sigla}`}
                    aria-label={`Abrir inquéritos do tipo ${t.sigla}`}
                    onClick={() => goTo("/inqueritos", { tipo: t.searchValue })}
                    onKeyDown={(e) =>
                      (e.key === "Enter" || e.key === " ") &&
                      goTo("/inqueritos", { tipo: t.searchValue })
                    }
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-sm font-black tracking-wide text-foreground">
                        {t.sigla}
                      </span>
                      <span className="text-sm font-black tabular-nums text-success">
                        {t.total}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted/70 shadow-inner shadow-black/20">
                      <div
                        className="h-full rounded-full bg-success shadow-[0_0_18px_rgba(34,197,94,0.5)] transition-all duration-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 text-[11px] text-muted-foreground">
              IP: Inquéritos · APF: Flagrantes · TCO: Termos · BOC: Boletins · AIAI: Ato Infracional
            </div>
          </Panel>
        </div>
      </div>

      {/* CVLI Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
        <div className={`${panelFxClass} xl:col-span-2`}>
          <Panel title="CVLI — COMPARATIVO ANUAL" accent="info">
            <div className="h-[285px] min-h-[285px] w-full min-w-0">
              {isClient && CVLI_ANUAL.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={CVLI_ANUAL}
                    margin={{ top: 16, right: 32, bottom: 26, left: -8 }}
                  >
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" />
                    <XAxis dataKey="ano" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis
                      yAxisId="left"
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      allowDecimals={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="registros"
                      name="Registros"
                      fill="var(--info)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="elucidados"
                      name="Elucidados"
                      fill="var(--success)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="linear"
                      dataKey="taxa"
                      name="Taxa de elucidação (%)"
                      stroke="var(--foreground)"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "var(--foreground)" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Nenhum dado disponível.
                </div>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[11px]">
              <Legend color="var(--info)" label="Registros" />
              <Legend color="var(--success)" label="Elucidados" />
              <Legend color="var(--foreground)" label="Taxa de elucidação (%)" line />
            </div>
          </Panel>
        </div>

        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:border-success/55 hover:shadow-[0_0_0_1px_rgba(34,197,94,0.25),0_14px_28px_-22px_rgba(34,197,94,0.75)]">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/20 px-4 py-3">
            <div className="text-[10px] tracking-[0.15em] text-info font-bold">
              CVLI — RESUMO ANUAL
            </div>
            <button
              type="button"
              onClick={() => navigate({ to: "/cvli-comparativo" })}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-success/70 bg-success px-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-background shadow-[0_0_12px_rgba(34,197,94,0.38)] transition hover:-translate-y-0.5 hover:shadow-[0_0_18px_rgba(34,197,94,0.58)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/60"
            >
              Abrir
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="md:hidden divide-y divide-border">
            {CVLI_ANUAL.map((r) => (
              <div key={r.ano} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{r.ano}</span>
                  <span className="text-success font-black">
                    {r.taxa.toString().replace(".", ",")}%
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                  <span>
                    Reg. <strong className="text-foreground">{r.registros}</strong>
                  </span>
                  <span>
                    Eluc. <strong className="text-foreground">{r.elucidados}</strong>
                  </span>
                </div>
              </div>
            ))}
            <div className="px-4 py-3 bg-muted/30 font-bold">
              <div className="flex items-center justify-between gap-3">
                <span>TOTAL</span>
                <span className="text-success">
                  {CVLI_TOTAL.taxa.toString().replace(".", ",")}%
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <span>
                  Reg. <strong className="text-foreground">{CVLI_TOTAL.registros}</strong>
                </span>
                <span>
                  Eluc. <strong className="text-foreground">{CVLI_TOTAL.elucidados}</strong>
                </span>
              </div>
            </div>
          </div>
          <div className="hidden min-h-0 flex-1 flex-col overflow-x-auto md:flex">
            <table className="w-full text-sm">
              <thead className="text-[10px] tracking-[0.15em] text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-bold">ANO</th>
                  <th className="text-right px-4 py-3 font-bold">REG</th>
                  <th className="text-right px-4 py-3 font-bold">ELUC</th>
                  <th className="text-right px-4 py-3 font-bold">%</th>
                </tr>
              </thead>
              <tbody>
                {CVLI_ANUAL.map((r) => (
                  <tr
                    key={r.ano}
                    className="border-b border-border/50 transition-colors duration-200 hover:bg-success/10"
                  >
                    <td className="px-4 py-3 font-semibold">{r.ano}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.registros}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.elucidados}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-success font-semibold">
                      {r.taxa.toString().replace(".", ",")}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="mt-auto w-full border-t border-border text-sm">
              <tbody>
                <tr className="font-bold">
                  <td className="px-4 py-3">TOTAL</td>
                  <td className="px-4 py-3 text-right tabular-nums">{CVLI_TOTAL.registros}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{CVLI_TOTAL.elucidados}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-success">
                    {CVLI_TOTAL.taxa.toString().replace(".", ",")}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CVLI mensal + Bairros */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
        <div className={panelFxClass}>
          <Panel title={CVLI_MENSAL_TITLE} accent="info">
            <SafeChartContainer fallback="Nenhum dado disponível.">
              {isClient && CVLI_MENSAL_YEARS.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={CVLI_MENSAL}
                    margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
                  >
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={10} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    {CVLI_MENSAL_YEARS.map((year, index) => (
                      <Bar
                        key={year}
                        dataKey={`y${year}`}
                        fill={CVLI_YEAR_COLORS[index % CVLI_YEAR_COLORS.length]}
                        name={String(year)}
                        radius={[3, 3, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Nenhum dado disponível.
                </div>
              )}
            </SafeChartContainer>
          </Panel>
        </div>

        <div className={panelFxClass}>
          <Panel
            title="ANÁLISE POR LOCALIDADE"
            accent="warning"
            icon={<MapPin className="h-4 w-4 text-warning" />}
            action={
              <button
                type="button"
                onClick={() => navigate({ to: "/localidades" })}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-warning/70 bg-warning px-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-background shadow-[0_0_12px_rgba(245,158,11,0.34)] transition hover:-translate-y-0.5 hover:shadow-[0_0_18px_rgba(245,158,11,0.48)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/60"
              >
                Abrir
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            }
          >
            <div className="overflow-auto max-h-72">
              <table className="w-full text-sm">
                <thead className="text-[10px] tracking-[0.15em] text-muted-foreground sticky top-0 bg-card">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-bold">BAIRRO</th>
                    <th className="text-right py-2 font-bold">TOTAL</th>
                    <th className="text-right py-2 font-bold">CVLI</th>
                    <th className="text-right py-2 font-bold">ALTA</th>
                  </tr>
                </thead>
                <tbody>
                  {POR_BAIRRO.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                        Nenhum dado disponível.
                      </td>
                    </tr>
                  ) : (
                    POR_BAIRRO.map((b) => (
                      <tr
                        key={b.bairro}
                        className="border-b border-border/50 transition-colors duration-200 hover:bg-success/10"
                      >
                        <td className="py-2.5 font-medium">{b.bairro}</td>
                        <td className="py-2.5 text-right tabular-nums">{b.total}</td>
                        <td className="py-2.5 text-right tabular-nums text-destructive">
                          {b.cvli}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-warning">{b.alta}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>

      {/* Gravidade + Equipe */}
      <div className="grid grid-cols-1 items-stretch xl:grid-cols-2 gap-5">
        <div className={`${panelFxClass} h-full`}>
          <Panel title="ANÁLISE POR GRAVIDADE" accent="destructive" className="h-full">
            <div className="h-[300px] min-h-[300px] w-full min-w-0">
              {isClient ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={POR_GRAVIDADE}
                    layout="vertical"
                    margin={{ top: 10, right: 12, bottom: 4, left: 72 }}
                  >
                    <CartesianGrid
                      stroke="var(--border)"
                      strokeDasharray="3 4"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      allowDecimals={false}
                      domain={[0, Math.max(1, maxGravidadeCount)]}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      stroke="var(--muted-foreground)"
                      fontSize={10}
                      width={72}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{
                        fill: "rgba(255,255,255,0.14)",
                        stroke: "rgba(255,255,255,0.18)",
                        strokeWidth: 1,
                      }}
                      formatter={(value) => [`n: ${Number(value ?? 0)}`, "Procedimentos"]}
                      labelStyle={{
                        color: "var(--foreground)",
                        fontWeight: 800,
                        marginBottom: 4,
                      }}
                      itemStyle={{
                        color: "var(--destructive)",
                        fontWeight: 700,
                      }}
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                        boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
                      }}
                    />
                    <Bar
                      dataKey="value"
                      name="Procedimentos"
                      fill="var(--destructive)"
                      radius={[0, 4, 4, 0]}
                      activeBar={{
                        fill: "#ff4d57",
                        stroke: "rgba(255,255,255,0.9)",
                        strokeWidth: 1,
                      }}
                      onClick={(data) =>
                        goToGravidade(
                          (data as { payload?: { key?: string; value?: number } }).payload,
                        )
                      }
                    >
                      {POR_GRAVIDADE.map((item) => (
                        <Cell
                          key={item.key}
                          fill="var(--destructive)"
                          cursor={item.value > 0 ? "pointer" : "default"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Nenhum dado disponível.
                </div>
              )}
            </div>
          </Panel>
        </div>

        <div className={`${panelFxClass} h-full`}>
          <Panel
            title="DISTRIBUIÇÃO POR EQUIPE"
            accent="success"
            icon={<Users className="h-4 w-4 text-success" />}
            action={<ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            className="h-full"
          >
            {EQUIPES.length === 0 ? (
              <div className="py-6 text-sm text-muted-foreground">Nenhum dado disponível.</div>
            ) : (
              <ul className="space-y-3.5">
                {EQUIPES.map((t) => (
                  <li key={t.name} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-44 truncate">{t.name}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success rounded-full"
                        style={{ width: `${t.pct}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground w-20 text-right">
                      {t.value} ({t.pct}%)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-foreground">
              Gestão Operacional
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Ritmo da unidade, carga semanal e módulos planejados.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
          <div className={`${panelFxClass} h-full`}>
            <Panel
              title="PRODUTIVIDADE OPERACIONAL"
              accent="success"
              icon={<Gauge className="h-4 w-4 text-success" />}
              className="h-full"
            >
              <div className="flex h-full min-h-[300px] flex-col">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border/55 bg-background/25 px-3.5 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Novos (7d)
                    </div>
                    <div className="mt-1.5 text-2xl font-black tabular-nums text-info">
                      {produtividade.novos7}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/55 bg-background/25 px-3.5 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Concluídos (7d)
                    </div>
                    <div className="mt-1.5 text-2xl font-black tabular-nums text-success">
                      {produtividade.concluidos7}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/55 bg-background/25 px-3.5 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Novos (30d)
                    </div>
                    <div className="mt-1.5 text-2xl font-black tabular-nums text-info">
                      {produtividade.novos30}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/55 bg-background/25 px-3.5 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Concluídos (30d)
                    </div>
                    <div className="mt-1.5 text-2xl font-black tabular-nums text-success">
                      {produtividade.concluidos30}
                    </div>
                  </div>
                </div>

                <div className="mt-auto rounded-lg border border-border/60 bg-background/25 px-3.5 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-foreground">Taxa de conclusão</span>
                    <span className="text-sm font-black tabular-nums text-success">
                      {produtividade.taxaConclusao30}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/80 shadow-inner shadow-black/20">
                    <div
                      className="h-full rounded-full bg-success transition-all duration-500"
                      style={{
                        width: `${Math.min(100, produtividade.taxaConclusao30)}%`,
                        boxShadow:
                          produtividade.taxaConclusao30 > 0
                            ? "0 0 18px rgba(34,197,94,0.45)"
                            : "none",
                      }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      Backlog gerado:{" "}
                      <strong
                        className="font-black tabular-nums"
                        style={{ color: backlogGeradoColor }}
                      >
                        {produtividade.backlogGerado > 0
                          ? `+${produtividade.backlogGerado}`
                          : produtividade.backlogGerado}
                      </strong>
                    </span>
                    <span>
                      Situação:{" "}
                      <strong className="font-black" style={{ color: situacaoOperacionalColor }}>
                        {produtividade.situacaoOperacional}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          <div className={`${panelFxClass} h-full`}>
            <Panel
              title="CARGA POR DIA DA SEMANA"
              accent="info"
              icon={<CalendarDays className="h-4 w-4 text-info" />}
              className="h-full"
            >
              <div className="mb-4 grid grid-cols-3 gap-2">
                <div className="rounded-md border border-success/25 bg-success/5 px-3 py-2.5">
                  <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Maior
                  </div>
                  <div className="mt-1 truncate text-sm font-black text-success">
                    {cargaPorDiaSemana.peakDay?.label ?? "Sem dados"}
                  </div>
                </div>
                <div className="rounded-md border border-border/60 bg-background/30 px-3 py-2.5">
                  <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Média
                  </div>
                  <div className="mt-1 text-sm font-black tabular-nums text-foreground">
                    {cargaPorDiaSemana.mediaDiaria.toString().replace(".", ",")}
                  </div>
                </div>
                <div className="rounded-md border border-border/60 bg-background/30 px-3 py-2.5">
                  <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Total
                  </div>
                  <div className="mt-1 text-sm font-black tabular-nums text-foreground">
                    {cargaPorDiaSemana.totalAnalisado}
                  </div>
                </div>
              </div>

              <ul className="space-y-3">
                {cargaPorDiaSemana.dias.map((day) => {
                  const width = day.total === 0 ? 0 : Math.max(8, day.percent);
                  return (
                    <li
                      key={day.key}
                      className={`grid grid-cols-[5.25rem_1fr_2.5rem] items-center gap-3 rounded-md px-1.5 py-1 text-sm ${day.isPeak ? "bg-success/5" : ""}`}
                    >
                      <span
                        className={`truncate font-bold ${day.isPeak ? "text-success" : "text-muted-foreground"}`}
                      >
                        {day.label}
                      </span>
                      <div className="h-4 overflow-hidden rounded-full bg-muted/80 shadow-inner shadow-black/20">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${width}%`,
                            backgroundColor: day.isPeak ? "var(--success)" : "var(--info)",
                            boxShadow: day.total > 0 ? "0 0 16px rgba(34,197,94,0.4)" : "none",
                          }}
                        />
                      </div>
                      <span className="text-right font-black tabular-nums text-foreground">
                        {day.total}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </div>

          <div className={`${panelFxClass} h-full`}>
            <Panel
              title="RANKING DE ESCRIVÃES"
              accent="warning"
              icon={<Users className="h-4 w-4 text-warning" />}
              className="h-full"
            >
              <div className="min-w-0">
                <div className="grid grid-cols-[minmax(0,1.6fr)_0.7fr_0.62fr_0.7fr_0.7fr] gap-2 border-b border-border/70 px-1 pb-2.5 text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  <span>Escrivão</span>
                  <span className="text-right">Pontos</span>
                  <span className="text-right">Cad.</span>
                  <span className="text-right">Relat.</span>
                  <span className="text-right">Atual.</span>
                </div>
                {escrivaoProductivityError ? (
                  <div className="py-6 text-center text-xs text-warning">
                    {escrivaoProductivityError}
                  </div>
                ) : RANKING_ESCRIVAES.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    Defina a função Escrivão(ã) no perfil administrativo para iniciar o ranking.
                  </div>
                ) : (
                  <div>
                    {RANKING_ESCRIVAES.map((row, index) => (
                      <div
                        key={row.user_id}
                        className="grid w-full grid-cols-[minmax(0,1.6fr)_0.7fr_0.62fr_0.7fr_0.7fr] items-center gap-2 border-b border-border/35 px-1 py-2 text-left text-xs last:border-b-0"
                        title={
                          row.ultima_atividade
                            ? `Última atividade: ${new Date(row.ultima_atividade).toLocaleString("pt-BR")}`
                            : "Sem atividade no período"
                        }
                      >
                        <span className="flex min-w-0 items-center gap-2 truncate font-black text-foreground">
                          <span
                            className={`w-4 shrink-0 text-[10px] ${
                              index === 0
                                ? "text-warning"
                                : index === 1
                                  ? "text-muted-foreground"
                                  : index === 2
                                    ? "text-amber-700"
                                    : "text-muted-foreground/60"
                            }`}
                          >
                            {index + 1}º
                          </span>
                          <span className="truncate">{row.nome}</span>
                        </span>
                        <span className="text-right font-black tabular-nums text-foreground">
                          {row.pontos}
                        </span>
                        <span className="text-right font-black tabular-nums text-info">
                          {row.cadastros}
                        </span>
                        <span className="text-right font-black tabular-nums text-success">
                          {row.relatorios_enviados}
                        </span>
                        <span className="text-right font-black tabular-nums text-warning">
                          {row.atualizacoes}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}

function SafeChartContainer({ children, fallback }: { children: ReactNode; fallback: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasSize, setHasSize] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      const nextHasSize = element.clientWidth > 0 && element.clientHeight > 0;
      setHasSize((current) => (current === nextHasSize ? current : nextHasSize));
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-[220px] min-h-[220px] w-full min-w-0">
      {hasSize ? (
        children
      ) : (
        <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
          {fallback}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  color,
  onClick,
  title,
}: {
  label: string;
  value: string;
  color: string;
  onClick?: () => void;
  title?: string;
}) {
  const clickable = Boolean(onClick);
  return (
    <li
      className={`flex items-center justify-between rounded-md px-1.5 py-1 ${clickable ? "cursor-pointer transition-colors duration-200 hover:bg-success/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/50" : ""}`}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      title={title}
      aria-label={title}
      onClick={onClick}
      onKeyDown={clickable ? (e) => (e.key === "Enter" || e.key === " ") && onClick?.() : undefined}
    >
      <span className="flex items-center gap-2 text-foreground/90">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="tabular-nums font-semibold" style={{ color }}>
        {value}
      </span>
    </li>
  );
}

function Legend({ color, label, line }: { color: string; label: string; line?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      {line ? (
        <span className="h-0.5 w-4" style={{ backgroundColor: color }} />
      ) : (
        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      )}
      {label}
    </span>
  );
}

function DonutPanel({
  isClient,
  title,
  data,
  total,
  getItemAction,
}: {
  isClient: boolean;
  title: string;
  data: { name: string; value: number; color: string }[];
  total: number;
  getItemAction?: (name: string) => { title: string; onClick: () => void } | undefined;
}) {
  const hasData = data.some((item) => item.value > 0);

  return (
    <Panel
      title={title}
      accent="success"
      action={<Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />}
      className="h-full"
    >
      <div className="flex items-center gap-4">
        <div className="relative h-36 w-36 shrink-0">
          {isClient && hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
              Nenhum dado disponível.
            </div>
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums">{total}</span>
            <span className="text-[10px] text-muted-foreground">Total</span>
          </div>
        </div>
        <ul className="flex-1 space-y-2 text-sm">
          {data.map((d) => {
            const pct = total === 0 ? 0 : Math.round((d.value / total) * 100);
            const action = getItemAction?.(d.name);
            return (
              <li
                key={d.name}
                className={`flex items-center gap-2 rounded-md px-1.5 py-1 ${action ? "cursor-pointer transition-colors duration-200 hover:bg-success/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/50" : ""}`}
                role={action ? "button" : undefined}
                tabIndex={action ? 0 : undefined}
                title={action?.title}
                aria-label={action?.title}
                onClick={action?.onClick}
                onKeyDown={
                  action
                    ? (e) => (e.key === "Enter" || e.key === " ") && action.onClick()
                    : undefined
                }
              >
                <span
                  className="h-2.5 w-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span className="flex-1 text-foreground/90 text-xs truncate">{d.name}</span>
                <span className="tabular-nums text-muted-foreground text-xs">
                  {d.value} ({pct}%)
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Panel>
  );
}
