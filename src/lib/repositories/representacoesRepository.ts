import { supabase } from "@/lib/supabaseClient";
import { runSupabaseQuery } from "@/lib/repositories/supabaseQuery";

export type RepresentacaoRecord = {
  id: string;
  codigo_interno: string | null;
  inquerito_id: string | null;
  numero_ppe: string | null;
  processo_judicial: string | null;
  tipo: string | null;
  data_representacao: string | null;
  responsavel: string | null;
  vitima: string | null;
  investigado: string | null;
  autor_preso: string | null;
  resumo_fatos: string | null;
  fundamentacao: string | null;
  objetivo: string | null;
  diligencias_relacionadas: string | null;
  status: string | null;
  data_envio_judiciario: string | null;
  data_decisao_judicial: string | null;
  vara_juizo: string | null;
  prazo_concedido_dias: number | null;
  data_vencimento: string | null;
  observacoes_decisao: string | null;
  data_cumprimento: string | null;
  equipe_cumprimento: string | null;
  resultado_cumprimento: string | null;
  observacoes_cumprimento: string | null;
  prioridade_operacional: string | null;
  equipe_responsavel: string | null;
  acompanhamento_especial: boolean | null;
  pedido_sigiloso: string | null;
  observacoes_internas: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

export type RepresentacaoPayload = Partial<Omit<RepresentacaoRecord, "id" | "created_at" | "updated_at" | "deleted_at">>;

const LIST_CACHE_TTL_MS = 10000;

let representacoesCache: { data: RepresentacaoRecord[]; fetchedAt: number } | null = null;
let representacoesPending: Promise<RepresentacaoRecord[]> | null = null;

function invalidateRepresentacoesCache() {
  representacoesCache = null;
}

export async function listRepresentacoes(options: { forceRefresh?: boolean } = {}) {
  const now = Date.now();
  if (!options.forceRefresh && representacoesCache && now - representacoesCache.fetchedAt < LIST_CACHE_TTL_MS) {
    return representacoesCache.data;
  }

  if (!options.forceRefresh && representacoesPending) {
    return representacoesPending;
  }

  representacoesPending = runSupabaseQuery<RepresentacaoRecord[]>(
    "representações",
    (signal) =>
      supabase
        .from("representacoes")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .abortSignal(signal),
  )
    .then((data) => {
      const rows = (data ?? []) as RepresentacaoRecord[];
      representacoesCache = { data: rows, fetchedAt: Date.now() };
      return rows;
    })
    .finally(() => {
      representacoesPending = null;
    });

  return representacoesPending;
}

export async function getRepresentacaoById(id: string) {
  const data = await runSupabaseQuery<RepresentacaoRecord | null>(
    "representação",
    (signal) => supabase.from("representacoes").select("*").eq("id", id).is("deleted_at", null).maybeSingle().abortSignal(signal),
  );
  return data as RepresentacaoRecord | null;
}

export async function createRepresentacao(payload: RepresentacaoPayload) {
  const data = await runSupabaseQuery<RepresentacaoRecord>(
    "criação de representação",
    (signal) => supabase.from("representacoes").insert(payload).select("*").single().abortSignal(signal),
  );
  invalidateRepresentacoesCache();
  return data as RepresentacaoRecord;
}

export async function updateRepresentacao(id: string, payload: RepresentacaoPayload) {
  const data = await runSupabaseQuery<RepresentacaoRecord | null>(
    "atualização de representação",
    (signal) => supabase.from("representacoes").update(payload).eq("id", id).is("deleted_at", null).select("*").maybeSingle().abortSignal(signal),
  );

  if (import.meta.env.DEV) {
    console.debug("[representacoes:update] request", {
      id,
      payloadKeys: Object.keys(payload),
      rowReturned: Boolean(data),
    });
  }

  if (!data) {
    throw {
      code: "REPRESENTACAO_UPDATE_EMPTY",
      message: "Nenhuma linha retornada no update de representação.",
      details: "Verifique RLS de UPDATE/SELECT e filtros id/deleted_at.",
      status: 406,
    };
  }
  invalidateRepresentacoesCache();
  return data as RepresentacaoRecord;
}

export async function softDeleteRepresentacao(id: string) {
  await runSupabaseQuery<null>(
    "exclusão de representação",
    (signal) => supabase.from("representacoes").update({ deleted_at: new Date().toISOString() }).eq("id", id).is("deleted_at", null).abortSignal(signal),
  );
  invalidateRepresentacoesCache();
}
