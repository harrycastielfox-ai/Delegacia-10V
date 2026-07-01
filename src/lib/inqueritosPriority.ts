const FALLBACK = "—";

export type InqueritoOperationalPriority = "ALTA" | "MÉDIA" | "BAIXA";

export type InqueritoOperationalPriorityDetails = {
  priority: InqueritoOperationalPriority;
  reason: string;
};

export const CASE_CATEGORY_OPTIONS = [
  "CVLI",
  "CVP",
  "MIAE",
  "Drogas",
  "Crimes Contra o Patrimônio",
  "Crimes Sexuais",
  "Violência Doméstica",
  "Violento",
  "Violência contra a Criança e o Adolescente",
  "Violência contra a Pessoa Idosa",
  "Crimes de Trânsito",
  "MAE",
  "Outro",
] as const;

const CASE_CATEGORY_BY_NORMALIZED = new Map(
  CASE_CATEGORY_OPTIONS.map((category) => [normalizeText(category), category]),
);

export function normalizeCaseCategory(value: string | null | undefined, fallback = FALLBACK) {
  const normalized = normalizeText(value ?? "");
  if (!normalized || normalized === "selecione") return fallback;
  return CASE_CATEGORY_BY_NORMALIZED.get(normalized) ?? fallback;
}

export function isValidCaseCategory(value: string | null | undefined) {
  return normalizeCaseCategory(value, "") !== "";
}

type PrioritySource = Record<string, unknown>;

function normalizeText(value?: string) {
  return (value ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function pick(record: PrioritySource, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    const text = String(value ?? "").trim();
    if (text && normalizeText(text) !== "selecione") return text;
  }
  return FALLBACK;
}

function parseAnyDate(value?: string) {
  if (!value || value === FALLBACK) return null;
  const raw = value.trim();
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/u.exec(raw);
  if (br) return Date.UTC(Number(br[3]), Number(br[2]) - 1, Number(br[1]), 12, 0, 0, 0);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/u.exec(raw);
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12, 0, 0, 0);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0);
}

function isTruthyLike(value: unknown) {
  return ["true", "t", "1", "sim", "s", "yes", "y"].includes(normalizeText(String(value ?? "")));
}

function daysUntilPrazo(prazo: string) {
  const ts = parseAnyDate(prazo);
  if (ts === null) return null;
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0, 0);
  return Math.round((ts - today) / (1000 * 60 * 60 * 24));
}

function normalizeManualPriority(value: string) {
  const normalized = normalizeText(value);
  if (["alta", "urgente"].includes(normalized)) return "ALTA";
  if (normalized === "media") return "MÉDIA";
  if (normalized === "baixa") return "BAIXA";
  return FALLBACK;
}

function hasReuPreso(record: PrioritySource) {
  const preso = normalizeText(pick(record, "reu_preso", "reuPreso"));
  const custodia = normalizeText(pick(record, "custodia", "situacao_custodia"));
  return (
    isTruthyLike(preso) ||
    ["preso", "reu preso", "custodiado"].includes(preso) ||
    custodia.includes("pres")
  );
}

function hasMedidaProtetiva(record: PrioritySource) {
  const direct = normalizeText(
    pick(
      record,
      "medida_protetiva",
      "medidaProtetiva",
      "medidas_protetivas",
      "medidasProtetivas",
      "protetiva",
    ),
  );
  if (isTruthyLike(direct) || ["ativa", "ativo"].includes(direct)) return true;
  const protetivaTexto = [
    pick(record, "tipo", "tipificacao", "classificacao", "tipo_penal"),
    pick(
      record,
      "medida_protetiva",
      "medidaProtetiva",
      "medidas_protetivas",
      "medidasProtetivas",
      "protetiva",
    ),
  ]
    .map(normalizeText)
    .join(" ");
  return protetivaTexto.includes("protetiv");
}

function categoryMatches(categoria: string, categories: string[]) {
  return categories.some((option) => categoria === option || categoria.includes(option));
}

export function calculateInqueritoOperationalPriorityDetails(
  record: PrioritySource,
): InqueritoOperationalPriorityDetails {
  const prazo = pick(record, "prazo", "data_prazo");
  const prazoDias = daysUntilPrazo(prazo);
  const categoria = normalizeText(
    normalizeCaseCategory(pick(record, "categoria_caso", "categoriaCaso", "gravidade")),
  );
  const manual = normalizeManualPriority(pick(record, "prioridade"));
  const highCategories = ["cvli", "miae", "crimes sexuais", "violencia domestica", "violento"];
  const mediumCategories = [
    "drogas",
    "cvp",
    "crimes contra o patrimonio",
    "crimes de transito",
    "violencia contra crianca e adolescente",
    "violencia contra a crianca e o adolescente",
    "violencia contra pessoa idosa",
    "violencia contra a pessoa idosa",
  ];

  if (hasReuPreso(record)) return { priority: "ALTA", reason: "Alta por réu preso" };
  if (hasMedidaProtetiva(record)) return { priority: "ALTA", reason: "Alta por medida protetiva" };
  if (categoryMatches(categoria, highCategories))
    return { priority: "ALTA", reason: "Alta por categoria crítica" };
  if (prazoDias !== null && prazoDias < 0)
    return { priority: "ALTA", reason: "Alta por prazo vencido" };

  if (prazoDias !== null && prazoDias <= 7)
    return { priority: "MÉDIA", reason: "Média por prazo próximo" };
  if (categoryMatches(categoria, mediumCategories))
    return { priority: "MÉDIA", reason: "Média por categoria intermediária" };
  if (manual === "MÉDIA") return { priority: "MÉDIA", reason: "Média por prioridade manual" };
  if (manual === "BAIXA") return { priority: "BAIXA", reason: "Baixa por prioridade manual" };

  return { priority: "BAIXA", reason: "Baixa sem sinais críticos" };
}

export function calculateInqueritoOperationalPriority(record: PrioritySource) {
  return calculateInqueritoOperationalPriorityDetails(record).priority;
}
