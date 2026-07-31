import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Camera, Check, Link2, LoaderCircle, Save, X } from "lucide-react";
import {
  searchInqueritosForLink,
  type InqueritoLinkOption,
} from "@/lib/repositories/inqueritosRepository";
import {
  createVehicle,
  getVehicleById,
  updateVehicle,
  uploadVehiclePhotos,
} from "@/lib/repositories/vehiclesRepository";
import { validateVehicleImage } from "../imageCompression";
import {
  CONSERVATION_STATES,
  IDENTIFICATION_STATUS_LABELS,
  OCCURRENCE_TYPES,
  VEHICLE_SITUATION_LABELS,
  VEHICLE_TYPE_LABELS,
} from "../vehicleConstants";
import { useDebouncedValue } from "../useDebouncedValue";
import type {
  IdentificationStatus,
  VehiclePayload,
  VehicleRecord,
  VehicleSituation,
  VehicleType,
} from "../vehicleTypes";

type FormMode = "create" | "edit";

type FormState = {
  vehicleType: VehicleType;
  brand: string;
  model: string;
  color: string;
  manufactureYear: string;
  modelYear: string;
  isMotorized: boolean;
  heavyCategory: string;
  bodyworkType: string;
  plate: string;
  plateStatus: IdentificationStatus;
  renavam: string;
  renavamStatus: IdentificationStatus;
  engineNumber: string;
  engineStatus: IdentificationStatus;
  chassis: string;
  chassisStatus: IdentificationStatus;
  situation: VehicleSituation;
  occurrenceType: string;
  status: string;
  pendingIdentification: boolean;
  procedureType: string;
  procedureNumber: string;
  policeReportNumber: string;
  courtProcessNumber: string;
  involvedPeople: string;
  inqueritoId: string;
  seizureDate: string;
  seizureLocation: string;
  custodyLocation: string;
  storageLocation: string;
  custodyResponsible: string;
  conservationState: string;
  hasKey: boolean;
  hasDocument: boolean;
  custodyObservations: string;
  observations: string;
  releaseStatus: string;
  releaseDate: string;
  releasedTo: string;
  releaseDocument: string;
  releaseAuthority: string;
  deliveryTerm: string;
  releaseObservations: string;
};

const INITIAL_STATE: FormState = {
  vehicleType: "automovel",
  brand: "",
  model: "",
  color: "",
  manufactureYear: "",
  modelYear: "",
  isMotorized: true,
  heavyCategory: "",
  bodyworkType: "",
  plate: "",
  plateStatus: "informado",
  renavam: "",
  renavamStatus: "informado",
  engineNumber: "",
  engineStatus: "informado",
  chassis: "",
  chassisStatus: "informado",
  situation: "apreendido",
  occurrenceType: "",
  status: "",
  pendingIdentification: false,
  procedureType: "",
  procedureNumber: "",
  policeReportNumber: "",
  courtProcessNumber: "",
  involvedPeople: "",
  inqueritoId: "",
  seizureDate: "",
  seizureLocation: "",
  custodyLocation: "",
  storageLocation: "",
  custodyResponsible: "",
  conservationState: "",
  hasKey: false,
  hasDocument: false,
  custodyObservations: "",
  observations: "",
  releaseStatus: "nao_liberado",
  releaseDate: "",
  releasedTo: "",
  releaseDocument: "",
  releaseAuthority: "",
  deliveryTerm: "",
  releaseObservations: "",
};

const steps = [
  "Identificação",
  "Situação policial",
  "Apreensão e custódia",
  "Liberação e arquivos",
];

function textOrNull(value: string) {
  return value.trim() || null;
}

function yearOrNull(value: string) {
  const year = Number(value);
  return Number.isFinite(year) && year > 0 ? year : null;
}

