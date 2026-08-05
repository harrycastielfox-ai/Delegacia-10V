/**
 * Links externos de mapa (Google Maps / Waze).
 *
 * Usa apenas as URLs públicas documentadas do Google Maps ("Maps URLs"), que abrem
 * o app ou o site em uma nova aba. Não consome API paga nem exige chave.
 */

export const DEFAULT_MAP_CITY = "Itabela, BA";

/** Origem segura para rotas quando a localização do aparelho não estiver disponível. */
export const DEFAULT_ROUTE_ORIGIN: MapTarget = {
  endereco: "Delegacia Territorial de Itabela, Rua Castro Alves, 253",
  latitude: -16.574782,
  longitude: -39.561971,
  cidade: "Itabela, BA",
};

export interface MapTarget {
  /** Endereço em texto livre. Ex.: "R. das Palmeiras, 87 — Centro". */
  endereco?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** Complemento acrescentado ao texto quando ele não cita a cidade. */
  cidade?: string | null;
}

export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

interface ResolvedTarget {
  coordinates: MapCoordinates | null;
  query: string | null;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseCoordinates(target: MapTarget): MapCoordinates | null {
  const { latitude, longitude } = target;
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  // 0,0 fica no Atlântico: na prática é dado não preenchido, não um local válido.
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
}

function parseQuery(target: MapTarget): string | null {
  const endereco = target.endereco?.replace(/\s+/g, " ").trim();
  if (!endereco) return null;

  const cidade = target.cidade === undefined ? DEFAULT_MAP_CITY : target.cidade?.trim();
  if (!cidade) return endereco;

  // Evita "Centro, Itabela, BA, Itabela, BA" quando o texto já traz a cidade.
  const cidadeIsolada = cidade.split(",")[0]?.trim() ?? cidade;
  const enderecoNormalizado = normalizeText(endereco);
  if (
    enderecoNormalizado.includes(normalizeText(cidade)) ||
    enderecoNormalizado.includes(normalizeText(cidadeIsolada))
  ) {
    return endereco;
  }

  return `${endereco}, ${cidade}`;
}

function resolveTarget(target: MapTarget): ResolvedTarget {
  return { coordinates: parseCoordinates(target), query: parseQuery(target) };
}

function formatCoordinates({ latitude, longitude }: MapCoordinates) {
  return `${Number(latitude.toFixed(6))},${Number(longitude.toFixed(6))}`;
}

/** Há informação suficiente para abrir algum mapa? */
export function hasMapTarget(target: MapTarget): boolean {
  const { coordinates, query } = resolveTarget(target);
  return coordinates !== null || query !== null;
}

/** Abre o local no mapa (pino). Prefere coordenada; cai para busca por texto. */
export function buildMapViewUrl(target: MapTarget): string | null {
  const { coordinates, query } = resolveTarget(target);
  const params = new URLSearchParams({ api: "1" });

  if (coordinates) {
    params.set("query", formatCoordinates(coordinates));
  } else if (query) {
    params.set("query", query);
  } else {
    return null;
  }

  return `https://www.google.com/maps/search/?${params.toString()}`;
}

/**
 * Abre a navegação até o destino. Sem `origin`, o Google usa a posição atual do
 * aparelho — que é o comportamento desejado para quem está saindo em diligência.
 */
export function buildMapDirectionsUrl(
  target: MapTarget,
  options: { origin?: MapTarget; travelMode?: "driving" | "walking" | "bicycling" } = {},
): string | null {
  const { coordinates, query } = resolveTarget(target);
  const params = new URLSearchParams({ api: "1" });

  if (coordinates) {
    params.set("destination", formatCoordinates(coordinates));
  } else if (query) {
    params.set("destination", query);
  } else {
    return null;
  }

  if (options.origin) {
    const origem = resolveTarget(options.origin);
    if (origem.coordinates) params.set("origin", formatCoordinates(origem.coordinates));
    else if (origem.query) params.set("origin", origem.query);
  }

  params.set("travelmode", options.travelMode ?? "driving");
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Abre o Street View no ponto informado. Exige coordenada: o panorama não pode ser
 * localizado de forma confiável só por texto.
 */
export function buildStreetViewUrl(target: MapTarget): string | null {
  const coordinates = parseCoordinates(target);
  if (!coordinates) return null;

  const params = new URLSearchParams({
    api: "1",
    map_action: "pano",
    viewpoint: formatCoordinates(coordinates),
  });
  return `https://www.google.com/maps/@?${params.toString()}`;
}

/** Identifica links que já apontam para um panorama específico do Google Street View. */
export function isDirectStreetViewUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  try {
    const parsed = new URL(url);
    if (!/(^|\.)google\.[a-z.]+$/i.test(parsed.hostname)) return false;
    return (
      parsed.searchParams.get("map_action") === "pano" ||
      /\/@-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?,\d+(?:\.\d+)?a(?:,|\/|$)/i.test(parsed.pathname) ||
      parsed.href.includes("!1e1")
    );
  } catch {
    return false;
  }
}

/**
 * Abre um panorama direto somente quando há um link específico para ele. Nos demais
 * casos, abre primeiro o endereço textual exato no Maps para evitar que uma coordenada
 * aproximada seja encaixada em uma fachada ou numeração diferente.
 */
export function buildStreetViewEntryUrl(
  target: MapTarget,
  manualUrl?: string | null,
): string | null {
  if (isDirectStreetViewUrl(manualUrl)) return manualUrl!.trim();

  if (target.endereco?.trim()) {
    return buildMapViewUrl({
      endereco: target.endereco,
      cidade: target.cidade,
      latitude: null,
      longitude: null,
    });
  }

  return buildStreetViewUrl(target);
}

/** Navegação pelo Waze, útil quando a equipe já usa o app no deslocamento. */
export function buildWazeUrl(target: MapTarget): string | null {
  const { coordinates, query } = resolveTarget(target);

  if (coordinates) {
    return `https://waze.com/ul?ll=${formatCoordinates(coordinates)}&navigate=yes`;
  }
  if (query) {
    return `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`;
  }
  return null;
}
