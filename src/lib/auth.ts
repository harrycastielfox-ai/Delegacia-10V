import { supabase } from "@/lib/supabaseClient";
import { INSTITUTIONAL_FUNCTIONS, type InstitutionalFunction, type UserProfile } from "@/lib/authz";

export type CurrentUserProfile = UserProfile & { telefone: string | null };

const PROFILE_SELECT =
  "id,nome,email,login,avatar_path,telefone,funcao_institucional,cargo,status_autorizacao,created_at,updated_at";
const LEGACY_PROFILE_SELECT =
  "id,nome,email,login,avatar_path,telefone,cargo,status_autorizacao,created_at,updated_at";
const AVATAR_BUCKET = "profile-avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const DEFAULT_AUTH_TIMEOUT_MS = 10000;

export class AuthFlowError extends Error {
  code: string;
  cause?: unknown;
  constructor(code: string, message: string, cause?: unknown) {
    super(message);
    this.name = "AuthFlowError";
    this.code = code;
    this.cause = cause;
  }
}

function normalizeIdentifier(value: string): string {
  return value.trim();
}

function normalizeEmail(value: string): string {
  return normalizeIdentifier(value).toLowerCase();
}

function normalizeLogin(value: string): string {
  return normalizeIdentifier(value).toLowerCase();
}

function normalizePhone(value?: string): string {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 11);
}

function normalizeInstitutionalFunction(
  value?: InstitutionalFunction | string | null,
): InstitutionalFunction | null {
  return INSTITUTIONAL_FUNCTIONS.includes(value as InstitutionalFunction)
    ? (value as InstitutionalFunction)
    : null;
}

function isAuthDuplicateEmailError(error: unknown): boolean {
  const message = String((error as { message?: string } | undefined)?.message || "").toLowerCase();
  return message.includes("already registered") || message.includes("already exists");
}

function isRlsError(error: unknown): boolean {
  const message = String((error as { message?: string } | undefined)?.message || "").toLowerCase();
  return message.includes("row-level security") || message.includes("permission denied");
}

function isMissingInstitutionalFunctionColumn(error: unknown): boolean {
  const code = String((error as { code?: string } | undefined)?.code ?? "");
  const message = String((error as { message?: string } | undefined)?.message ?? "").toLowerCase();
  return (code === "42703" || code === "PGRST204") && message.includes("funcao_institucional");
}

function withAuthTimeout<T>(
  operation: PromiseLike<T>,
  code: string,
  message: string,
  timeoutMs = DEFAULT_AUTH_TIMEOUT_MS,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new AuthFlowError(code, message));
    }, timeoutMs);
  });

  return Promise.race([Promise.resolve(operation), timeoutPromise]).finally(() =>
    clearTimeout(timeoutId),
  );
}

