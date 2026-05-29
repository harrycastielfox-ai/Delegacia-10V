const FALLBACK = "—";

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

function isEmpty(value: string) {
  return !value || value === FALLBACK;
}

function daysUntilPrazo(prazo: string) {
  const ts = parseAnyDate(prazo);
  if (ts === null) return null;
  return Math.ceil((ts - Date.now()) / (1000 * 60 * 60 * 24));
}

function normalizeManualPriority(value: string) {
  const normalized = normalizeText(value);
  if (["alta", "urgente"].includes(normalized)) return "ALTA";
  if (["media", "média"].includes(normalized)) return "MÉDIA";
  if (normalized === "baixa") return "BAIXA";
  return FALLBACK;
}

function hasReuPreso(record: PrioritySource) {
  const preso = normalizeText(pick(record, "reu_preso", "reuPreso"));
  const custodia = normalizeText(pick(record, "custodia", "situacao_custodia"));
  return isTruthyLike(preso) || ["preso", "reu preso", "réu preso", "custodiado"].includes(preso) || custodia.includes("pres");
}

function hasMedidaProtetiva(record: PrioritySource) {
  const direct = normalizeText(pick(record, "medida_protetiva", "medidaProtetiva", "medidas_protetivas", "medidasProtetivas", "protetiva"));
  if (isTruthyLike(direct) || ["ativa", "ativo"].includes(direct)) return true;
  const protetivaTexto = [
    pick(record, "tipo", "tipificacao", "classificacao", "tipo_penal"),
    pick(record, "medida_protetiva", "medidaProtetiva", "medidas_protetivas", "medidasProtetivas", "protetiva"),
  ].map(normalizeText).join(" ");
  return protetivaTexto.includes("protetiv");
}

export function calculateInqueritoOperationalPriority(record: PrioritySource) {
  const prazo = pick(record, "prazo", "data_prazo");
  const prazoDias = daysUntilPrazo(prazo);
  const categoria = normalizeText(pick(record, "categoria_caso", "categoriaCaso", "gravidade"));
  const situacao = pick(record, "situacao", "situação", "status");
  const statusDiligencias = pick(record, "status_diligencias", "statusDiligencias");
  const hasAnySignal = prazoDias !== null || hasReuPreso(record) || hasMedidaProtetiva(record) || !isEmpty(categoria) || !isEmpty(situacao) || !isEmpty(statusDiligencias);
  const highCategories = ["cvli", "miae", "crimes sexuais", "violencia domestica", "violento"];
  const mediumCategories = ["drogas", "cvp", "crimes contra o patrimonio", "crimes de transito", "violencia contra crianca e adolescente", "violencia contra a crianca e o adolescente", "violencia contra pessoa idosa", "violencia contra a pessoa idosa"];

  if ((prazoDias !== null && prazoDias <= 7) || hasReuPreso(record) || hasMedidaProtetiva(record) || highCategories.includes(categoria)) return "ALTA";
  if ((prazoDias !== null && prazoDias <= 15) || mediumCategories.includes(categoria)) return "MÉDIA";
  if (!hasAnySignal) {
    const manual = normalizeManualPriority(pick(record, "prioridade"));
    if (manual !== FALLBACK) return manual;
  }
  return "BAIXA";
}
