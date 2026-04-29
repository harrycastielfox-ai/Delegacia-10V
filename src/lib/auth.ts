// Helper de sessão APENAS visual (sem backend).
// Será substituído pela autenticação real em PHP + MySQL.
const KEY = "sipi_auth";

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(KEY) === "1";
}

export function login(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KEY, "1");
}

export function logout(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(KEY);
}