export async function getSession() {
  const { data, error } = await withAuthTimeout(
    supabase.auth.getSession(),
    "AUTH_SESSION_TIMEOUT",
    "Tempo limite ao carregar sessão.",
  );
  if (error) throw error;
  return data.session;
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getCurrentProfile(): Promise<CurrentUserProfile | null> {
  const session = await getSession();
  if (!session?.user) return null;

  let { data, error } = await withAuthTimeout(
    supabase.from("profiles").select(PROFILE_SELECT).eq("id", session.user.id).maybeSingle(),
    "PROFILE_FETCH_TIMEOUT",
    "Tempo limite ao carregar perfil.",
  );
  if (error && isMissingInstitutionalFunctionColumn(error)) {
    const legacyResult = await withAuthTimeout(
      supabase
        .from("profiles")
        .select(LEGACY_PROFILE_SELECT)
        .eq("id", session.user.id)
        .maybeSingle(),
      "PROFILE_FETCH_TIMEOUT",
      "Tempo limite ao carregar perfil.",
    );
    data = legacyResult.data ? { ...legacyResult.data, funcao_institucional: null } : null;
    error = legacyResult.error;
  }
  if (error) {
    if (isRlsError(error)) {
      throw new AuthFlowError(
        "PROFILE_RLS_DENIED",
        "RLS/policy bloqueou a leitura do perfil.",
        error,
      );
    }
    throw new AuthFlowError("PROFILE_FETCH_FAILED", "Falha ao carregar perfil.", error);
  }

  if (!data) {
    throw new AuthFlowError(
      "PROFILE_NOT_FOUND",
      "Perfil não encontrado para o usuário autenticado.",
    );
  }

  return data as CurrentUserProfile;
}

export async function resolveEmailFromLoginOrEmail(loginOrEmail: string): Promise<string> {
  const input = normalizeIdentifier(loginOrEmail);
  if (input.includes("@")) return normalizeEmail(input);

  const { data, error } = await supabase.rpc("resolve_login_to_email", {
    input_login: normalizeLogin(input),
  });

  if (error)
    throw new AuthFlowError("LOGIN_RESOLVE_FAILED", "Falha ao resolver login para e-mail.", error);
  if (!data) throw new AuthFlowError("LOGIN_NOT_FOUND", "Login não encontrado.");
  return normalizeEmail(String(data));
}

export async function authenticateWithLoginOrEmail(loginOrEmail: string, password: string) {
  const email = await resolveEmailFromLoginOrEmail(loginOrEmail);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new AuthFlowError("AUTH_INVALID_CREDENTIALS", "Credenciais inválidas.", error);
  return { email };
}

export async function signInWithLoginOrEmail(loginOrEmail: string, password: string) {
  await authenticateWithLoginOrEmail(loginOrEmail, password);
  return getCurrentProfile();
}

export async function updateOwnAvatar(userId: string, avatarFile: File): Promise<string> {
  if (!avatarFile.type.startsWith("image/")) throw new Error("AVATAR_INVALID_TYPE");
  if (avatarFile.size > MAX_AVATAR_BYTES) throw new Error("AVATAR_TOO_LARGE");

  const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar.${ext}`;
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, avatarFile, { upsert: true });
  if (error) {
    throw new AuthFlowError("AVATAR_UPLOAD_FAILED", "Falha no upload do avatar.", error);
  }

  const { error: avatarUpdateError } = await supabase.rpc("update_own_avatar", {
    input_avatar_path: path,
  });
  if (avatarUpdateError) {
    throw new AuthFlowError(
      "AVATAR_RPC_UPDATE_FAILED",
      "Falha ao atualizar avatar_path no perfil.",
      avatarUpdateError,
    );
  }

  return path;
}

export async function updateOwnPhone(telefone: string): Promise<string | null> {
  const cleanTelefone = normalizePhone(telefone);
  const { error } = await supabase.rpc("update_own_phone", {
    p_telefone: cleanTelefone || null,
  });
  if (error) {
    throw new AuthFlowError(
      "PHONE_RPC_UPDATE_FAILED",
      "Falha ao atualizar telefone no perfil.",
      error,
    );
  }

  return cleanTelefone || null;
}

export async function signUpUser(payload: {
  nome: string;
  email: string;
  login: string;
  telefone?: string;
  funcaoInstitucional?: InstitutionalFunction | null;
  password: string;
  avatarFile?: File | null;
}) {
  const { nome, email, login, telefone, funcaoInstitucional, password, avatarFile } = payload;
  const cleanEmail = normalizeEmail(email);
  const cleanLogin = normalizeLogin(login);
  const cleanTelefone = normalizePhone(telefone);
  const cleanFunction = normalizeInstitutionalFunction(funcaoInstitucional);

  if (!cleanLogin) throw new Error("LOGIN_REQUIRED");

  const { data: existingLogin, error: loginCheckError } = await supabase.rpc(
    "resolve_login_to_email",
    {
      input_login: cleanLogin,
    },
  );
  if (loginCheckError) {
    console.error("[signUpUser] Falha ao verificar login", loginCheckError);
    throw loginCheckError;
  }
  if (existingLogin) throw new Error("LOGIN_ALREADY_EXISTS");

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        nome: nome.trim(),
        login: cleanLogin,
        telefone: cleanTelefone || null,
        funcao_institucional: cleanFunction,
      },
    },
  });

  if (error) {
    console.error("[signUpUser] Erro do Supabase Auth", error);
    if (isAuthDuplicateEmailError(error)) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }
    throw error;
  }

  let avatarUploadWarning = false;
  let avatarUploadWarningReason: "NO_ACTIVE_SESSION" | "UPLOAD_OR_RPC_ERROR" | null = null;
  if (avatarFile && data.user?.id) {
    try {
      const session = data.session ?? (await getSession());
      if (session?.user?.id === data.user.id) {
        const avatarPath = await updateOwnAvatar(data.user.id, avatarFile);
        console.info("[signUpUser] avatar_path salvo com sucesso", {
          userId: data.user.id,
          avatarPath,
        });
      } else {
        avatarUploadWarning = true;
        avatarUploadWarningReason = "NO_ACTIVE_SESSION";
        console.warn("[signUpUser] Sessão ausente após signUp; avatar não enviado neste momento", {
          userId: data.user.id,
          hasSession: Boolean(session),
          sessionUserId: session?.user?.id ?? null,
        });
      }
    } catch (avatarError) {
      avatarUploadWarning = true;
      avatarUploadWarningReason = "UPLOAD_OR_RPC_ERROR";
      const authErrorCode = (avatarError as { code?: string } | undefined)?.code;
      if (authErrorCode === "AVATAR_RPC_UPDATE_FAILED") {
        console.error("[signUpUser] Erro na RPC update_own_avatar", avatarError);
      } else if (authErrorCode === "AVATAR_UPLOAD_FAILED") {
        console.error("[signUpUser] Erro de upload de avatar", avatarError);
      } else {
        console.error("[signUpUser] Erro de upload de avatar", avatarError);
        console.error("[signUpUser] Erro na RPC update_own_avatar", avatarError);
      }
    }
  }

  await supabase.auth.signOut();
  return { ...data, avatarUploadWarning, avatarUploadWarningReason };
}

export function getProfileAvatarPublicUrl(avatarPath: string | null | undefined): string | null {
  if (!avatarPath) return null;
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath);
  return data.publicUrl;
}
