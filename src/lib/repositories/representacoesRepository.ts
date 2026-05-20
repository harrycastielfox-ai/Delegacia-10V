import { supabase } from "@/lib/supabaseClient";

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
  observacoes_decisao: string | null;
  data_cumprimento: string | null;
  equipe_cumprimento: string | null;
  resultado_cumprimento: string | null;
  observacoes_cumprimento: string | null;
  prioridade_operacional: string | null;
  pedido_sigiloso: string | null;
  observacoes_internas: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

export type RepresentacaoPayload = Partial<Omit<RepresentacaoRecord, "id" | "created_at" | "updated_at" | "deleted_at">>;

export async function listRepresentacoes() {
  const { data, error } = await supabase.from("representacoes").select("*").is("deleted_at", null).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RepresentacaoRecord[];
}

export async function getRepresentacaoById(id: string) {
  const { data, error } = await supabase.from("representacoes").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw error;
  return data as RepresentacaoRecord | null;
}

export async function createRepresentacao(payload: RepresentacaoPayload) {
  const { data, error } = await supabase.from("representacoes").insert(payload).select("*").single();
  if (error) throw error;
  return data as RepresentacaoRecord;
}

export async function updateRepresentacao(id: string, payload: RepresentacaoPayload) {
  const { data, error } = await supabase.from("representacoes").update(payload).eq("id", id).is("deleted_at", null).select("*").maybeSingle();

  if (import.meta.env.DEV) {
    console.debug("[representacoes:update] request", {
      id,
      payloadKeys: Object.keys(payload),
      error: error
        ? {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            status: error.status,
          }
        : null,
      rowReturned: Boolean(data),
    });
  }

  if (error) throw error;
  if (!data) {
    throw {
      code: "REPRESENTACAO_UPDATE_EMPTY",
      message: "Nenhuma linha retornada no update de representação.",
      details: "Verifique RLS de UPDATE/SELECT e filtros id/deleted_at.",
      status: 406,
    };
  }
  return data as RepresentacaoRecord;
}

export async function softDeleteRepresentacao(id: string) {
  const { error } = await supabase.from("representacoes").update({ deleted_at: new Date().toISOString() }).eq("id", id).is("deleted_at", null);
  if (error) throw error;
}
