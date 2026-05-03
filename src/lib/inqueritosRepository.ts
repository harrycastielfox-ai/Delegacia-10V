import { supabase } from "@/lib/supabaseClient";
import { loadInqueritos } from "@/lib/casesLocalState";

type SupabaseInquerito = {
  id: string;
  codigo_interno: string | null;
  numero_ppe: string | null;
  numero_fisico: string | null;
  numero_bo: string | null;
  tipo: string | null;
  tipificacao: string | null;
  gravidade: string | null;
  prioridade: string | null;
  situacao: string | null;
  status_diligencias: string | null;
  data_fato: string | null;
  data_instauracao: string | null;
  prazo: string | null;
  bairro: string | null;
  vitima: string | null;
  investigado: string | null;
  reu_preso: string | null;
  elucidado: string | null;
  houve_arma_fogo: string | null;
  arma_utilizada: string | null;
  faccao: string | null;
  nome_faccao: string | null;
  equipe: string | null;
  escrivao: string | null;
  relatorio_enviado: string | null;
  data_envio_relatorio: string | null;
  medida_protetiva: string | null;
  numero_processo_medida: string | null;
  observacoes: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

export type InqueritoListItem = ReturnType<typeof loadInqueritos>[number];

const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE ?? "local";

export async function listarInqueritos(): Promise<InqueritoListItem[]> {
  if (DATA_SOURCE !== "supabase") {
    return loadInqueritos();
  }

  const { data, error } = await supabase
    .from("inqueritos")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar inquéritos no Supabase:", error);
    return loadInqueritos();
  }

  return (data ?? []).map(mapSupabaseInqueritoToFrontend);
}

export async function buscarInqueritoPorId(caseId: string): Promise<InqueritoListItem | null> {
  if (DATA_SOURCE !== "supabase") {
    return loadInqueritos().find((item) => item.id === caseId) ?? null;
  }

  const { data, error } = await supabase
    .from("inqueritos")
    .select("*")
    .eq("codigo_interno", caseId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar detalhe do inquérito no Supabase:", error);
    return loadInqueritos().find((item) => item.id === caseId) ?? null;
  }

  if (data) {
    return mapSupabaseInqueritoToFrontend(data);
  }

  return loadInqueritos().find((item) => item.id === caseId) ?? null;
}

function mapSupabaseInqueritoToFrontend(row: SupabaseInquerito): InqueritoListItem {
  const reuPreso = normalizeBoolean(row.reu_preso);
  const houveArmaFogo = normalizeBoolean(row.houve_arma_fogo);

  return {
    id: row.codigo_interno || formatInqueritoId(row.id),
    ppe: row.numero_ppe || "—",
    numeroFisico: row.numero_fisico || "",
    numeroBo: row.numero_bo || "",
    tipo: row.tipo || "Não informado",
    tipificacao: row.tipificacao || "Não informado",
    gravidade: row.gravidade || "Não informado",
    prioridade: normalizePrioridade(row.prioridade),
    situacao: row.situacao || "Não informado",
    statusDiligencias: row.status_diligencias || "Pendente",
    dataFato: row.data_fato || "",
    dataInstauracao: row.data_instauracao || "",
    prazo: row.prazo || "",
    bairroDistrito: row.bairro || "Não informado",
    vitima: row.vitima || "",
    autorInvestigado: row.investigado || "",
    reuPreso,
    autorDeterminado: row.elucidado || "",
    vinculadoFaccao: row.faccao || "",
    nomeFaccao: row.nome_faccao || "",
    equipeResponsavel: row.equipe || "",
    escrivao: row.escrivao || "",
    relatorioEnviado: row.relatorio_enviado || "",
    dataEnvioRelatorio: row.data_envio_relatorio || "",
    medidaProtetiva: row.medida_protetiva || "",
    numeroProcessoMedida: row.numero_processo_medida || "",
    observacoes: row.observacoes || "",
    motivacao: houveArmaFogo ? row.arma_utilizada || "" : "",
    diasCorridos: calcularDiasCorridos(row.data_instauracao),
    ultimaAtualizacao: row.updated_at || row.created_at || "",
  } as InqueritoListItem;
}

function normalizePrioridade(value: string | null): string {
  const normalized = (value ?? "").toUpperCase();

  if (normalized.includes("ALTA") || normalized.includes("URGENTE")) return "ALTA";
  if (
    normalized.includes("MÉDIA") ||
    normalized.includes("MEDIA") ||
    normalized.includes("ATENÇÃO") ||
    normalized.includes("ATENCAO")
  ) {
    return "MÉDIA";
  }
  if (normalized.includes("BAIXA")) return "BAIXA";

  return "MÉDIA";
}

function normalizeBoolean(value: string | null): boolean {
  const normalized = (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return normalized === "sim" || normalized === "true" || normalized === "1";
}

function calcularDiasCorridos(dataInstauracao: string | null): number {
  if (!dataInstauracao) return 0;

  const start = new Date(dataInstauracao);
  const today = new Date();

  if (Number.isNaN(start.getTime())) return 0;

  const diffMs = today.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function formatInqueritoId(id: string): string {
  if (id.startsWith("INQ-")) return id;

  const onlyNumbers = id.replace(/\D/g, "").slice(0, 5);

  if (onlyNumbers) {
    return `INQ-${onlyNumbers.padStart(5, "0")}`;
  }

  return "INQ-00000";
}