function stateFromVehicle(vehicle: VehicleRecord): FormState {
  return {
    vehicleType: vehicle.vehicle_type,
    brand: vehicle.brand ?? "",
    model: vehicle.model ?? "",
    color: vehicle.color ?? "",
    manufactureYear: vehicle.manufacture_year?.toString() ?? "",
    modelYear: vehicle.model_year?.toString() ?? "",
    isMotorized: vehicle.is_motorized ?? vehicle.vehicle_type !== "bicicleta",
    heavyCategory: vehicle.heavy_category ?? "",
    bodyworkType: vehicle.bodywork_type ?? "",
    plate: vehicle.plate ?? "",
    plateStatus: vehicle.plate_status ?? "informado",
    renavam: vehicle.renavam ?? "",
    renavamStatus: vehicle.renavam_status ?? "informado",
    engineNumber: vehicle.engine_number ?? "",
    engineStatus: vehicle.engine_status ?? "informado",
    chassis: vehicle.chassis ?? "",
    chassisStatus: vehicle.chassis_status ?? "informado",
    situation: vehicle.situation,
    occurrenceType: vehicle.occurrence_type ?? "",
    status: vehicle.status ?? "",
    pendingIdentification: vehicle.pending_identification,
    procedureType: vehicle.procedure_type ?? "",
    procedureNumber: vehicle.procedure_number ?? "",
    policeReportNumber: vehicle.police_report_number ?? "",
    courtProcessNumber: vehicle.court_process_number ?? "",
    involvedPeople: vehicle.involved_people ?? "",
    inqueritoId: vehicle.inquerito_id ?? "",
    seizureDate: vehicle.seizure_date ?? "",
    seizureLocation: vehicle.seizure_location ?? "",
    custodyLocation: vehicle.custody_location ?? "",
    storageLocation: vehicle.storage_location ?? "",
    custodyResponsible: vehicle.custody_responsible ?? "",
    conservationState: vehicle.conservation_state ?? "",
    hasKey: vehicle.has_key ?? false,
    hasDocument: vehicle.has_document ?? false,
    custodyObservations: vehicle.custody_observations ?? "",
    observations: vehicle.observations ?? "",
    releaseStatus: vehicle.release_status ?? "nao_liberado",
    releaseDate: vehicle.release_date ?? "",
    releasedTo: vehicle.released_to ?? "",
    releaseDocument: vehicle.release_document ?? "",
    releaseAuthority: vehicle.release_authority ?? "",
    deliveryTerm: vehicle.delivery_term ?? "",
    releaseObservations: vehicle.release_observations ?? "",
  };
}

function toPayload(state: FormState): VehiclePayload {
  const identificationFieldsVisible = state.vehicleType !== "bicicleta" || state.isMotorized;
  return {
    vehicle_type: state.vehicleType,
    brand: textOrNull(state.brand),
    model: textOrNull(state.model),
    color: textOrNull(state.color),
    manufacture_year: yearOrNull(state.manufactureYear),
    model_year: yearOrNull(state.modelYear),
    is_motorized: state.vehicleType === "bicicleta" ? state.isMotorized : true,
    heavy_category: ["caminhao", "onibus"].includes(state.vehicleType)
      ? textOrNull(state.heavyCategory)
      : null,
    bodywork_type: ["caminhao", "onibus"].includes(state.vehicleType)
      ? textOrNull(state.bodyworkType)
      : null,
    plate: identificationFieldsVisible ? textOrNull(state.plate.toUpperCase()) : null,
    plate_status: identificationFieldsVisible ? state.plateStatus : "ausente",
    renavam: identificationFieldsVisible ? textOrNull(state.renavam) : null,
    renavam_status: identificationFieldsVisible ? state.renavamStatus : "ausente",
    engine_number: identificationFieldsVisible ? textOrNull(state.engineNumber) : null,
    engine_status: identificationFieldsVisible ? state.engineStatus : "ausente",
    chassis: identificationFieldsVisible ? textOrNull(state.chassis.toUpperCase()) : null,
    chassis_status: identificationFieldsVisible ? state.chassisStatus : "ausente",
    situation: state.situation,
    occurrence_type: textOrNull(state.occurrenceType),
    status: textOrNull(state.status),
    pending_identification: state.pendingIdentification,
    procedure_type: textOrNull(state.procedureType),
    procedure_number: textOrNull(state.procedureNumber),
    police_report_number: textOrNull(state.policeReportNumber),
    court_process_number: textOrNull(state.courtProcessNumber),
    involved_people: textOrNull(state.involvedPeople),
    inquerito_id: textOrNull(state.inqueritoId),
    seizure_date: textOrNull(state.seizureDate),
    seizure_location: textOrNull(state.seizureLocation),
    custody_location: textOrNull(state.custodyLocation),
    storage_location: textOrNull(state.storageLocation),
    custody_responsible: textOrNull(state.custodyResponsible),
    conservation_state: textOrNull(state.conservationState),
    has_key: state.hasKey,
    has_document: state.hasDocument,
    custody_observations: textOrNull(state.custodyObservations),
    observations: textOrNull(state.observations),
    release_status: textOrNull(state.releaseStatus),
    release_date: textOrNull(state.releaseDate),
    released_to: textOrNull(state.releasedTo),
    release_document: textOrNull(state.releaseDocument),
    release_authority: textOrNull(state.releaseAuthority),
    delivery_term: textOrNull(state.deliveryTerm),
    release_observations: textOrNull(state.releaseObservations),
  };
}

