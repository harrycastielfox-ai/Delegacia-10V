import { Plus, Trash2, UserRound } from "lucide-react";
import { FormFieldLabel } from "@/components/FormFieldLabel";

export const REPRESENTATION_PERSON_ROLE_OPTIONS = [
  { value: "vitima", label: "Vítima" },
  { value: "investigado_representado", label: "Investigado / Representado" },
  { value: "testemunha", label: "Testemunha" },
  { value: "outro", label: "Outro envolvido" },
] as const;

export type RepresentationPersonRole = (typeof REPRESENTATION_PERSON_ROLE_OPTIONS)[number]["value"];

export type RepresentationPersonFormValue = {
  id: string;
  papel: RepresentationPersonRole;
  nome: string;
  observacao: string;
};

function createRepresentationPerson(
  papel: RepresentationPersonRole = "vitima",
): RepresentationPersonFormValue {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    papel,
    nome: "",
    observacao: "",
  };
}

type RepresentationPeopleEditorProps = {
  value: RepresentationPersonFormValue[];
  onChange: (value: RepresentationPersonFormValue[]) => void;
};

export function RepresentationPeopleEditor({ value, onChange }: RepresentationPeopleEditorProps) {
  const addPerson = () => onChange([...value, createRepresentationPerson()]);

  const updatePerson = (
    id: string,
    field: keyof Omit<RepresentationPersonFormValue, "id">,
    nextValue: string,
  ) => {
    onChange(
      value.map((person) => (person.id === id ? { ...person, [field]: nextValue } : person)),
    );
  };

  const removePerson = (id: string) => {
    onChange(value.filter((person) => person.id !== id));
  };

  return (
    <div className="md:col-span-2 lg:col-span-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs font-semibold text-foreground">Pessoas adicionais</p>
            <p className="text-[11px] text-muted-foreground">
              Inclua outras vítimas, representados, testemunhas ou envolvidos quando necessário.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={addPerson}
          className="inline-flex items-center gap-2 rounded-md border border-primary/45 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
        >
          <Plus className="h-4 w-4" />
          Adicionar pessoa
        </button>
      </div>

      {value.length > 0 && (
        <div className="space-y-3">
          {value.map((person, index) => (
            <div
              key={person.id}
              className="grid grid-cols-1 gap-3 rounded-lg border border-border/60 bg-card/45 p-3 md:grid-cols-[minmax(170px,0.7fr)_minmax(220px,1.2fr)_minmax(220px,1fr)_40px]"
            >
              <div>
                <FormFieldLabel label={`Papel ${index + 1}`} />
                <select
                  value={person.papel}
                  onChange={(event) => updatePerson(person.id, "papel", event.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                >
                  {REPRESENTATION_PERSON_ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FormFieldLabel label="Nome completo" />
                <input
                  value={person.nome}
                  onChange={(event) => updatePerson(person.id, "nome", event.target.value)}
                  placeholder="Nome da pessoa envolvida"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <FormFieldLabel label="Observação (opcional)" />
                <input
                  value={person.observacao}
                  onChange={(event) => updatePerson(person.id, "observacao", event.target.value)}
                  placeholder="Ex.: alcunha, vínculo ou observação"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div className="flex items-end justify-end">
                <button
                  type="button"
                  onClick={() => removePerson(person.id)}
                  title="Remover pessoa adicional"
                  aria-label={`Remover pessoa adicional ${index + 1}`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-red-500/30 text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
