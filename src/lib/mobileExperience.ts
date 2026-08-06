export const MOBILE_VIEWPORT_QUERY = "(max-width: 767px)";

const MOBILE_PUBLIC_PATHS = ["/login", "/criar-conta", "/aguardando-autorizacao"] as const;
const MOBILE_UTILITY_PATHS = ["/admin/usuarios", "/perfil"] as const;
const MOBILE_VEHICLE_LIST_PATHS = new Set([
  "todos",
  "automoveis",
  "motocicletas",
  "caminhoes",
  "onibus",
  "bicicletas",
  "outros",
  "apreendidos",
  "recuperados",
  "adulterados",
  "liberados",
  "relatorios",
]);

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
  // O módulo de localização possui navegação própria e fluxos de campo (GPS/fotos).
  if (isPathOrChild(pathname, "/localizacao")) return true;

  if (pathname.startsWith("/veiculos/")) {
    const vehiclePath = pathname.slice("/veiculos/".length);
    if (!vehiclePath || vehiclePath.includes("/") || vehiclePath === "novo") return false;
    return MOBILE_VEHICLE_LIST_PATHS.has(vehiclePath) || vehiclePath.length > 0;
  }

  // Mesma regra de veículos: consulta (lista/detalhe) liberada, cadastro/edição
  // não, e a Visão Geral (gráficos, pensada para desktop) também fica de fora.
  if (pathname.startsWith("/objetos/")) {
    const objectPath = pathname.slice("/objetos/".length);
    if (!objectPath || objectPath.includes("/") || objectPath === "novo") return false;
    return true;
  }

  // A agenda é consultada no balcão e no corredor: ver o dia, o cronograma e a
  // ficha de quem chegou precisa funcionar no celular. Marcar e editar continua
  // sendo tarefa de mesa — formulário longo, com busca de procedimento.
  if (isPathOrChild(pathname, "/agenda")) {
    if (pathname === "/agenda" || pathname === "/agenda/cronograma") return true;
    const agendaPath = pathname.slice("/agenda/".length);
    if (!agendaPath || agendaPath === "novo" || agendaPath.startsWith("editar")) return false;
    return !agendaPath.includes("/");
  }

  return (
    MOBILE_PUBLIC_PATHS.some((path) => pathname === path) ||
    isReadOnlyRecordPath(pathname, "/inqueritos") ||
    isReadOnlyRecordPath(pathname, "/representacoes") ||
    MOBILE_UTILITY_PATHS.some((path) => isPathOrChild(pathname, path))
  );
}

export function getMobileRouteRedirect(pathname: string, mobile = isMobileViewport()) {
  if (!mobile) return null;
  if (pathname === "/veiculos") return "/veiculos/todos" as const;
  if (pathname.startsWith("/veiculos") && !isMobilePathAllowed(pathname)) {
    return "/veiculos/todos" as const;
  }
  if (pathname === "/objetos") return "/objetos/todos" as const;
  if (pathname.startsWith("/objetos") && !isMobilePathAllowed(pathname)) {
    return "/objetos/todos" as const;
  }
  if (pathname.startsWith("/agenda") && !isMobilePathAllowed(pathname)) {
    return "/agenda" as const;
  }
  if (isMobilePathAllowed(pathname)) return null;
  return "/inqueritos" as const;
}
