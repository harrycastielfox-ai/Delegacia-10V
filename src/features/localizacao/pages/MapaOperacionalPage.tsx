import { Link } from "@tanstack/react-router";
import { ListFilter, MapPinned, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { listDiligenciasPage } from "@/lib/repositories/localizacaoRepository";
import type { DiligenciaListRecord } from "../localizacaoTypes";
import { DiligenciaStatusBadge } from "../components/DiligenciaStatusBadge";
import { MapaCanvas } from "../components/MapaCanvas";
import { OperacaoPanel } from "../components/OperacaoPanel";

export default function MapaOperacionalPage() {
  const [diligencias, setDiligencias] = useState<DiligenciaListRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void listDiligenciasPage({ pageSize: 50 })
      .then((records) => {
        if (cancelled) return;
        setDiligencias(records);
        setSelectedId(records[0]?.id ?? null);
      })
      .catch((cause) => {
        console.error("[MapaOperacionalPage] Falha ao carregar o mapa", cause);
        if (!cancelled) setError("Não foi possível carregar as diligências do mapa.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = diligencias.find((item) => item.id === selectedId) ?? null;

  return (
    <div>
      {error ? (
        <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-operational">
            Inteligência territorial
          </p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Mapa operacional</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualize diligências, equipes e trajetos ativos.
          </p>
        </div>
        <Link
          to="/localizacao/diligencias/nova"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-operational px-4 py-2.5 text-sm font-bold text-[var(--operational-contrast)]"
        >
          <Plus className="h-4 w-4" /> Nova diligência
        </Link>
      </header>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.75fr)_360px]">
        {loading ? (
          <div className="flex min-h-[calc(100vh-190px)] items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground">
            Carregando mapa...
          </div>
        ) : (
          <MapaCanvas
            diligencias={diligencias}
            selectedId={selectedId}
            onSelect={(item) => setSelectedId(item.id)}
            className="min-h-[calc(100vh-190px)]"
          />
        )}

        <div className="space-y-4">
          <OperacaoPanel diligencia={selected} />
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <header className="flex items-center gap-2 border-b border-border px-4 py-3">
              <ListFilter className="h-4 w-4 text-operational" />
              <h2 className="text-xs font-bold uppercase tracking-wider">Diligências no mapa</h2>
            </header>
            <div className="max-h-72 overflow-y-auto p-2">
              {diligencias.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left ${
                    item.id === selectedId
                      ? "border-operational/40 bg-operational/10"
                      : "border-transparent hover:bg-accent"
                  }`}
                >
                  <MapPinned className="h-4 w-4 shrink-0 text-operational" />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-xs">{item.codigo}</strong>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {item.destino}
                    </span>
                  </span>
                  <DiligenciaStatusBadge status={item.status} />
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
