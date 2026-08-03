export const VEHICLE_TYPES = [
  "automovel",
  "motocicleta",
  "caminhao",
  "onibus",
  "bicicleta",
  "outro",
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const VEHICLE_SITUATIONS = [
  "regular",
  "apreendido",
  "liberado",
  "adulterado",
  "em_investigacao",
  "recuperado",
  "periciado",
  "pendente_identificacao",
] as const;

export type VehicleSituation = (typeof VEHICLE_SITUATIONS)[number];
export type VehicleSituationFilter = VehicleSituation | "nao_informada";

export const IDENTIFICATION_STATUSES = [
  "informado",
  "ausente",
  "suprimido",
  "raspado",
  "ilegivel",
  "incompativel",
] as const;

export type IdentificationStatus = (typeof IDENTIFICATION_STATUSES)[number];

export type VehicleRecord = {
  id: string;
  internal_id: string;
  vehicle_type: VehicleType;
  brand: string | null;
  model: string | null;
  brand_model: string | null;
  color: string | null;
  plate: string | null;
  plate_status: IdentificationStatus | null;
  renavam: string | null;
  renavam_status: IdentificationStatus | null;
  engine_number: string | null;
  engine_status: IdentificationStatus | null;
  chassis: string | null;
  chassis_status: IdentificationStatus | null;
  is_motorized: boolean | null;
  manufacture_year: number | null;
  model_year: number | null;
  heavy_category: string | null;
  bodywork_type: string | null;
  situation: VehicleSituation | null;
  occurrence_type: string | null;
  status: string | null;
  pending_identification: boolean;
  procedure_type: string | null;
  procedure_number: string | null;
  police_report_number: string | null;
  court_process_number: string | null;
  involved_people: string | null;
  inquerito_id: string | null;
  seizure_date: string | null;
  seizure_location: string | null;
  custody_location: string | null;
  storage_location: string | null;
  custody_responsible: string | null;
  conservation_state: string | null;
  has_key: boolean | null;
  has_document: boolean | null;
  custody_observations: string | null;
  observations: string | null;
  release_status: string | null;
  release_date: string | null;
  released_to: string | null;
  release_document: string | null;
  release_authority: string | null;
  delivery_term: string | null;
  release_observations: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type VehicleListRecord = Pick<
  VehicleRecord,
  | "id"
  | "internal_id"
  | "vehicle_type"
  | "brand_model"
  | "color"
  | "plate"
  | "situation"
  | "occurrence_type"
  | "procedure_type"
  | "procedure_number"
  | "police_report_number"
  | "custody_location"
  | "storage_location"
  | "pending_identification"
  | "updated_at"
> & { total_count: number };

export type VehicleIdentifierKind = "plate" | "renavam" | "engine_number" | "chassis";

export type VehicleIdentifierConflict = Pick<
  VehicleRecord,
  "id" | "internal_id" | "vehicle_type" | "brand_model" | "situation"
> & {
  identifier_kind: VehicleIdentifierKind;
  identifier_value: string;
};

export type VehiclePayload = Partial<
  Omit<
    VehicleRecord,
    "id" | "internal_id" | "brand_model" | "created_at" | "updated_at" | "created_by" | "updated_by"
  >
> & { vehicle_type: VehicleType };

export type VehiclePhotoRecord = {
  id: string;
  vehicle_id: string;
  storage_path: string;
  thumbnail_path: string;
  caption: string | null;
  sort_order: number;
  original_size_bytes: number | null;
  thumbnail_size_bytes: number | null;
  mime_type: string;
  created_at: string;
  original_url?: string;
  thumbnail_url?: string;
};

export type VehicleMovementRecord = {
  id: string;
  vehicle_id: string;
  movement_type:
    | "entrada"
    | "apreensao"
    | "transferencia"
    | "pericia"
    | "liberacao"
    | "devolucao"
    | "atualizacao";
  occurred_at: string;
  from_location: string | null;
  to_location: string | null;
  notes: string | null;
  details: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
};

export type VehicleTimelineEvent = {
  id: string;
  event_kind: "movement" | "audit";
  event_type: VehicleMovementRecord["movement_type"] | "create" | "update" | "delete";
  occurred_at: string;
  from_location: string | null;
  to_location: string | null;
  notes: string | null;
  details: Record<string, unknown>;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  changed_fields: string[];
};

export type VehicleOverviewStats = {
  total: number;
  seized: number;
  recovered: number;
  adulterated: number;
  pendingIdentification: number;
  unassignedSituation: number;
  releasedTotal: number;
  releasedThisMonth: number;
  withPlate: number;
  withProcedure: number;
  withCustodyLocation: number;
  byType: Partial<Record<VehicleType, number>>;
  bySituation: Partial<Record<VehicleSituationFilter, number>>;
  monthly: Array<{ month: string; total: number }>;
};

export type VehicleListFilters = {
  search?: string;
  vehicleType?: VehicleType | null;
  situation?: VehicleSituationFilter | null;
  occurrenceType?: string | null;
  status?: string | null;
  custodyLocation?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  pendingIdentification?: boolean | null;
  cursor?: { updatedAt: string; id: string } | null;
  limit?: number;
};
