export const MOBILE_VIEWPORT_QUERY = "(max-width: 767px)";

const MOBILE_PUBLIC_PATHS = ["/login", "/criar-conta", "/aguardando-autorizacao"] as const;
const MOBILE_UTILITY_PATHS = ["/admin/usuarios", "/perfil"] as const;

function isPathOrChild(pathname: string, root: string) {
  return pathname === root || pathname.startsWith(`${root}/`);
}

function isReadOnlyRecordPath(pathname: string, root: string) {
  if (pathname === root) return true;
  if (!pathname.startsWith(`${root}/`)) return false;

  const recordPath = pathname.slice(root.length + 1);
  return recordPath.length > 0 && !recordPath.includes("/");
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
    isReadOnlyRecordPath(pathname, "/inqueritos") ||
    isReadOnlyRecordPath(pathname, "/representacoes") ||
    MOBILE_UTILITY_PATHS.some((path) => isPathOrChild(pathname, path))
  );
}

export function getMobileRouteRedirect(pathname: string, mobile = isMobileViewport()) {
  if (!mobile || isMobilePathAllowed(pathname)) return null;
  return "/inqueritos" as const;
}