export function VehicleFormPage({ mode, vehicleId }: { mode: FormMode; vehicleId?: string }) {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [inquiryQuery, setInquiryQuery] = useState("");
  const debouncedInquiryQuery = useDebouncedValue(inquiryQuery, 350);
  const [inquiries, setInquiries] = useState<InqueritoLinkOption[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<InqueritoLinkOption | null>(null);

  useEffect(() => {
    if (mode !== "edit" || !vehicleId) return;
    let cancelled = false;
    void getVehicleById(vehicleId)
      .then((vehicle) => {
        if (!vehicle) throw new Error("Veículo não encontrado.");
        if (!cancelled) setForm(stateFromVehicle(vehicle));
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar o veículo para edição.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, vehicleId]);

  useEffect(() => {
    let cancelled = false;
    if (debouncedInquiryQuery.trim().length < 2) {
      setInquiries([]);
      return;
    }
    void searchInqueritosForLink(debouncedInquiryQuery, 8)
      .then((items) => {
        if (!cancelled) setInquiries(items);
      })
      .catch(() => {
        if (!cancelled) setInquiries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedInquiryQuery]);

  const identificationFieldsVisible = form.vehicleType !== "bicicleta" || form.isMotorized;
  const title = mode === "create" ? "Novo Veículo" : "Editar Veículo";
  const chosenPhotoNames = useMemo(() => photos.map((file) => file.name).join(", "), [photos]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handlePhotos(files: FileList | null) {
    const selected = Array.from(files ?? []).slice(0, 8);
    const validation = selected.map(validateVehicleImage).find(Boolean);
    if (validation) {
      setPhotoError(validation);
      return;
    }
    setPhotoError("");
    setPhotos(selected);
  }

  async function submit() {
    if (!form.vehicleType) {
      setError("Informe o tipo do veículo.");
      setStep(0);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = toPayload(form);
      const saved =
        mode === "edit" && vehicleId
          ? await updateVehicle(vehicleId, payload)
          : await createVehicle(payload);
      if (photos.length) await uploadVehiclePhotos(saved.id, photos);
      navigate({ to: "/veiculos/$vehicleId", params: { vehicleId: saved.id }, replace: true });
    } catch (submissionError) {
      console.error("[VehicleForm] Falha ao salvar", submissionError);
      setError("Não foi possível salvar o veículo. Revise os dados e tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="flex min-h-[45vh] items-center justify-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-info" />
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="rounded-2xl border border-border/70 bg-card/60 p-5 lg:p-6">
        <button
          type="button"
          onClick={() => history.back()}
          className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-info"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <p className="text-[10px] font-bold tracking-[0.2em] text-info">MÓDULO VEÍCULOS</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          O formulário aceita registros incompletos e adapta os campos ao tipo selecionado.
        </p>
      </header>

      <ol className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {steps.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => setStep(index)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-xs font-semibold transition ${step === index ? "border-info/45 bg-info/15 text-info" : index < step ? "border-success/30 bg-success/5 text-success" : "border-border bg-card text-muted-foreground"}`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-[10px]">
                {index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span>{label}</span>
            </button>
          </li>
        ))}
      </ol>

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(event) => event.preventDefault()}
        className="rounded-2xl border border-border bg-card p-5 lg:p-6"
      >
        {step === 0 ? (
          <FormSection
            title="1. IDENTIFICAÇÃO"
            description="Dados físicos e identificadores disponíveis."
          >
            <SelectField
              label="Tipo do veículo"
              value={form.vehicleType}
              onChange={(value) => {
                const vehicleType = value as VehicleType;
                setForm((current) => ({
                  ...current,
                  vehicleType,
                  isMotorized: vehicleType !== "bicicleta",
                }));
              }}
              required
            >
              {Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Marca"
              value={form.brand}
              onChange={(value) => update("brand", value)}
            />
            <TextField
              label="Modelo"
              value={form.model}
              onChange={(value) => update("model", value)}
            />
            <TextField
              label="Cor"
              value={form.color}
              onChange={(value) => update("color", value)}
            />
            <TextField
              label="Ano de fabricação"
              type="number"
              value={form.manufactureYear}
              onChange={(value) => update("manufactureYear", value)}
            />
            <TextField
              label="Ano do modelo"
              type="number"
              value={form.modelYear}
              onChange={(value) => update("modelYear", value)}
            />
            {form.vehicleType === "bicicleta" ? (
              <CheckboxField
                label="Bicicleta motorizada"
                checked={form.isMotorized}
                onChange={(value) => update("isMotorized", value)}
              />
            ) : null}
            {["caminhao", "onibus"].includes(form.vehicleType) ? (
              <>
                <TextField
                  label="Categoria do veículo pesado"
                  value={form.heavyCategory}
                  onChange={(value) => update("heavyCategory", value)}
                />
                <TextField
                  label="Carroceria / característica"
                  value={form.bodyworkType}
                  onChange={(value) => update("bodyworkType", value)}
                />
              </>
            ) : null}
            {identificationFieldsVisible ? (
              <>
                <IdentificationField
                  label="Placa"
                  value={form.plate}
                  status={form.plateStatus}
                  onValueChange={(value) => update("plate", value)}
                  onStatusChange={(value) => update("plateStatus", value)}
                />
                <IdentificationField
                  label="Renavam"
                  value={form.renavam}
                  status={form.renavamStatus}
                  onValueChange={(value) => update("renavam", value)}
                  onStatusChange={(value) => update("renavamStatus", value)}
                />
                <IdentificationField
                  label="Número do motor"
                  value={form.engineNumber}
                  status={form.engineStatus}
                  onValueChange={(value) => update("engineNumber", value)}
                  onStatusChange={(value) => update("engineStatus", value)}
                />
                <IdentificationField
                  label="Chassi"
                  value={form.chassis}
                  status={form.chassisStatus}
                  onValueChange={(value) => update("chassis", value)}
                  onStatusChange={(value) => update("chassisStatus", value)}
                />
              </>
            ) : (
              <p className="rounded-xl border border-info/20 bg-info/5 p-3 text-xs text-muted-foreground md:col-span-2">
                Placa, Renavam, motor e chassi não são exigidos para bicicleta não motorizada.
              </p>
            )}
          </FormSection>
        ) : null}

        {step === 1 ? (
          <FormSection
            title="2. SITUAÇÃO POLICIAL"
            description="Ocorrência, procedimento e pessoas vinculadas."
          >
            <SelectField
              label="Situação"
              value={form.situation}
              onChange={(value) => update("situation", value as VehicleSituation)}
            >
              {Object.entries(VEHICLE_SITUATION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Tipo de ocorrência"
              value={form.occurrenceType}
              onChange={(value) => update("occurrenceType", value)}
            >
              <option value="">Selecione</option>
              {OCCURRENCE_TYPES.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </SelectField>
            <TextField
              label="Status operacional"
              value={form.status}
              onChange={(value) => update("status", value)}
            />
            <CheckboxField
              label="Pendente de identificação"
              checked={form.pendingIdentification}
              onChange={(value) => update("pendingIdentification", value)}
            />
            <TextField
              label="Tipo do procedimento"
              value={form.procedureType}
              onChange={(value) => update("procedureType", value)}
              placeholder="IP, APF, TCO..."
            />
            <TextField
              label="Número do procedimento"
              value={form.procedureNumber}
              onChange={(value) => update("procedureNumber", value)}
            />
            <TextField
              label="Número do B.O."
              value={form.policeReportNumber}
              onChange={(value) => update("policeReportNumber", value)}
            />
            <TextField
              label="Processo judicial"
              value={form.courtProcessNumber}
              onChange={(value) => update("courtProcessNumber", value)}
            />
            <div className="relative md:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Vincular a Inquérito do SIPI
              </label>
              {form.inqueritoId ? (
                <div className="flex h-11 items-center justify-between rounded-xl border border-info/35 bg-info/10 px-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <Link2 className="h-4 w-4 text-info" />
                    <span className="truncate">
                      {selectedInquiry?.numero_ppe || form.inqueritoId}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      update("inqueritoId", "");
                      setSelectedInquiry(null);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    value={inquiryQuery}
                    onChange={(event) => setInquiryQuery(event.target.value)}
                    placeholder="Digite ao menos 2 caracteres do PPE"
                    className="h-11 w-full rounded-xl border border-border bg-background/70 px-3 text-sm outline-none focus:border-info/50"
                  />
                  {inquiries.length ? (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-xl">
                      {inquiries.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            update("inqueritoId", item.id);
                            setSelectedInquiry(item);
                            setInquiryQuery("");
                            setInquiries([]);
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs hover:bg-info/10"
                        >
                          <strong>{item.numero_ppe || "Sem PPE"}</strong>
                          <span className="text-muted-foreground">
                            {item.tipo_procedimento_normalizado || item.tipo || "Procedimento"}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </div>
            <TextAreaField
              label="Envolvidos"
              value={form.involvedPeople}
              onChange={(value) => update("involvedPeople", value)}
              className="md:col-span-2"
            />
            <TextAreaField
              label="Observações gerais"
              value={form.observations}
              onChange={(value) => update("observations", value)}
              className="md:col-span-2"
            />
          </FormSection>
        ) : null}

        {step === 2 ? (
          <FormSection
            title="3. APREENSÃO E CUSTÓDIA"
            description="Entrada, localização e condições do veículo."
          >
            <TextField
              label="Data da apreensão"
              type="date"
              value={form.seizureDate}
              onChange={(value) => update("seizureDate", value)}
            />
            <TextField
              label="Local da apreensão"
              value={form.seizureLocation}
              onChange={(value) => update("seizureLocation", value)}
            />
            <TextField
              label="Local de custódia"
              value={form.custodyLocation}
              onChange={(value) => update("custodyLocation", value)}
            />
            <TextField
              label="Depósito / pátio"
              value={form.storageLocation}
              onChange={(value) => update("storageLocation", value)}
            />
            <TextField
              label="Responsável pelo recebimento"
              value={form.custodyResponsible}
              onChange={(value) => update("custodyResponsible", value)}
            />
            <SelectField
              label="Estado de conservação"
              value={form.conservationState}
              onChange={(value) => update("conservationState", value)}
            >
              <option value="">Selecione</option>
              {CONSERVATION_STATES.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </SelectField>
            <CheckboxField
              label="Possui chave"
              checked={form.hasKey}
              onChange={(value) => update("hasKey", value)}
            />
            <CheckboxField
              label="Possui documento"
              checked={form.hasDocument}
              onChange={(value) => update("hasDocument", value)}
            />
            <TextAreaField
              label="Observações da custódia"
              value={form.custodyObservations}
              onChange={(value) => update("custodyObservations", value)}
              className="md:col-span-2"
            />
          </FormSection>
        ) : null}

        {step === 3 ? (
          <FormSection
            title="4. LIBERAÇÃO E ARQUIVOS"
            description="Preencha a saída somente quando houver e anexe fotografias comprimidas."
          >
            <SelectField
              label="Situação da liberação"
              value={form.releaseStatus}
              onChange={(value) => update("releaseStatus", value)}
            >
              <option value="nao_liberado">Não liberado</option>
              <option value="autorizado">Autorizado</option>
              <option value="liberado">Liberado</option>
              <option value="devolvido">Devolvido</option>
            </SelectField>
            <TextField
              label="Data da devolução"
              type="date"
              value={form.releaseDate}
              onChange={(value) => update("releaseDate", value)}
            />
            <TextField
              label="Pessoa que recebeu"
              value={form.releasedTo}
              onChange={(value) => update("releasedTo", value)}
            />
            <TextField
              label="Documento apresentado"
              value={form.releaseDocument}
              onChange={(value) => update("releaseDocument", value)}
            />
            <TextField
              label="Autoridade responsável"
              value={form.releaseAuthority}
              onChange={(value) => update("releaseAuthority", value)}
            />
            <TextField
              label="Termo de entrega"
              value={form.deliveryTerm}
              onChange={(value) => update("deliveryTerm", value)}
            />
            <TextAreaField
              label="Observações da saída"
              value={form.releaseObservations}
              onChange={(value) => update("releaseObservations", value)}
              className="md:col-span-2"
            />
            <label className="md:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Fotografias do veículo
              </span>
              <span className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-info/35 bg-info/5 px-4 py-5 text-center hover:bg-info/10">
                <Camera className="h-6 w-6 text-info" />
                <span className="mt-2 text-sm font-semibold">Selecionar até 8 fotografias</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  O original e a miniatura serão convertidos e comprimidos em WebP.
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) => handlePhotos(event.target.files)}
                  className="sr-only"
                />
              </span>
              {chosenPhotoNames ? (
                <span className="mt-2 block truncate text-xs text-muted-foreground">
                  {chosenPhotoNames}
                </span>
              ) : null}
              {photoError ? (
                <span className="mt-2 block text-xs text-destructive">{photoError}</span>
              ) : null}
            </label>
          </FormSection>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            disabled={step === 0 || saving}
            onClick={() => {
              setStep((value) => Math.max(0, value - 1));
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" /> Anterior
          </button>
          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                setStep((value) => Math.min(steps.length - 1, value + 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-info px-5 text-sm font-semibold text-white"
            >
              Próximo <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving || Boolean(photoError)}
              onClick={submit}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-info px-5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Salvando..." : "Salvar veículo"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-5">
        <h2 className="text-sm font-black tracking-[0.14em] text-info">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-border bg-background/70 px-3 text-sm outline-none focus:border-info/50"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </span>
      <select
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-background/70 px-3 text-sm outline-none focus:border-info/50"
      >
        {children}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full resize-y rounded-xl border border-border bg-background/70 px-3 py-2.5 text-sm outline-none focus:border-info/50"
      />
    </label>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex h-11 items-center gap-2 self-end rounded-xl border border-border bg-background/70 px-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-[var(--info)]"
      />
      {label}
    </label>
  );
}

function IdentificationField({
  label,
  value,
  status,
  onValueChange,
  onStatusChange,
}: {
  label: string;
  value: string;
  status: IdentificationStatus;
  onValueChange: (value: string) => void;
  onStatusChange: (value: IdentificationStatus) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="grid grid-cols-[minmax(0,1fr)_132px] gap-2">
        <input
          value={value}
          disabled={status !== "informado"}
          onChange={(event) => onValueChange(event.target.value)}
          className="h-11 min-w-0 rounded-xl border border-border bg-background/70 px-3 text-sm uppercase outline-none focus:border-info/50 disabled:opacity-45"
        />
        <select
          value={status}
          onChange={(event) => onStatusChange(event.target.value as IdentificationStatus)}
          className="h-11 rounded-xl border border-border bg-background/70 px-2 text-xs outline-none focus:border-info/50"
        >
          {Object.entries(IDENTIFICATION_STATUS_LABELS).map(([key, text]) => (
            <option key={key} value={key}>
              {text}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
