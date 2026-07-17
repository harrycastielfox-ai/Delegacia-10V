import { Plus, Trash2, UserRound } from "lucide-react";
import { FormFieldLabel } from "@/components/FormFieldLabel";
import {
  createInquiryPerson,
  INQUIRY_PERSON_ROLE_OPTIONS,
  type InquiryPersonFormValue,
} from "@/lib/operationalContracts";

export type { InquiryPersonFormValue } from "@/lib/operationalContracts";

type InquiryPeopleEditorProps = {
  value: InquiryPersonFormValue[];
  onChange: (value: InquiryPersonFormValue[]) => void;
};

export function InquiryPeopleEditor({ value, onChange }: InquiryPeopleEditorProps) {
  const updatePerson = (id: string, patch: Partial<InquiryPersonFormValue>) => {
    onChange(value.map((person) => (person.id === id ? { ...person, ...patch } : person)));
  };

  const removePerson = (id: string) => {
    onChange(value.filter((person) => person.id !== id));
  };

  return (
    <div className="space-y-3 md:col-span-2 lg:col-span-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">
            Vítimas, investigados e testemunhas
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Adicione uma linha para cada pessoa envolvida no procedimento.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...value, createInquiryPerson()])}
          className="inline-flex h-9 w-fit items-center gap-2 rounded-lg border border-primary/35 bg-primary/10 px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/15"
        >
          <Plus className="size-4" aria-hidden="true" />
          Adicionar pessoa
        </button>
      </div>

      {value.length === 0 ? (
        <button
          type="button"
          onClick={() => onChange([createInquiryPerson()])}
          className="flex min-h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background/40 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <UserRound className="size-4" aria-hidden="true" />
          Adicionar a primeira pessoa envolvida
        </button>
      ) : (
        <div className="space-y-2">
          {value.map((person, index) => (
            <div
              key={person.id}
              className="grid gap-2 rounded-lg border border-border/70 bg-background/45 p-3 md:grid-cols-[minmax(180px,0.8fr)_minmax(240px,1.4fr)_minmax(220px,1fr)_40px] md:items-end"
            >
              <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <FormFieldLabel label="Papel" className="mb-0" />
                <select
                  value={person.papel}
                  onChange={(event) =>
                    updatePerson(person.id, {
                      papel: event.target.value as InquiryPersonRole,
                    })
                  }
                  className="h-10 min-w-0 rounded-lg border border-border bg-background px-3 text-sm font-medium normal-case tracking-normal text-foreground outline-none transition-colors focus:border-primary"
                >
                  {INQUIRY_PERSON_ROLE_OPTIONS.map((option) => (
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
                  placeholder={
                    person.papel === "autor_investigado" ? "Nome ou Desconhecido" : "Nome completo"
                  }
                  className="h-10 min-w-0 rounded-lg border border-border bg-background px-3 text-sm font-medium normal-case tracking-normal text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <FormFieldLabel label="Observação opcional" className="mb-0" />
                <input
                  value={person.observacao}
                  onChange={(event) => updatePerson(person.id, { observacao: event.target.value })}
                  placeholder="Alcunha, condição ou vínculo"
                  className="h-10 min-w-0 rounded-lg border border-border bg-background px-3 text-sm font-medium normal-case tracking-normal text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
                />
              </label>

              <button
                type="button"
                onClick={() => removePerson(person.id)}
                title={`Remover pessoa ${index + 1}`}
                aria-label={`Remover pessoa ${index + 1}`}
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
