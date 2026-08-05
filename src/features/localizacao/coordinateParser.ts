export type CoordinateKind = "latitude" | "longitude";

export function parseCoordinateInput(value: string, kind: CoordinateKind): number | null {
  if (!value.trim()) return null;

  const label = kind === "latitude" ? "Latitude" : "Longitude";
  const parsed = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} inválida. Use somente números, por exemplo -16.573000.`);
  }

  const limit = kind === "latitude" ? 90 : 180;
  if (parsed < -limit || parsed > limit) {
    throw new Error(
      `${label} fora do intervalo permitido (${kind === "latitude" ? "-90 a 90" : "-180 a 180"}). Em Itabela, use aproximadamente ${kind === "latitude" ? "-16.57" : "-39.48"}.`,
    );
  }

  return parsed;
}
