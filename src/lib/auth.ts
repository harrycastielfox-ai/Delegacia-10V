import { supabase } from "@/lib/supabaseClient";
import type { UserProfile } from "@/lib/authz";

const PROFILE_SELECT = "id,nome,email,login,avatar_url,cargo,status_autorizacao,created_at,updated_at";

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

export async function signUpUser(payload: {
  nome: string;
  email: string;
  login: string;
  password: string;
  avatarUrl?: string | null;
}) {
  const { nome, email, login, password, avatarUrl } = payload;
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { nome: nome.trim(), login: login.trim(), avatar_url: avatarUrl ?? null },
    },
  });
  if (error) throw error;
  await supabase.auth.signOut();
  return data;
}
