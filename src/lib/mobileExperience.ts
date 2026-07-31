export const MOBILE_VIEWPORT_QUERY = "(max-width: 767px)";

const MOBILE_PUBLIC_PATHS = ["/login", "/criar-conta", "/aguardando-autorizacao"] as const;
const MOBILE_APP_PATHS = [
  "/inqueritos",
  "/novo-caso",
  "/representacoes",
  "/nova-representacao",
  "/admin/usuarios",
  "/perfil",
] as const;

function isPathOrChild(pathname: string, root: string) {
  return pathname === root || pathname.startsWith(`${root}/`);
}

export function isMobileViewport() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_VIEWPORT_QUERY).matches;
}

export function getPostAuthDestination(mobile = isMobileViewport()) {
  return mobile ? "/inqueritos" : "/modulos";
}

export function isMobilePathAllowed(pathname: string) {
  return (
    MOBILE_PUBLIC_PATHS.some((path) => pathname === path) ||
    MOBILE_APP_PATHS.some((path) => isPathOrChild(pathname, path))
  );
}

export function getMobileRouteRedirect(pathname: string, mobile = isMobileViewport()) {
  if (!mobile || isMobilePathAllowed(pathname)) return null;
  return "/inqueritos" as const;
}
