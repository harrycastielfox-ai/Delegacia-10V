import { supabase } from "@/lib/supabaseClient";

export type AuditoriaMetadata = Record<string, string | number | boolean | null | string[]>;

export type AuditoriaEvent = {
  id: string;
  executor_user_id: string;
  executor_nome: string | null;
  executor_email: string | null;
  executor_login: string | null;
  acao: string;
  modulo: string;
  entidade: string;
  entidade_id: string | null;
  descricao: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type LogAuditoriaPayload = {
  acao: string;
  modulo: string;
  entidade: string;
  entidade_id?: string | null;
  descricao: string;
  metadata?: AuditoriaMetadata;
};

type ListAuditoriaOptions = {
  limit?: number;
};

function sanitizeMetadata(metadata?: AuditoriaMetadata): AuditoriaMetadata {
  if (!metadata) return {};
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined).slice(0, 12),
  );
}

export async function logAuditoria(payload: LogAuditoriaPayload): Promise<{ eventId: string | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc("log_auditoria", {
      p_acao: payload.acao,
      p_modulo: payload.modulo,
      p_entidade: payload.entidade,
      p_entidade_id: payload.entidade_id ?? null,
      p_descricao: payload.descricao,
      p_metadata: sanitizeMetadata(payload.metadata),
    });
    if (error) {
      return { eventId: null, error: error.message };
    }
    return { eventId: data ? String(data) : null, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao registrar auditoria";
    return { eventId: null, error: message };
  }
}

export async function listAuditoriaByUser(userId: string, options?: ListAuditoriaOptions): Promise<{ data: AuditoriaEvent[]; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc("list_auditoria_by_user", {
      p_user_id: userId,
      p_limit: options?.limit ?? 20,
    });
    if (error) {
      return { data: [], error: error.message };
    }
    return { data: (data ?? []) as AuditoriaEvent[], error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao listar auditoria";
    return { data: [], error: message };
  }
}
