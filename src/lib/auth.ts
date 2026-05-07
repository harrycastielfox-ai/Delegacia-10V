import { supabase } from "@/lib/supabaseClient";
import type { UserProfile } from "@/lib/authz";

const PROFILE_SELECT = "id,nome,email,login,avatar_url,avatar_path,cargo,status_autorizacao,created_at,updated_at";
const AVATAR_BUCKET = "profile-avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

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
  const { data, error } = await supabase.from("profiles").select(PROFILE_SELECT).eq("id", session.user.id).single();
  if (error) throw error;
  return data as UserProfile;
}

function isEmail(value: string): boolean {
  return value.includes("@");
}

export async function resolveEmailFromLoginOrEmail(loginOrEmail: string): Promise<string> {
  if (isEmail(loginOrEmail)) return loginOrEmail.toLowerCase().trim();

  const { data, error } = await supabase.rpc("resolve_login_to_email", {
    input_login: loginOrEmail.trim(),
  });

  if (error) throw error;
  if (!data) throw new Error("LOGIN_NOT_FOUND");
  return String(data);
}

export async function signInWithLoginOrEmail(loginOrEmail: string, password: string) {
  const email = await resolveEmailFromLoginOrEmail(loginOrEmail);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
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
  const cleanEmail = email.trim().toLowerCase();
  const cleanLogin = login.trim();

  const { data: existingLogin, error: loginCheckError } = await supabase.rpc("resolve_login_to_email", {
    input_login: cleanLogin,
  });
  if (loginCheckError) console.error("[signUpUser] Falha ao verificar login", loginCheckError);
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
        console.warn("[signUpUser] Cadastro criado sem sessão ativa (confirmação de e-mail habilitada). Upload será feito depois.");
      }
    } catch (avatarError) {
      avatarUploadWarning = true;
      console.error("[signUpUser] Falha no upload opcional do avatar", avatarError);
    }
  }

  await supabase.auth.signOut();
  return { ...data, avatarUploadWarning };
}
