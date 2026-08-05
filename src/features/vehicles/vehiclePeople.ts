export const VEHICLE_INVOLVED_ROLE_OPTIONS = [
  { value: "vitima", label: "Vítima" },
  { value: "autor", label: "Autor" },
  { value: "testemunha", label: "Testemunha" },
  { value: "advogado", label: "Advogado" },
  { value: "outro", label: "Outros" },
] as const;

export type VehicleInvolvedRole = (typeof VEHICLE_INVOLVED_ROLE_OPTIONS)[number]["value"];

export type VehicleInvolvedPersonFormValue = {
  id: string;
  papel: VehicleInvolvedRole;
  nome: string;
  observacao: string;
};

const ROLE_LABELS: Record<VehicleInvolvedRole, string> = Object.fromEntries(
  VEHICLE_INVOLVED_ROLE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<VehicleInvolvedRole, string>;

const ROLE_PATTERN =
  "V[ií]tima|Autor(?:\\s*\\/\\s*Investigado)?|Investigado|Testemunha|Advogad[oa]|Outros?|Outro envolvido";

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function normalizeRoleLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function roleFromLabel(label: string): VehicleInvolvedRole {
  const normalized = normalizeRoleLabel(label);
  if (normalized.includes("vitima")) return "vitima";
  if (normalized.includes("autor") || normalized.includes("investigad")) return "autor";
  if (normalized.includes("testemunha")) return "testemunha";
  if (normalized.includes("advogad")) return "advogado";
  return "outro";
}

export function createVehicleInvolvedPerson(
  papel: VehicleInvolvedRole = "vitima",
  nome = "",
  observacao = "",
): VehicleInvolvedPersonFormValue {
  return {
    id: createId(),
    papel,
    nome,
    observacao,
  };
}

export function serializeVehicleInvolvedPeople(people: VehicleInvolvedPersonFormValue[]) {
  const lines = people
    .filter((person) => person.nome.trim())
    .map((person) => {
      const base = `(${ROLE_LABELS[person.papel]}:) ${person.nome.trim()}`;
      return person.observacao.trim() ? `${base} - ${person.observacao.trim()}` : base;
    });

  return lines.join("\n") || null;
}

export function parseVehicleInvolvedPeople(
  value?: string | null,
): VehicleInvolvedPersonFormValue[] {
  const source = value?.trim();
  if (!source) return [];

  const separatedByComma = source.replace(
    new RegExp(`,\\s*(?=[^,\\n]+?\\((?:${ROLE_PATTERN})\\))`, "giu"),
    "\n",
  );
  const separated = separatedByComma.replace(
    new RegExp(`(\\((?:${ROLE_PATTERN})\\))\\s+e\\s+(?=[^,\\n]+?\\((?:${ROLE_PATTERN})\\))`, "giu"),
    "$1\n",
  );

  return separated
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const prefixMatch = line.match(
        new RegExp(`^\\(\\s*(${ROLE_PATTERN})\\s*:?\\s*\\)\\s*(?::\\s*)?(.+)$`, "iu"),
      );
      if (prefixMatch) {
        const content = prefixMatch[2]?.trim() ?? "";
        const observationMatch = content.match(/^(.*?)\s+[-–—]\s+(.+)$/u);

        return createVehicleInvolvedPerson(
          roleFromLabel(prefixMatch[1] ?? ""),
          observationMatch?.[1]?.trim() ?? content,
          observationMatch?.[2]?.trim() ?? "",
        );
      }

      const suffixMatch = line.match(
        new RegExp(`^(.*?)\\s*\\((?:(${ROLE_PATTERN}))\\)\\s*(?:[-–—:]\\s*(.*))?$`, "iu"),
      );

      if (!suffixMatch) return createVehicleInvolvedPerson("outro", line);

      return createVehicleInvolvedPerson(
        roleFromLabel(suffixMatch[2] ?? ""),
        suffixMatch[1]?.trim() ?? "",
        suffixMatch[3]?.trim() ?? "",
      );
    });
}

export function formatVehicleInvolvedPeople(value?: string | null) {
  return serializeVehicleInvolvedPeople(parseVehicleInvolvedPeople(value));
}
