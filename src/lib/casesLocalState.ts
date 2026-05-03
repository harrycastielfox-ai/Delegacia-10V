import { INQUERITOS_CASOS, type InqueritoCaso } from "@/data/inqueritos";
import { REPRESENTACOES_LISTA } from "@/data/sipi";

export type RepresentacaoItem = (typeof REPRESENTACOES_LISTA)[number] & { localRef: string; id: string };

const INQUERITOS_KEY = "sipi.local.inqueritos";
const REPRESENTACOES_KEY = "sipi.local.representacoes";

export function formatRepresentacaoId(id: string | number) {
  const raw = String(id ?? "").trim();
  if (/^RPT-\d{5}$/i.test(raw)) return raw.toUpperCase();
  const onlyDigits = raw.replace(/\D/g, "");
  if (onlyDigits) return `RPT-${onlyDigits.padStart(5, "0")}`;
  return "RPT-00000";
}

export function loadInqueritos(): InqueritoCaso[] {
  if (typeof window === "undefined") return INQUERITOS_CASOS;
  const raw = window.localStorage.getItem(INQUERITOS_KEY);
  if (!raw) return INQUERITOS_CASOS;
  try { return JSON.parse(raw) as InqueritoCaso[]; } catch { return INQUERITOS_CASOS; }
}

export function saveInqueritos(items: InqueritoCaso[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INQUERITOS_KEY, JSON.stringify(items));
}

export function loadRepresentacoes(): RepresentacaoItem[] {
  const seed = REPRESENTACOES_LISTA.map((r, index) => ({ ...r, id: formatRepresentacaoId(r.id), localRef: `${formatRepresentacaoId(r.id)}-${index}` }));
  if (typeof window === "undefined") return seed;
  const raw = window.localStorage.getItem(REPRESENTACOES_KEY);
  if (!raw) return seed;
  try { return JSON.parse(raw) as RepresentacaoItem[]; } catch { return seed; }
}

export function saveRepresentacoes(items: RepresentacaoItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REPRESENTACOES_KEY, JSON.stringify(items));
}
