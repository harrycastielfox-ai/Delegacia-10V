import { createContext, useContext } from "react";
import type { UserProfile } from "@/lib/authz";

export const AppProfileContext = createContext<UserProfile | null>(null);

export function useAppProfile() {
  const profile = useContext(AppProfileContext);
  if (!profile) throw new Error("Perfil indisponível fora do AppLayout.");
  return profile;
}
