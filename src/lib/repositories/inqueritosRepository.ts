import { supabase } from "@/lib/supabaseClient";

export type InqueritoRecord = {
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

export type InqueritoPayload = Partial<Omit<InqueritoRecord, "id" | "created_at" | "updated_at" | "deleted_at">>;

export async function listInqueritos() {
  const { data, error } = await supabase.from("inqueritos").select("*").is("deleted_at", null).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as InqueritoRecord[];
}

export async function getInqueritoById(id: string) {
  const { data, error } = await supabase.from("inqueritos").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw error;
  return data as InqueritoRecord | null;
}

export async function createInquerito(payload: InqueritoPayload) {
  const { data, error } = await supabase.from("inqueritos").insert(payload).select("*").single();
  if (error) throw error;
  return data as InqueritoRecord;
}

export async function updateInquerito(id: string, payload: InqueritoPayload) {
  const { data, error } = await supabase.from("inqueritos").update(payload).eq("id", id).is("deleted_at", null).select("*").single();
  if (error) throw error;
  return data as InqueritoRecord;
}

export async function softDeleteInquerito(id: string) {
  const { error } = await supabase.from("inqueritos").update({ deleted_at: new Date().toISOString() }).eq("id", id).is("deleted_at", null);
  if (error) throw error;
}
