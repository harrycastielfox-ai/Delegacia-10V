import { Eye, MapPin, Phone, Route as RouteIcon, UserRound, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { getPessoaPhotoSignedUrl } from "@/lib/repositories/localizacaoRepository";
import type { RoadRoute } from "@/lib/roadRouting";
import { PESSOA_VINCULO_LABELS } from "../localizacaoConstants";
import type { PessoaDetalheRecord } from "../localizacaoTypes";

function ContatoFoto({ person }: { person: PessoaDetalheRecord }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    void getPessoaPhotoSignedUrl(person.foto_perfil_path, "thumbnail").then((value) => {
      if (!cancelled) setUrl(value);
    });
    return () => {
      cancelled = true;
    };
  }, [person.foto_perfil_path]);

  return url ? (
    <img
      src={url}
      alt={`Fotografia de ${person.nome}`}
      decoding="async"
      className="h-14 w-14 shrink-0 rounded-xl border border-operational/30 object-cover"
    />
  ) : (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-operational/30 bg-operational/10 text-operational">
      <UserRound className="h-6 w-6" />
    </span>
  );
}

function formatAddress(person: PessoaDetalheRecord) {
  const address = person.endereco;
  if (!address) return "Endereço não cadastrado";
  const number = address.sem_numero ? "s/n" : (address.numero ?? "s/n");
  return `${address.logradouro}, ${number}`;
}

export function ContatoPanel({
  person,
  route,
  routeState,
  routeVisible,
  onToggleRoute,
  onViewDetails,
}: {
  person: PessoaDetalheRecord | null;
  route: RoadRoute | null;
  routeState: "idle" | "loading" | "ready" | "error";
  routeVisible: boolean;
  onToggleRoute: () => void;
  onViewDetails: () => void;
}) {
  if (!person) {
    return (
      <aside className="flex min-h-[535px] flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-center">
        <UsersRound className="h-8 w-8 text-muted-foreground" />
        <h2 className="mt-3 text-sm font-bold">Nenhum contato selecionado</h2>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
          Clique na foto de um perfil no mapa para ver os dados e traçar a rota até o local.
        </p>
      </aside>
    );
  }

  return (
    <aside className="flex min-h-[535px] flex-col overflow-hidden rounded-xl border border-border bg-card">
      <header className="border-b border-border px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-operational">
          Contato selecionado
        </p>
        <div className="mt-3 flex items-center gap-3">
          <ContatoFoto person={person} />
          <div className="min-w-0 flex-1">
            <span className="inline-flex rounded-full border border-operational/35 bg-operational/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-operational">
              {PESSOA_VINCULO_LABELS[person.vinculo]}
            </span>
            <strong className="mt-1 block truncate text-sm">{person.nome}</strong>
            {person.apelido ? (
              <span className="block truncate text-xs text-muted-foreground">
                Conhecido como {person.apelido}
              </span>
            ) : null}
          </div>
        </div>
      </header>
      <div className="flex-1 divide-y divide-border px-5">
        <div className="py-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Telefone
          </span>
          <span className="mt-1.5 flex items-center gap-2 text-sm font-semibold">
            <Phone className="h-3.5 w-3.5 text-operational" />
            {person.telefone || "Não informado"}
          </span>
        </div>
        <div className="py-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Endereço
          </span>
          <strong className="mt-1.5 block text-sm">{formatAddress(person)}</strong>
          <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {person.endereco?.bairro ?? "Bairro não informado"}
          </span>
        </div>
        <div className="py-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Progresso até o local
          </span>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <RouteIcon className="h-3.5 w-3.5 text-operational" />
            {!routeVisible ? (
              <span className="text-muted-foreground">Rota oculta</span>
            ) : routeState === "loading" ? (
              <span className="text-muted-foreground">Calculando trajeto viário...</span>
            ) : routeState === "ready" && route ? (
              <strong>
                {(route.distanceMeters / 1000).toLocaleString("pt-BR", {
                  maximumFractionDigits: 1,
                })}{" "}
                km • {Math.max(1, Math.round(route.durationSeconds / 60))} min a partir da Delegacia
              </strong>
            ) : routeState === "error" ? (
              <span className="text-muted-foreground">Rota indisponível para este ponto</span>
            ) : (
              <span className="text-muted-foreground">Sem rota calculada</span>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-border p-4">
        <button
          type="button"
          onClick={onToggleRoute}
          className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-operational px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--operational-contrast)] hover:opacity-90"
        >
          <RouteIcon className="h-4 w-4" /> {routeVisible ? "Ocultar rota" : "Mostrar rota"}
        </button>
        <button
          type="button"
          onClick={onViewDetails}
          className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-success/60 bg-success/10 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-success hover:bg-success/20"
        >
          <Eye className="h-4 w-4" /> Ver dados completos
        </button>
      </div>
    </aside>
  );
}
