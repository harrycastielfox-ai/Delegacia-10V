import { supabase } from "@/lib/supabaseClient";
import type { UserProfile } from "@/lib/authz";

const PROFILE_SELECT = "id,nome,email,login,avatar_path,cargo,status_autorizacao,created_at,updated_at";
const AVATAR_BUCKET = "profile-avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

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

function isAuthDuplicateEmailError(error: unknown): boolean {
  const message = String((error as { message?: string } | undefined)?.message || "").toLowerCase();
  return message.includes("already registered") || message.includes("already exists");
}

function isRlsError(error: unknown): boolean {
  const message = String((error as { message?: string } | undefined)?.message || "").toLowerCase();
  return message.includes("row-level security") || message.includes("permission denied");
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const session = await getSession();
  if (!session?.user) return null;

  const { data, error } = await supabase.from("profiles").select(PROFILE_SELECT).eq("id", session.user.id).maybeSingle();
  if (error) {
    if (isRlsError(error)) {
      throw new AuthFlowError("PROFILE_RLS_DENIED", "RLS/policy bloqueou a leitura do perfil.", error);
    }
    throw new AuthFlowError("PROFILE_FETCH_FAILED", "Falha ao carregar perfil.", error);
  }

  if (!data) {
    throw new AuthFlowError("PROFILE_NOT_FOUND", "Perfil não encontrado para o usuário autenticado.");
  }

  return data as UserProfile;
}

export async function resolveEmailFromLoginOrEmail(loginOrEmail: string): Promise<string> {
  const input = normalizeIdentifier(loginOrEmail);
  if (input.includes("@")) return normalizeEmail(input);

  const { data, error } = await supabase.rpc("resolve_login_to_email", {
    input_login: normalizeLogin(input),
  });

  if (error) throw new AuthFlowError("LOGIN_RESOLVE_FAILED", "Falha ao resolver login para e-mail.", error);
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

async function uploadProfileAvatar(userId: string, avatarFile: File): Promise<string> {
  if (!avatarFile.type.startsWith("image/")) throw new Error("AVATAR_INVALID_TYPE");
  if (avatarFile.size > MAX_AVATAR_BYTES) throw new Error("AVATAR_TOO_LARGE");

  const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, avatarFile, { upsert: true });
  if (error) throw error;

  const { error: avatarUpdateError } = await supabase.rpc("update_own_avatar", {
    input_avatar_path: path,
  });
  if (avatarUpdateError) throw avatarUpdateError;

  return path;
}

export async function signUpUser(payload: {
  nome: string;
  email: string;
  login: string;
  password: string;
  avatarFile?: File | null;
}) {
  const { nome, email, login, password, avatarFile } = payload;
  const cleanEmail = normalizeEmail(email);
  const cleanLogin = normalizeLogin(login);

  if (!cleanLogin) throw new Error("LOGIN_REQUIRED");

  const { data: existingLogin, error: loginCheckError } = await supabase.rpc("resolve_login_to_email", {
    input_login: cleanLogin,
  });
  if (loginCheckError) {
    console.error("[signUpUser] Falha ao verificar login", loginCheckError);
    throw loginCheckError;
  }
  if (existingLogin) throw new Error("LOGIN_ALREADY_EXISTS");

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: { nome: nome.trim(), login: cleanLogin },
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
  if (avatarFile && data.user?.id) {
    try {
      const session = data.session ?? (await getSession());
      if (session?.user?.id === data.user.id) {
        await uploadProfileAvatar(data.user.id, avatarFile);
      } else {
        avatarUploadWarning = true;
      }
    } catch (avatarError) {
      avatarUploadWarning = true;
      console.error("[signUpUser] Falha no upload opcional do avatar", avatarError);
    }
  }

  await supabase.auth.signOut();
  return { ...data, avatarUploadWarning };
}

export function getProfileAvatarPublicUrl(avatarPath: string | null | undefined): string | null {
  if (!avatarPath) return null;
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath);
  return data.publicUrl;
}
