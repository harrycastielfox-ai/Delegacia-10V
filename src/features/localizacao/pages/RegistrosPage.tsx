import { Camera, MapPin, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getDiligenciaById, listDiligenciasPage } from "@/lib/repositories/localizacaoRepository";
import type { RegistroFotograficoRecord } from "../localizacaoTypes";

type PhotoItem = RegistroFotograficoRecord & { codigo: string };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

export default function RegistrosPage() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void listDiligenciasPage({ pageSize: 100 })
      .then(async (records) => {
        const details = await Promise.all(records.map((item) => getDiligenciaById(item.id)));
        if (cancelled) return;
        setPhotos(
          details.flatMap((detail) =>
            detail ? detail.fotos.map((photo) => ({ ...photo, codigo: detail.codigo })) : [],
          ),
        );
      })
      .catch((cause) => {
        console.error("[RegistrosPage] Falha ao carregar registros fotográficos", cause);
        if (!cancelled) setError("Não foi possível carregar os registros fotográficos.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return photos.filter(
      (photo) =>
        !term ||
        photo.codigo.toLocaleLowerCase("pt-BR").includes(term) ||
        photo.legenda?.toLocaleLowerCase("pt-BR").includes(term),
    );
  }, [photos, search]);

  return (
    <div>
      {error ? (
        <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <header className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-operational">
          Cadastros operacionais
        </p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">Registros fotográficos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Imagens produzidas pelas equipes durante as diligências.
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <label className="flex min-h-11 max-w-xl items-center gap-2 rounded-lg border border-border bg-background px-3 focus-within:border-operational/50">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por diligência ou legenda"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
        </div>
        {loading ? (
          <div className="py-24 text-center text-sm text-muted-foreground">
            Carregando registros...
          </div>
        ) : filtered.length ? (
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((photo) => (
              <article
                key={photo.id}
                className="overflow-hidden rounded-xl border border-border bg-background"
              >
                <div className="flex aspect-video items-center justify-center bg-muted text-muted-foreground">
                  <Camera className="h-10 w-10" />
                </div>
                <div className="p-4">
                  <span className="font-mono text-xs font-bold text-operational">
                    {photo.codigo}
                  </span>
                  <h2 className="mt-2 text-sm font-bold">
                    {photo.legenda ?? "Registro sem legenda"}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(photo.capturada_em)}
                  </p>
                  {photo.latitude !== null && photo.longitude !== null ? (
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-operational" />
                      {photo.latitude.toFixed(5)}, {photo.longitude.toFixed(5)}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
            <Camera className="h-9 w-9 text-muted-foreground" />
            <h2 className="mt-3 text-sm font-black">Nenhum registro fotográfico</h2>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
              As fotos anexadas às diligências aparecerão nesta galeria.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
