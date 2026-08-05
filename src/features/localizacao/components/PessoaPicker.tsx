import { Check, Search, UserRoundSearch } from "lucide-react";
import { useEffect, useState } from "react";
import { listPessoas } from "@/lib/repositories/localizacaoRepository";
import { PESSOA_VINCULO_LABELS } from "../localizacaoConstants";
import type { PessoaAlvoRecord } from "../localizacaoTypes";

export function PessoaPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [people, setPeople] = useState<PessoaAlvoRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void listPessoas(search).then((records) => {
        if (!cancelled) {
          setPeople(records);
          setLoading(false);
        }
      });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search]);

  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Pessoa vinculada
      </label>
      <div className="mt-2 overflow-hidden rounded-xl border border-border bg-background">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => {
              setLoading(true);
              setSearch(event.target.value);
            }}
            placeholder="Buscar pessoa pelo nome"
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-52 overflow-y-auto p-1.5">
          {loading ? (
            <p className="p-3 text-xs text-muted-foreground">Buscando pessoas...</p>
          ) : people.length ? (
            people.map((person) => {
              const selected = value === person.id;
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => onChange(selected ? null : person.id)}
                  className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? "border-operational/40 bg-operational/10"
                      : "border-transparent hover:bg-accent"
                  }`}
                >
                  <UserRoundSearch
                    className={`mt-0.5 h-4 w-4 shrink-0 ${selected ? "text-operational" : "text-muted-foreground"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-xs text-foreground">
                      {person.nome}
                    </strong>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {PESSOA_VINCULO_LABELS[person.vinculo]}
                      {person.apelido ? ` · ${person.apelido}` : ""}
                    </span>
                  </span>
                  {selected ? <Check className="h-4 w-4 shrink-0 text-operational" /> : null}
                </button>
              );
            })
          ) : (
            <p className="p-3 text-xs text-muted-foreground">Nenhuma pessoa encontrada.</p>
          )}
        </div>
      </div>
    </div>
  );
}
