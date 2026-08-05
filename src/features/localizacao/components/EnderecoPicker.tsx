import { Check, MapPin, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { listEnderecos } from "@/lib/repositories/localizacaoRepository";
import type { EnderecoRecord } from "../localizacaoTypes";

function describeAddress(address: EnderecoRecord) {
  const number = address.sem_numero ? "s/n" : (address.numero ?? "s/n");
  return `${address.logradouro}, ${number}`;
}

export function EnderecoPicker({
  value,
  onChange,
  required,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  required?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [addresses, setAddresses] = useState<EnderecoRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void listEnderecos(search).then((records) => {
        if (!cancelled) {
          setAddresses(records);
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
        Endereço {required ? <span className="text-destructive">*</span> : null}
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
            placeholder="Buscar logradouro ou bairro"
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-52 overflow-y-auto p-1.5">
          {loading ? (
            <p className="p-3 text-xs text-muted-foreground">Buscando endereços...</p>
          ) : addresses.length ? (
            addresses.map((address) => {
              const selected = value === address.id;
              return (
                <button
                  key={address.id}
                  type="button"
                  onClick={() => onChange(selected ? null : address.id)}
                  className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? "border-operational/40 bg-operational/10"
                      : "border-transparent hover:bg-accent"
                  }`}
                >
                  <MapPin
                    className={`mt-0.5 h-4 w-4 shrink-0 ${selected ? "text-operational" : "text-muted-foreground"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-xs text-foreground">
                      {describeAddress(address)}
                    </strong>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {[address.bairro, address.municipio, address.uf].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {selected ? <Check className="h-4 w-4 shrink-0 text-operational" /> : null}
                </button>
              );
            })
          ) : (
            <p className="p-3 text-xs text-muted-foreground">Nenhum endereço encontrado.</p>
          )}
        </div>
      </div>
    </div>
  );
}
