import { Plus, Trash2, UserRound } from "lucide-react";
import { FormFieldLabel } from "@/components/FormFieldLabel";
import {
  createVehicleInvolvedPerson,
  VEHICLE_INVOLVED_ROLE_OPTIONS,
  type VehicleInvolvedPersonFormValue,
  type VehicleInvolvedRole,
} from "../vehiclePeople";

type VehiclePeopleEditorProps = {
  value: VehicleInvolvedPersonFormValue[];
  onChange: (value: VehicleInvolvedPersonFormValue[]) => void;
};

export function VehiclePeopleEditor({ value, onChange }: VehiclePeopleEditorProps) {
  const updatePerson = (id: string, patch: Partial<VehicleInvolvedPersonFormValue>) => {
    onChange(value.map((person) => (person.id === id ? { ...person, ...patch } : person)));
  };

  const removePerson = (id: string) => {
    onChange(value.filter((person) => person.id !== id));
  };

  const addPerson = () => onChange([...value, createVehicleInvolvedPerson()]);

  return (
    <div className="space-y-3 md:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-info/10 text-info">
            <UserRound className="size-4" aria-hidden="true" />
          </span>
          <div>
            <FormFieldLabel label="Envolvidos" className="mb-0" />
            <p className="mt-1 text-xs text-muted-foreground">
              Cadastre cada pessoa e informe sua participação na ocorrência.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={addPerson}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-lg border border-info/35 bg-info/10 px-3 text-xs font-bold text-info transition-colors hover:bg-info/15"
        >
          <Plus className="size-4" aria-hidden="true" />
          Adicionar envolvido
        </button>
      </div>

      {value.length === 0 ? (
        <button
          type="button"
          onClick={addPerson}
          className="flex min-h-24 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/35 text-sm text-muted-foreground transition-colors hover:border-info/40 hover:text-info"
        >
          <UserRound className="size-4" aria-hidden="true" />
          Adicionar o primeiro envolvido
        </button>
      ) : (
        <div className="space-y-2.5">
          {value.map((person, index) => (
            <div
              key={person.id}
              className="grid gap-3 rounded-xl border border-border/70 bg-background/45 p-3 md:grid-cols-[minmax(160px,0.75fr)_minmax(220px,1.3fr)_minmax(220px,1fr)_40px] md:items-end"
            >
              <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <FormFieldLabel label="Participação" className="mb-0" />
                <select
                  value={person.papel}
                  onChange={(event) =>
                    updatePerson(person.id, {
                      papel: event.target.value as VehicleInvolvedRole,
                    })
                  }
                  className="h-10 min-w-0 rounded-lg border border-border bg-background px-3 text-sm font-medium normal-case tracking-normal text-foreground outline-none transition-colors focus:border-info"
                >
                  {VEHICLE_INVOLVED_ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <FormFieldLabel label="Nome" className="mb-0" />
                <input
                  value={person.nome}
                  onChange={(event) => updatePerson(person.id, { nome: event.target.value })}
                  placeholder={person.papel === "autor" ? "Nome ou Desconhecido" : "Nome completo"}
                  className="h-10 min-w-0 rounded-lg border border-border bg-background px-3 text-sm font-medium normal-case tracking-normal text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-info"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <FormFieldLabel label="Observação opcional" className="mb-0" />
                <input
                  value={person.observacao}
                  onChange={(event) => updatePerson(person.id, { observacao: event.target.value })}
                  placeholder="Alcunha, documento ou vínculo"
                  className="h-10 min-w-0 rounded-lg border border-border bg-background px-3 text-sm font-medium normal-case tracking-normal text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-info"
                />
              </label>

              <button
                type="button"
                onClick={() => removePerson(person.id)}
                title={`Remover envolvido ${index + 1}`}
                aria-label={`Remover envolvido ${index + 1}`}
                className="grid size-10 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
