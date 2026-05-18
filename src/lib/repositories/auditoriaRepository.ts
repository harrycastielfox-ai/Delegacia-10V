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

type ListAuditoriaOptions = { limit?: number };

export type RpcErrorDetails = { message: string; details?: string; hint?: string; code?: string };

type RpcDebugErrorShape = {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
  name?: unknown;
  status?: unknown;
  statusCode?: unknown;
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
  return Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined).slice(0, 20));
}

function clamp(value: number | undefined, min: number, max: number, fallback: number): number {
  const target = Number.isFinite(value) ? Number(value) : fallback;
  return Math.max(min, Math.min(max, Math.trunc(target)));
}

async function getAuthUserIdForDebug(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

async function debugRpcError(rpcName: string, params: Record<string, unknown>, error: unknown): Promise<void> {
  if (!import.meta.env.DEV) return;
  const maybeError = (error && typeof error === "object" ? error : {}) as RpcDebugErrorShape;
  const authUserId = await getAuthUserIdForDebug();
  console.error("[auditoria][rpc][error]", {
    rpcName,
    params,
    authUserId,
    error: {
      message: typeof maybeError.message === "string" ? maybeError.message : null,
      code: typeof maybeError.code === "string" ? maybeError.code : null,
      details: typeof maybeError.details === "string" ? maybeError.details : null,
      hint: typeof maybeError.hint === "string" ? maybeError.hint : null,
      name: typeof maybeError.name === "string" ? maybeError.name : null,
      status: typeof maybeError.status === "number" || typeof maybeError.status === "string" ? maybeError.status : null,
      statusCode:
        typeof maybeError.statusCode === "number" || typeof maybeError.statusCode === "string" ? maybeError.statusCode : null,
      raw: maybeError,
    },
  });
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
    if (error) return { eventId: null, error: error.message };
    return { eventId: data ? String(data) : null, error: null };
  } catch (error) {
    return { eventId: null, error: error instanceof Error ? error.message : "Erro inesperado ao registrar auditoria" };
  }
}

export async function listAuditoria(options?: ListAuditoriaOptions): Promise<{ data: AuditoriaEvent[]; error: RpcErrorDetails | null }> {
  const rpcName = "list_auditoria";
  const params = { p_limit: clamp(options?.limit, 1, 200, 100) };
  try {
    const { data, error } = await supabase.rpc(rpcName, params);
    if (error) {
      await debugRpcError(rpcName, params, error);
      return { data: [], error: getRpcError(error, "Erro inesperado ao listar auditoria") };
    }
    return { data: (data ?? []) as AuditoriaEvent[], error: null };
  } catch (error) {
    await debugRpcError(rpcName, params, error);
    return { data: [], error: getRpcError(error, "Erro inesperado ao listar auditoria") };
  }
}

export async function listAuditoriaForAdminUser(userId: string, options?: ListAuditoriaOptions): Promise<{ data: AuditoriaEvent[]; error: RpcErrorDetails | null }> {
  const rpcName = "list_auditoria_for_admin_user";
  const params = {
    p_user_id: userId.trim(),
    p_limit: clamp(options?.limit, 1, 100, 50),
  };
  try {
    if (!isUuid(userId)) return { data: [], error: { message: "INVALID_USER_ID_FORMAT", code: "CLIENT_VALIDATION" } };
    const { data, error } = await supabase.rpc(rpcName, params);
    if (error) {
      await debugRpcError(rpcName, params, error);
      return { data: [], error: getRpcError(error, "Erro inesperado ao listar auditoria individual") };
    }
    return { data: (data ?? []) as AuditoriaEvent[], error: null };
  } catch (error) {
    await debugRpcError(rpcName, params, error);
    return { data: [], error: getRpcError(error, "Erro inesperado ao listar auditoria individual") };
  }
}
