import type { RepresentacaoRecord } from "@/lib/repositories/representacoesRepository";
import type { UserProfile } from "@/lib/authz";

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isTruthySigiloValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const normalized = normalizeText(value);
  if (!normalized) return false;
  return ["sim", "s", "true", "1", "sigilosa", "sigiloso", "yes"].some((token) =>
    normalized.includes(token),
  );
}

function resolveProfileRole(profile: unknown): string {
  if (!profile || typeof profile !== "object") return "";
  const source = profile as Partial<UserProfile> & {
    role?: string | null;
    perfil?: string | null;
    profile_role?: string | null;
    user_role?: string | null;
  };

  return normalizeText(
    source.cargo ?? source.role ?? source.perfil ?? source.profile_role ?? source.user_role ?? "",
  );
}

export function isRepresentacaoSigilosa(
  representacao: Partial<RepresentacaoRecord> | null | undefined,
): boolean {
  if (!representacao) return false;
  return isTruthySigiloValue(representacao.pedido_sigiloso);
}

export function canAccessSigilosa(profile: unknown): boolean {
  const role = resolveProfileRole(profile);
  if (!role) return false;

  const allowedRoleAliases = [
    "admin",
    "administrador",
    "delegado",
    "atlas",
    "atlas access",
    "atlas_access",
  ];
  return allowedRoleAliases.some((allowed) => role === allowed || role.includes(allowed));
}
