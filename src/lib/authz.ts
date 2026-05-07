export const USER_ROLES = ["membro", "sipi_access", "atlas_access", "delegado", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const AUTHORIZATION_STATUS = ["aguardando", "autorizado", "bloqueado"] as const;
export type AuthorizationStatus = (typeof AUTHORIZATION_STATUS)[number];

export interface UserProfile {
  id: string;
  nome: string;
  email: string;
  login: string;
  avatar_url: string | null;
  cargo: UserRole;
  status_autorizacao: AuthorizationStatus;
  created_at: string;
  updated_at: string;
}

export function isAuthorized(profile: Pick<UserProfile, "status_autorizacao"> | null): boolean {
  return profile?.status_autorizacao === "autorizado";
}

export function isAdmin(profile: Pick<UserProfile, "cargo"> | null): boolean {
  return profile?.cargo === "admin";
}

export function isDelegado(profile: Pick<UserProfile, "cargo"> | null): boolean {
  return profile?.cargo === "delegado";
}

export function canManageUsers(profile: Pick<UserProfile, "cargo"> | null): boolean {
  return isAdmin(profile);
}

export function canSeePrivateRecords(profile: Pick<UserProfile, "cargo"> | null): boolean {
  return isAdmin(profile) || isDelegado(profile);
}

export function canCreateRecords(profile: Pick<UserProfile, "status_autorizacao"> | null): boolean {
  return isAuthorized(profile as Pick<UserProfile, "status_autorizacao">);
}

export const canEditRecords = canCreateRecords;
export const canDeleteRecords = canCreateRecords;
