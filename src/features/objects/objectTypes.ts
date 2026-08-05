export const OBJECT_TYPES = [
  "arma_fogo",
  "municao",
  "entorpecente",
  "dinheiro_valores",
  "eletronico",
  "documento",
  "joia_bem_valor",
  "ferramenta",
  "outro",
] as const;

export type ObjectType = (typeof OBJECT_TYPES)[number];

/**
 * Perícia não é uma situação: um objeto não deixa de estar apreendido só
 * porque foi enviado para exame. Isso é registrado como evento no histórico
 * (movement_type "pericia" + data da perícia), não como estado que compete
 * com "Apreendido".
 */
export const OBJECT_SITUATIONS = [
  "apreendido",
  "liberado",
  "incinerado",
  "disposicao_justica",
  "pendente_identificacao",
] as const;

export type ObjectSituation = (typeof OBJECT_SITUATIONS)[number];
export type ObjectSituationFilter = ObjectSituation | "nao_informada";

export const MEASUREMENT_UNITS = [
  "unidade",
  "grama",
  "quilograma",
  "litro",
  "real",
  "par",
] as const;

export type MeasurementUnit = (typeof MEASUREMENT_UNITS)[number];

export type ObjectRecord = {
  id: string;
  internal_id: string;
  object_type: ObjectType;
  description: string;
  brand_model: string | null;
  serial_number: string | null;
  caliber: string | null;
  color: string | null;
  quantity: number;
  measurement_unit: MeasurementUnit | null;
  weight_or_value: number | null;
  situation: ObjectSituation | null;
  occurrence_type: string | null;
  status: string | null;
  pending_identification: boolean;
  procedure_type: string | null;
  procedure_number: string | null;
  police_report_number: string | null;
  court_process_number: string | null;
  involved_people: string | null;
  document_holder_name: string | null;
  document_issuing_authority: string | null;
  document_number: string | null;
  inquerito_id: string | null;
  seizure_date: string | null;
  seizure_location: string | null;
  custody_location: string | null;
  storage_location: string | null;
  custody_responsible: string | null;
  custody_observations: string | null;
  observations: string | null;
  expertise_date: string | null;
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

export type ObjectListRecord = Pick<
  ObjectRecord,
  | "id"
  | "internal_id"
  | "object_type"
  | "description"
  | "brand_model"
  | "quantity"
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

export type ObjectPayload = Partial<
  Omit<
    ObjectRecord,
    "id" | "internal_id" | "created_at" | "updated_at" | "created_by" | "updated_by"
  >
> & { object_type: ObjectType; description: string };

export type ObjectPhotoRecord = {
  id: string;
  object_id: string;
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

export type ObjectMovementRecord = {
  id: string;
  object_id: string;
  movement_type:
    | "entrada"
    | "apreensao"
    | "transferencia"
    | "pericia"
    | "liberacao"
    | "devolucao"
    | "incineracao"
    | "disposicao_justica"
    | "atualizacao";
  occurred_at: string;
  from_location: string | null;
  to_location: string | null;
  notes: string | null;
  details: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
};

export type ObjectDetailBundle = {
  object: ObjectRecord;
  photos: ObjectPhotoRecord[];
  movements: ObjectMovementRecord[];
};

export type ObjectOverviewStats = {
  total: number;
  seized: number;
  released: number;
  destroyed: number;
  pendingIdentification: number;
  /** Sem procedimento nem B.O. vinculado — evidência sem amarração formal ao caso. */
  withoutProcedure: number;
  releasedThisMonth: number;
  byType: Partial<Record<ObjectType, number>>;
  bySituation: Partial<Record<ObjectSituationFilter, number>>;
  monthly: Array<{ month: string; total: number }>;
};

export type ObjectListFilters = {
  search?: string;
  objectType?: ObjectType | null;
  situation?: ObjectSituationFilter | null;
  occurrenceType?: string | null;
  status?: string | null;
  custodyLocation?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  pendingIdentification?: boolean | null;
  /** Sem procedimento (IP/TCO) nem B.O. vinculado — evidência sem amarração formal ao caso. */
  withoutProcedure?: boolean | null;
  cursor?: { updatedAt: string; id: string } | null;
  limit?: number;
};
