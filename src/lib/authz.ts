export const USER_ROLES = ["membro", "sipi_access", "atlas_access", "delegado", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const AUTHORIZATION_STATUS = ["aguardando", "autorizado", "bloqueado"] as const;
export type AuthorizationStatus = (typeof AUTHORIZATION_STATUS)[number];

export interface UserProfile {
  id: string;
  nome: string;
  email: string;
  login: string;
  avatar_path: string | null;
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

export function isAtlasAccess(profile: Pick<UserProfile, "cargo"> | null): boolean {
  return profile?.cargo === "atlas_access";
}

export function canManageUsers(profile: Pick<UserProfile, "cargo"> | null): boolean {
  return isAdmin(profile) || isDelegado(profile) || isAtlasAccess(profile);
}

export function canViewPrivateCases(profile: Pick<UserProfile, "cargo"> | null): boolean {
  return isAdmin(profile) || isDelegado(profile) || isAtlasAccess(profile);
}

export function canOnlyViewPublicCases(profile: Pick<UserProfile, "cargo"> | null): boolean {
  return !canViewPrivateCases(profile);
}

export function canCreateCases(profile: Pick<UserProfile, "cargo" | "status_autorizacao"> | null): boolean {
  if (!isAuthorized(profile)) return false;
  return profile.cargo !== "membro";
}

export function canEditCases(profile: Pick<UserProfile, "cargo" | "status_autorizacao"> | null): boolean {
  return canCreateCases(profile);
}

export function canDeleteCases(profile: Pick<UserProfile, "cargo" | "status_autorizacao"> | null): boolean {
  return canCreateCases(profile);
}

export function canManageCases(profile: Pick<UserProfile, "cargo" | "status_autorizacao"> | null): boolean {
  return canCreateCases(profile) || canEditCases(profile) || canDeleteCases(profile);
}


export function canViewRepresentacoes(profile: Pick<UserProfile, "cargo" | "status_autorizacao"> | null): boolean {
  if (!isAuthorized(profile)) return false;
  return profile.cargo !== "membro";
}

export function canCreateRepresentacoes(profile: Pick<UserProfile, "cargo" | "status_autorizacao"> | null): boolean {
  return canViewRepresentacoes(profile);
}

export function canEditRepresentacoes(profile: Pick<UserProfile, "cargo" | "status_autorizacao"> | null): boolean {
  return canViewRepresentacoes(profile);
}

export function canDeleteRepresentacoes(profile: Pick<UserProfile, "cargo" | "status_autorizacao"> | null): boolean {
  return canViewRepresentacoes(profile);
}

export const canSeePrivateRecords = canViewPrivateCases;
export const canCreateRecords = canCreateCases;
export const canEditRecords = canEditCases;
export const canDeleteRecords = canDeleteCases;


const ATLAS_BLOCKED_ROLES: UserRole[] = ["admin", "delegado", "atlas_access"];
const ATLAS_ALLOWED_TARGET_ROLES: UserRole[] = ["membro", "sipi_access"];

export function canAtlasEditTargetRole(targetRole: UserRole): boolean {
  return !ATLAS_BLOCKED_ROLES.includes(targetRole);
}

export function canAtlasAssignRole(nextRole: UserRole): boolean {
  return ATLAS_ALLOWED_TARGET_ROLES.includes(nextRole);
}

export function canEditUserAccess(
  requester: Pick<UserProfile, "cargo"> | null,
  target: Pick<UserProfile, "cargo"> | null,
  nextRole?: UserRole,
): boolean {
  if (!requester || !target) return false;
  if (requester.cargo === "admin" || requester.cargo === "delegado") return true;
  if (requester.cargo !== "atlas_access") return false;
  if (!canAtlasEditTargetRole(target.cargo)) return false;
  return nextRole ? canAtlasAssignRole(nextRole) : true;
}
