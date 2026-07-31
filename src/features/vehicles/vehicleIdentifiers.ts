import type { IdentificationStatus, VehicleIdentifierKind } from "./vehicleTypes";

export const VEHICLE_IDENTIFIER_LABELS: Record<VehicleIdentifierKind, string> = {
  plate: "Placa",
  renavam: "Renavam",
  engine_number: "Número do motor",
  chassis: "Chassi",
};

export type VehicleIdentifierInput = {
  plate: string;
  plateStatus: IdentificationStatus;
  renavam: string;
  renavamStatus: IdentificationStatus;
  engineNumber: string;
  engineStatus: IdentificationStatus;
  chassis: string;
  chassisStatus: IdentificationStatus;
};

export type NormalizedVehicleIdentifiers = Pick<
  VehicleIdentifierInput,
  "plate" | "renavam" | "engineNumber" | "chassis"
>;

function normalizeAlphanumeric(value: string, maxLength: number) {
  return value
    .normalize("NFKD")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, maxLength);
}

export function normalizeVehiclePlate(value: string) {
  return normalizeAlphanumeric(value, 7);
}

export function normalizeVehicleRenavam(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function normalizeVehicleEngineNumber(value: string) {
  return normalizeAlphanumeric(value, 30);
}

export function normalizeVehicleChassis(value: string) {
  return normalizeAlphanumeric(value, 30);
}

export function normalizeVehicleIdentifiers(
  input: VehicleIdentifierInput,
): NormalizedVehicleIdentifiers {
  return {
    plate: normalizeVehiclePlate(input.plate),
    renavam: normalizeVehicleRenavam(input.renavam),
    engineNumber: normalizeVehicleEngineNumber(input.engineNumber),
    chassis: normalizeVehicleChassis(input.chassis),
  };
}

export function statusForIdentifier(
  value: string,
  status: IdentificationStatus,
): IdentificationStatus {
  return !value && status === "informado" ? "ausente" : status;
}

export function validateVehicleIdentifiers(input: VehicleIdentifierInput) {
  const normalized = normalizeVehicleIdentifiers(input);
  const errors: string[] = [];

  if (input.plateStatus === "informado" && normalized.plate && normalized.plate.length !== 7) {
    errors.push("A placa informada deve ter 7 caracteres.");
  }

  if (
    input.renavamStatus === "informado" &&
    normalized.renavam &&
    (normalized.renavam.length < 9 || normalized.renavam.length > 11)
  ) {
    errors.push("O Renavam informado deve ter entre 9 e 11 dígitos.");
  }

  return errors;
}
