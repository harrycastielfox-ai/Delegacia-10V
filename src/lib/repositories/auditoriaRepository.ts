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

export type RpcErrorDetails = {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
};

function getRpcError(error: unknown, fallback: string): RpcErrorDetails {
  if (!error || typeof error !== "object") return { message: fallback };

  const maybe = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
  return {
    message: typeof maybe.message === "string" ? maybe.message : fallback,
    details: typeof maybe.details === "string" ? maybe.details : undefined,
    hint: typeof maybe.hint === "string" ? maybe.hint : undefined,
    code: typeof maybe.code === "string" ? maybe.code : undefined,
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

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

export async function listAuditoriaByUser(userId: string, options?: ListAuditoriaOptions): Promise<{ data: AuditoriaEvent[]; error: RpcErrorDetails | null }> {
  try {
    if (!isUuid(userId)) {
      return { data: [], error: { message: "INVALID_USER_ID_FORMAT", code: "CLIENT_VALIDATION" } };
    }

    const { data, error } = await supabase.rpc("list_auditoria_by_user", {
      p_user_id: userId.trim(),
      p_limit: options?.limit ?? 20,
    });
    if (error) {
      return { data: [], error: getRpcError(error, "Erro inesperado ao listar auditoria") };
    }
    return { data: (data ?? []) as AuditoriaEvent[], error: null };
  } catch (error) {
    return { data: [], error: getRpcError(error, "Erro inesperado ao listar auditoria") };
  }
}

export async function listAuditoriaForAdminUser(userId: string, options?: ListAuditoriaOptions): Promise<{ data: AuditoriaEvent[]; error: RpcErrorDetails | null }> {
  try {
    if (!isUuid(userId)) {
      return { data: [], error: { message: "INVALID_USER_ID_FORMAT", code: "CLIENT_VALIDATION" } };
    }

    const { data, error } = await supabase.rpc("list_auditoria_for_admin_user", {
      p_user_id: userId.trim(),
      p_limit: options?.limit ?? 20,
    });
    if (error) {
      return { data: [], error: getRpcError(error, "Erro inesperado ao listar auditoria") };
    }
    return { data: (data ?? []) as AuditoriaEvent[], error: null };
  } catch (error) {
    return { data: [], error: getRpcError(error, "Erro inesperado ao listar auditoria") };
  }
}
