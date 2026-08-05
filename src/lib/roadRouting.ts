export interface RoadPoint {
  latitude: number;
  longitude: number;
}

export interface RoadRoute {
  points: RoadPoint[];
  distanceMeters: number;
  durationSeconds: number;
}

interface OsrmResponse {
  code?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: {
      type?: string;
      coordinates?: unknown;
    };
  }>;
}

const routeCache = new Map<string, RoadRoute>();

function isValidPoint(point: RoadPoint) {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180 &&
    !(point.latitude === 0 && point.longitude === 0)
  );
}

function routeKey(origin: RoadPoint, destination: RoadPoint) {
  return [origin, destination]
    .map((point) => `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`)
    .join(";");
}

export function parseRoadRoute(payload: OsrmResponse): RoadRoute | null {
  if (payload.code !== "Ok") return null;
  const route = payload.routes?.[0];
  const coordinates = route?.geometry?.coordinates;
  if (!Array.isArray(coordinates)) return null;

  const points = coordinates.flatMap((coordinate) => {
    if (!Array.isArray(coordinate) || coordinate.length < 2) return [];
    const [longitude, latitude] = coordinate;
    if (typeof latitude !== "number" || typeof longitude !== "number") return [];
    const point = { latitude, longitude };
    return isValidPoint(point) ? [point] : [];
  });

  if (points.length < 2) return null;
  return {
    points,
    distanceMeters: Math.max(0, Number(route?.distance) || 0),
    durationSeconds: Math.max(0, Number(route?.duration) || 0),
  };
}

/**
 * Calcula geometria viária real. A chamada só ocorre para a diligência
 * selecionada, nunca em lote, e o resultado fica em cache durante a sessão.
 */
export async function fetchDrivingRoute(
  origin: RoadPoint,
  destination: RoadPoint,
  signal?: AbortSignal,
): Promise<RoadRoute | null> {
  if (!isValidPoint(origin) || !isValidPoint(destination)) return null;
  const key = routeKey(origin, destination);
  const cached = routeCache.get(key);
  if (cached) return cached;

  const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const params = new URLSearchParams({
    alternatives: "false",
    steps: "false",
    geometries: "geojson",
    overview: "full",
  });
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${coordinates}?${params.toString()}`,
    { signal },
  );
  if (!response.ok) throw new Error(`Serviço de rota indisponível (${response.status}).`);

  const route = parseRoadRoute((await response.json()) as OsrmResponse);
  if (route) routeCache.set(key, route);
  return route;
}
