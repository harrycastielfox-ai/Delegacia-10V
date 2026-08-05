import { MapPin, Navigation, PersonStanding } from "lucide-react";
import { useEffect, useState } from "react";
import {
  buildMapDirectionsUrl,
  buildMapViewUrl,
  buildStreetViewEntryUrl,
  DEFAULT_ROUTE_ORIGIN,
  isDirectStreetViewUrl,
  type MapTarget,
} from "@/lib/mapLinks";
import { cn } from "@/lib/utils";

interface AbrirNoMapaProps {
  target: MapTarget;
  /** Link manual informado no cadastro, usado antes da busca automática por endereço. */
  urlManual?: string | null;
  /** Origem opcional da rota. Sem ela, a navegação parte da posição do aparelho. */
  origem?: MapTarget;
  /** Oculta o botão de rota quando só faz sentido visualizar o ponto. */
  mostrarRota?: boolean;
  /** Street View só aparece quando o alvo tem coordenada. */
  mostrarStreetView?: boolean;
  size?: "sm" | "md";
  className?: string;
}

let automaticOriginPromise: Promise<MapTarget | undefined> | null = null;

function getAutomaticRouteOrigin(): Promise<MapTarget | undefined> {
  if (automaticOriginPromise) return automaticOriginPromise;

  automaticOriginPromise = (async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return DEFAULT_ROUTE_ORIGIN;
    }

    try {
      if (!navigator.permissions) return undefined;
      const permission = await navigator.permissions.query({ name: "geolocation" });
      if (permission.state === "denied") return DEFAULT_ROUTE_ORIGIN;
      if (permission.state !== "granted") return undefined;

      return await new Promise<MapTarget>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) =>
            resolve({ latitude: coords.latitude, longitude: coords.longitude, cidade: null }),
          () => resolve(DEFAULT_ROUTE_ORIGIN),
          { enableHighAccuracy: true, maximumAge: 60_000, timeout: 4_000 },
        );
      });
    } catch {
      return undefined;
    }
  })();

  return automaticOriginPromise;
}

export function AbrirNoMapa({
  target,
  urlManual,
  origem,
  mostrarRota = true,
  mostrarStreetView = true,
  size = "sm",
  className,
}: AbrirNoMapaProps) {
  const [automaticOrigin, setAutomaticOrigin] = useState<MapTarget | undefined>();

  useEffect(() => {
    if (!mostrarRota || origem) return;
    let active = true;
    void getAutomaticRouteOrigin().then((value) => {
      if (active) setAutomaticOrigin(value);
    });
    return () => {
      active = false;
    };
  }, [mostrarRota, origem]);

  const viewUrl = urlManual?.startsWith("http") ? urlManual : buildMapViewUrl(target);
  const rotaUrl = mostrarRota
    ? buildMapDirectionsUrl(target, { origin: origem ?? automaticOrigin })
    : null;
  const streetViewUrl = mostrarStreetView ? buildStreetViewEntryUrl(target, urlManual) : null;
  const streetViewIsDirect = isDirectStreetViewUrl(urlManual) || !target.endereco?.trim();

  if (!viewUrl && !rotaUrl && !streetViewUrl) return null;

  const base = cn(
    "inline-flex items-center gap-1.5 rounded-md border border-border bg-background font-semibold",
    "text-muted-foreground transition-colors hover:border-info/40 hover:bg-accent hover:text-info",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info",
    size === "sm" ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs",
  );
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {viewUrl ? (
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={base}
          title="Abrir o local no Google Maps"
        >
          <MapPin className={iconSize} /> Ver no mapa
        </a>
      ) : null}

      {rotaUrl ? (
        <a
          href={rotaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={base}
          title="Traçar rota usando o GPS; se indisponível, partir da Delegacia Territorial de Itabela"
        >
          <Navigation className={iconSize} /> Traçar rota
        </a>
      ) : null}

      {streetViewUrl ? (
        <a
          href={streetViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={base}
          title={
            streetViewIsDirect
              ? "Abrir o Street View no ponto informado"
              : "Abrir o endereço exato no Google Maps para acessar o Street View"
          }
        >
          <PersonStanding className={iconSize} /> Street View
        </a>
      ) : null}
    </div>
  );
}
