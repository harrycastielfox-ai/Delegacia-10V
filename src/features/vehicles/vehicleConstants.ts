import type { IdentificationStatus, VehicleSituation, VehicleType } from "./vehicleTypes";

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  automovel: "Automóvel",
  motocicleta: "Motocicleta",
  caminhao: "Caminhão",
  onibus: "Ônibus",
  bicicleta: "Bicicleta",
  outro: "Outro",
};

export const VEHICLE_SITUATION_LABELS: Record<VehicleSituation, string> = {
  regular: "Regular",
  apreendido: "Apreendido",
  liberado: "Liberado",
  adulterado: "Adulterado",
  em_investigacao: "Em investigação",
  recuperado: "Recuperado",
  periciado: "Periciado",
  pendente_identificacao: "Pendente de identificação",
};

export const IDENTIFICATION_STATUS_LABELS: Record<IdentificationStatus, string> = {
  informado: "Informado",
  ausente: "Ausente",
  suprimido: "Suprimido",
  raspado: "Raspado",
  ilegivel: "Ilegível",
  incompativel: "Incompatível",
};

export const OCCURRENCE_TYPES = [
  "Sem ocorrência",
  "Furto/Roubo",
  "Receptação",
  "Tráfico de drogas",
  "Adulteração",
  "Perda",
  "Violência doméstica",
  "Acidente de trânsito",
  "Outros",
] as const;

export const CONSERVATION_STATES = ["Bom", "Regular", "Ruim", "Sucata", "Não avaliado"] as const;

export const VEHICLE_PAGE_SIZE = 20;

export function formatVehicleDate(value?: string | null, includeTime = false) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(
    "pt-BR",
    includeTime ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "short" },
  ).format(date);
}

export function displayVehicleValue(value?: string | number | boolean | null) {
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (value === null || value === undefined || String(value).trim() === "") return "—";
  return String(value);
}
