import type { LatLngExpression, LayerGroup, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Building2,
  LocateFixed,
  LoaderCircle,
  MapPin,
  MapPinned,
  Route,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_ROUTE_ORIGIN } from "@/lib/mapLinks";
import {
  getPessoaPhotoSignedUrl,
  listMapaEnderecos,
  listMapaPessoasPorEnderecos,
} from "@/lib/repositories/localizacaoRepository";
import { fetchDrivingRoute, type RoadRoute } from "@/lib/roadRouting";
import {
  BAIRROS_OPERACIONAIS_ITABELA,
  encontrarBairroOperacional,
  normalizarChaveBairro,
} from "../localizacaoConstants";
import type {
  DiligenciaListRecord,
  MapaEnderecoRecord,
  MapaPessoaRecord,
} from "../localizacaoTypes";

const ITABELA_CENTER: LatLngExpression = [-16.57257, -39.56629];
const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const WITHOUT_NEIGHBORHOOD = "__sem_bairro__";
const SHOW_PEOPLE_AT_ZOOM = 17;

interface TerritoryScope {
  kind: "bairro" | "endereco" | "area";
  label: string;
  addressIds: string[];
}

interface NeighborhoodGroup {
  key: string;
  label: string;
  addresses: MapaEnderecoRecord[];
  mappedAddresses: MapaEnderecoRecord[];
  center: [number, number] | null;
}

function hasCoordinates(
  address: MapaEnderecoRecord,
): address is MapaEnderecoRecord & { latitude: number; longitude: number } {
  return (
    typeof address.latitude === "number" &&
    typeof address.longitude === "number" &&
    Number.isFinite(address.latitude) &&
    Number.isFinite(address.longitude) &&
    Math.abs(address.latitude) <= 90 &&
    Math.abs(address.longitude) <= 180 &&
    !(address.latitude === 0 && address.longitude === 0)
  );
}

function normalizeNeighborhood(value: string | null) {
  const label = value?.replace(/\s+/g, " ").trim();
  if (!label) return { key: WITHOUT_NEIGHBORHOOD, label: "Bairro não informado" };
  const canonical = encontrarBairroOperacional(label);
  return canonical
    ? { key: normalizarChaveBairro(canonical.nome), label: canonical.nome }
    : { key: normalizarChaveBairro(label), label };
}

function groupNeighborhoods(addresses: MapaEnderecoRecord[]): NeighborhoodGroup[] {
  const groups = new Map<
    string,
    {
      label: string;
      addresses: MapaEnderecoRecord[];
      catalogCenter: readonly [number, number] | null;
    }
  >();

  BAIRROS_OPERACIONAIS_ITABELA.forEach((bairro) => {
    groups.set(normalizarChaveBairro(bairro.nome), {
      label: bairro.nome,
      addresses: [],
      catalogCenter: bairro.centro,
    });
  });

  addresses.forEach((address) => {
    const neighborhood = normalizeNeighborhood(address.bairro);
    const current = groups.get(neighborhood.key) ?? {
      label: neighborhood.label,
      addresses: [],
      catalogCenter: null,
    };
    current.addresses.push(address);
    groups.set(neighborhood.key, current);
  });

  return Array.from(groups, ([key, group]) => {
    const mappedAddresses = group.addresses.filter(hasCoordinates);
    const center: [number, number] | null = mappedAddresses.length
      ? [
          mappedAddresses.reduce((sum, item) => sum + item.latitude, 0) / mappedAddresses.length,
          mappedAddresses.reduce((sum, item) => sum + item.longitude, 0) / mappedAddresses.length,
        ]
      : group.catalogCenter
        ? [group.catalogCenter[0], group.catalogCenter[1]]
        : null;
    return { key, label: group.label, addresses: group.addresses, mappedAddresses, center };
  }).sort((a, b) => {
    if (a.key === WITHOUT_NEIGHBORHOOD) return 1;
    if (b.key === WITHOUT_NEIGHBORHOOD) return -1;
    return a.label.localeCompare(b.label, "pt-BR");
  });
}

function formatAddress(address: MapaEnderecoRecord | null) {
  if (!address) return "Endereço não informado";
  const number = address.sem_numero ? "s/n" : (address.numero ?? "s/n");
  return `${address.logradouro}, ${number}`;
}

function createSafeTooltip(title: string, subtitle: string) {
  const element = document.createElement("div");
  element.className = "sipi-map-tooltip";
  const strong = document.createElement("strong");
  strong.textContent = title;
  const small = document.createElement("span");
  small.textContent = subtitle;
  element.append(strong, small);
  return element;
}

function sameScope(previous: TerritoryScope | null, next: TerritoryScope) {
  return (
    previous?.kind === next.kind &&
    previous.label === next.label &&
    previous.addressIds.join(",") === next.addressIds.join(",")
  );
}

export function MapaCanvas({
  diligencias,
  selectedId,
  onSelect,
  routeVisible: controlledRouteVisible,
  onRouteVisibleChange,
  showRouteToggle = true,
  className = "",
}: {
  diligencias: DiligenciaListRecord[];
  selectedId?: string | null;
  onSelect?: (diligencia: DiligenciaListRecord) => void;
  routeVisible?: boolean;
  onRouteVisibleChange?: (visible: boolean) => void;
  showRouteToggle?: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const neighborhoodLayerRef = useRef<LayerGroup | null>(null);
  const addressLayerRef = useRef<LayerGroup | null>(null);
  const diligenceLayerRef = useRef<LayerGroup | null>(null);
  const routeLayerRef = useRef<LayerGroup | null>(null);
  const addressesRef = useRef<MapaEnderecoRecord[]>([]);
  const selectionLockedRef = useRef(false);
  const refreshViewportRef = useRef<() => void>(() => undefined);
  const syncZoomLayersRef = useRef<() => void>(() => undefined);
  const initialFitDoneRef = useRef(false);

  const [mapReady, setMapReady] = useState(false);
  const [addresses, setAddresses] = useState<MapaEnderecoRecord[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [mapError, setMapError] = useState("");
  const [zoom, setZoom] = useState(14);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [scope, setScope] = useState<TerritoryScope | null>(null);
  const [people, setPeople] = useState<MapaPessoaRecord[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState("");
  const [internalRouteVisible, setInternalRouteVisible] = useState(true);
  const [route, setRoute] = useState<RoadRoute | null>(null);
  const [routeState, setRouteState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const routeVisible = controlledRouteVisible ?? internalRouteVisible;
  const neighborhoods = useMemo(() => groupNeighborhoods(addresses), [addresses]);
  const namedNeighborhoods = neighborhoods.filter((item) => item.key !== WITHOUT_NEIGHBORHOOD);
  const mappedAddresses = useMemo(() => addresses.filter(hasCoordinates), [addresses]);
  const mappedTerritoryPoints = useMemo(
    () => neighborhoods.flatMap((item) => (item.center ? [item.center] : [])),
    [neighborhoods],
  );
  const scopeAddresses = useMemo(() => {
    if (!scope) return [];
    const ids = new Set(scope.addressIds);
    return addresses.filter((item) => ids.has(item.id));
  }, [addresses, scope]);
  const selectedDiligence = diligencias.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    let cancelled = false;
    setAddressesLoading(true);
    void listMapaEnderecos()
      .then((records) => {
        if (!cancelled) setAddresses(records);
      })
      .catch((cause) => {
        console.error("[MapaCanvas] Falha ao carregar endereços", cause);
        if (!cancelled) setMapError("Não foi possível carregar os bairros cadastrados.");
      })
      .finally(() => {
        if (!cancelled) setAddressesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    addressesRef.current = addresses;
  }, [addresses]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    let leafletMap: LeafletMap | null = null;

    void import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, {
        center: ITABELA_CENTER,
        zoom: 14,
        minZoom: 12,
        maxZoom: 19,
        zoomControl: false,
        preferCanvas: true,
      });
      leafletMap = map;
      L.tileLayer(OSM_TILE_URL, {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      }).addTo(map);
      L.control
        .zoom({ position: "topleft", zoomInTitle: "Aproximar", zoomOutTitle: "Afastar" })
        .addTo(map);
      L.control.scale({ position: "bottomright", imperial: false, maxWidth: 110 }).addTo(map);
      map.attributionControl.setPrefix(false);

      neighborhoodLayerRef.current = L.layerGroup().addTo(map);
      addressLayerRef.current = L.layerGroup();
      diligenceLayerRef.current = L.layerGroup().addTo(map);
      routeLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setMapReady(true);

      const onViewportChange = () => {
        setZoom(map.getZoom());
        syncZoomLayersRef.current();
        refreshViewportRef.current();
      };
      map.on("zoomend moveend", onViewportChange);
      map.on("click", () => {
        selectionLockedRef.current = false;
        setDirectoryOpen(false);
        refreshViewportRef.current();
      });

      window.setTimeout(() => map.invalidateSize({ animate: false }), 0);
    });

    return () => {
      cancelled = true;
      leafletMap?.off();
      leafletMap?.remove();
      leafletRef.current = null;
      mapRef.current = null;
      neighborhoodLayerRef.current = null;
      addressLayerRef.current = null;
      diligenceLayerRef.current = null;
      routeLayerRef.current = null;
    };
  }, []);

  const openNeighborhood = useCallback((group: NeighborhoodGroup) => {
    selectionLockedRef.current = true;
    setDirectoryOpen(false);
    setScope({
      kind: "bairro",
      label: group.label,
      addressIds: group.addresses.map((item) => item.id),
    });
    if (group.center) mapRef.current?.flyTo(group.center, Math.max(16, mapRef.current.getZoom()));
  }, []);

  refreshViewportRef.current = () => {
    const map = mapRef.current;
    if (!map || selectionLockedRef.current) return;
    if (map.getZoom() < SHOW_PEOPLE_AT_ZOOM) {
      setScope(null);
      return;
    }

    const bounds = map.getBounds();
    const visible = addressesRef.current.filter(
      (address) =>
        hasCoordinates(address) && bounds.contains([address.latitude, address.longitude]),
    );
    const next: TerritoryScope = {
      kind: "area",
      label: "Pessoas nesta área",
      addressIds: visible.map((item) => item.id).sort(),
    };
    setScope((previous) => (sameScope(previous, next) ? previous : next));
  };

  syncZoomLayersRef.current = () => {
    const map = mapRef.current;
    const neighborhoodLayer = neighborhoodLayerRef.current;
    const addressLayer = addressLayerRef.current;
    if (!map || !neighborhoodLayer || !addressLayer) return;
    const showAddresses = map.getZoom() >= 17;
    if (showAddresses) {
      if (map.hasLayer(neighborhoodLayer)) map.removeLayer(neighborhoodLayer);
      if (!map.hasLayer(addressLayer)) map.addLayer(addressLayer);
    } else {
      if (map.hasLayer(addressLayer)) map.removeLayer(addressLayer);
      if (!map.hasLayer(neighborhoodLayer)) map.addLayer(neighborhoodLayer);
    }
  };

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    const neighborhoodLayer = neighborhoodLayerRef.current;
    const addressLayer = addressLayerRef.current;
    if (!mapReady || !L || !map || !neighborhoodLayer || !addressLayer) return;

    neighborhoodLayer.clearLayers();
    addressLayer.clearLayers();

    neighborhoods.forEach((group) => {
      if (!group.center) return;
      const marker = L.marker(group.center, {
        icon: L.divIcon({
          className: "sipi-neighborhood-marker",
          html: `<span>${group.addresses.length}</span>`,
          iconSize: [42, 42],
          iconAnchor: [21, 21],
        }),
        keyboard: true,
        title: group.label,
        zIndexOffset: 100,
      });
      marker.bindTooltip(
        createSafeTooltip(
          group.label,
          `${group.addresses.length} endereço${group.addresses.length === 1 ? "" : "s"}`,
        ),
        { direction: "top", offset: [0, -18] },
      );
      marker.on("click", () => openNeighborhood(group));
      marker.addTo(neighborhoodLayer);
    });

    mappedAddresses.forEach((address) => {
      const marker = L.circleMarker([address.latitude, address.longitude], {
        radius: 7,
        color: "#22d3ee",
        weight: 2,
        fillColor: "#07151b",
        fillOpacity: 0.95,
      });
      marker.bindTooltip(
        createSafeTooltip(formatAddress(address), address.bairro ?? "Bairro não informado"),
        { direction: "top", offset: [0, -8] },
      );
      marker.on("click", () => {
        selectionLockedRef.current = true;
        setDirectoryOpen(false);
        setScope({ kind: "endereco", label: formatAddress(address), addressIds: [address.id] });
      });
      marker.addTo(addressLayer);
    });

    syncZoomLayersRef.current();
    if (!initialFitDoneRef.current && mappedTerritoryPoints.length) {
      initialFitDoneRef.current = true;
      const bounds = L.latLngBounds(mappedTerritoryPoints);
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.25), { maxZoom: 16, animate: false });
    }
  }, [mapReady, mappedAddresses, mappedTerritoryPoints, neighborhoods, openNeighborhood]);

  useEffect(() => {
    const L = leafletRef.current;
    const layer = diligenceLayerRef.current;
    if (!mapReady || !L || !layer) return;
    layer.clearLayers();

    const central = L.marker([DEFAULT_ROUTE_ORIGIN.latitude!, DEFAULT_ROUTE_ORIGIN.longitude!], {
      icon: L.divIcon({
        className: "sipi-central-marker",
        html: "<span>DT</span>",
        iconSize: [46, 46],
        iconAnchor: [23, 23],
      }),
      keyboard: true,
      title: "Delegacia Territorial de Itabela",
      zIndexOffset: 700,
    });
    central.bindTooltip(
      createSafeTooltip(
        "Delegacia Territorial de Itabela",
        "Central operacional • Rua Castro Alves, 253",
      ),
      { direction: "top", offset: [0, -20] },
    );
    central.on("click", () => {
      mapRef.current?.flyTo([DEFAULT_ROUTE_ORIGIN.latitude!, DEFAULT_ROUTE_ORIGIN.longitude!], 18);
    });
    central.addTo(layer);

    diligencias.forEach((diligence, index) => {
      if (
        typeof diligence.latitude !== "number" ||
        typeof diligence.longitude !== "number" ||
        !Number.isFinite(diligence.latitude) ||
        !Number.isFinite(diligence.longitude)
      ) {
        return;
      }
      const selected = diligence.id === selectedId;
      const marker = L.marker([diligence.latitude, diligence.longitude], {
        icon: L.divIcon({
          className: `sipi-diligence-marker${selected ? " is-selected" : ""}`,
          html: `<span>${index + 1}</span>`,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        }),
        keyboard: true,
        title: diligence.codigo,
        zIndexOffset: selected ? 500 : 300,
      });
      marker.bindTooltip(createSafeTooltip(diligence.codigo, diligence.destino), {
        direction: "top",
        offset: [0, -17],
      });
      marker.on("click", () => {
        onSelect?.(diligence);
        mapRef.current?.flyTo([diligence.latitude!, diligence.longitude!], 17);
      });
      marker.addTo(layer);
    });
  }, [diligencias, mapReady, onSelect, selectedId]);

  useEffect(() => {
    if (!scope?.addressIds.length) {
      setPeople([]);
      setPeopleError("");
      return;
    }
    let cancelled = false;
    setPeopleLoading(true);
    setPeopleError("");
    void listMapaPessoasPorEnderecos(scope.addressIds)
      .then((records) => {
        if (!cancelled) setPeople(records);
      })
      .catch((cause) => {
        console.error("[MapaCanvas] Falha ao carregar pessoas da área", cause);
        if (!cancelled) setPeopleError("Não foi possível carregar os perfis desta área.");
      })
      .finally(() => {
        if (!cancelled) setPeopleLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  useEffect(() => {
    if (
      !routeVisible ||
      !selectedDiligence ||
      typeof selectedDiligence.latitude !== "number" ||
      typeof selectedDiligence.longitude !== "number"
    ) {
      setRoute(null);
      setRouteState("idle");
      return;
    }
    const controller = new AbortController();
    setRouteState("loading");
    void fetchDrivingRoute(
      {
        latitude: DEFAULT_ROUTE_ORIGIN.latitude!,
        longitude: DEFAULT_ROUTE_ORIGIN.longitude!,
      },
      { latitude: selectedDiligence.latitude, longitude: selectedDiligence.longitude },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        setRoute(result);
        setRouteState(result ? "ready" : "error");
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        console.error("[MapaCanvas] Falha ao calcular rota viária", cause);
        setRoute(null);
        setRouteState("error");
      });
    return () => controller.abort();
  }, [routeVisible, selectedDiligence]);

  useEffect(() => {
    const L = leafletRef.current;
    const layer = routeLayerRef.current;
    if (!mapReady || !L || !layer) return;
    layer.clearLayers();
    if (!routeVisible || !route) return;

    const points = route.points.map(
      (point) => [point.latitude, point.longitude] as [number, number],
    );
    const shadow = L.polyline(points, {
      color: "#041014",
      opacity: 0.8,
      weight: 9,
      lineJoin: "round",
    });
    const line = L.polyline(points, {
      color: "#22d3ee",
      opacity: 0.95,
      weight: 4,
      lineJoin: "round",
      className: "sipi-route-line",
    });
    shadow.addTo(layer);
    line.addTo(layer);
  }, [mapReady, route, routeVisible]);

  function toggleRoute() {
    const next = !routeVisible;
    setInternalRouteVisible(next);
    onRouteVisibleChange?.(next);
  }

  function closeTerritoryPanel() {
    selectionLockedRef.current = false;
    setDirectoryOpen(false);
    setScope(null);
  }

  const panelOpen = directoryOpen || scope !== null;

  return (
    <div
      className={`localizacao-real-map relative min-h-[440px] overflow-hidden rounded-xl border border-border bg-[var(--operational-map)] ${className}`}
      aria-label="Mapa territorial interativo de Itabela"
    >
      <div ref={containerRef} className="absolute inset-0" />

      <button
        type="button"
        onClick={() => {
          setDirectoryOpen(true);
          selectionLockedRef.current = true;
        }}
        className="absolute right-3 top-3 z-[900] flex max-w-[calc(100%-4.5rem)] items-center gap-3 rounded-xl border border-operational/35 bg-background/92 px-3 py-2 text-left shadow-2xl backdrop-blur transition hover:border-operational/70"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-operational/12 text-operational">
          <Building2 className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <strong className="block text-[11px] uppercase tracking-wider">
            {addressesLoading ? "Carregando território" : `${namedNeighborhoods.length} bairros`}
          </strong>
          <span className="block truncate text-[10px] text-muted-foreground">
            {addresses.length} endereços • {mappedAddresses.length} posicionados
          </span>
        </span>
      </button>

      {mapError ? (
        <p className="absolute left-14 top-3 z-[900] rounded-lg border border-destructive/30 bg-background/95 px-3 py-2 text-xs text-destructive shadow-xl">
          {mapError}
        </p>
      ) : null}

      {panelOpen ? (
        <aside className="absolute bottom-3 right-3 top-[76px] z-[1000] flex w-[min(340px,calc(100%-1.5rem))] flex-col overflow-hidden rounded-xl border border-operational/35 bg-background/96 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-right-3 duration-200">
          <header className="flex items-start justify-between gap-3 border-b border-border p-4">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-operational">
                {directoryOpen ? "Território cadastrado" : "Perfis localizados"}
              </p>
              <h2 className="mt-1 truncate text-sm font-black">
                {directoryOpen ? "Bairros e endereços" : scope?.label}
              </h2>
              {!directoryOpen && scope ? (
                <span className="mt-1 block text-[10px] text-muted-foreground">
                  {scope.addressIds.length} endereço{scope.addressIds.length === 1 ? "" : "s"} nesta
                  seleção
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={closeTerritoryPanel}
              aria-label="Fechar painel territorial"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-operational/40 hover:text-operational"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {!directoryOpen && scope ? <ScopeAddressList addresses={scopeAddresses} /> : null}
            {directoryOpen ? (
              <div className="space-y-2">
                {neighborhoods.length ? (
                  neighborhoods.map((group) => (
                    <button
                      key={group.key}
                      type="button"
                      onClick={() => openNeighborhood(group)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card/70 p-3 text-left transition hover:border-operational/45 hover:bg-operational/5"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-operational/25 bg-operational/10 text-operational">
                        <MapPinned className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-xs">{group.label}</strong>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">
                          {group.addresses.length} endereço{group.addresses.length === 1 ? "" : "s"}
                        </span>
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-[8px] font-bold uppercase ${
                          group.center ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                        }`}
                      >
                        {group.center ? "No mapa" : "Sem coordenadas"}
                      </span>
                    </button>
                  ))
                ) : (
                  <EmptyTerritory />
                )}
                {addresses.some((item) => !item.bairro?.trim()) ? (
                  <p className="rounded-lg border border-warning/25 bg-warning/5 p-3 text-[10px] leading-relaxed text-muted-foreground">
                    Endereços sem bairro continuam acessíveis, mas não recebem um nome territorial
                    inventado. Complete o bairro no cadastro para ele aparecer como uma área
                    própria.
                  </p>
                ) : null}
              </div>
            ) : peopleLoading ? (
              <div className="flex min-h-40 items-center justify-center gap-2 text-xs text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin text-operational" /> Carregando
                perfis...
              </div>
            ) : peopleError ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                {peopleError}
              </p>
            ) : people.length ? (
              <div className="space-y-2">
                {people.map((person) => (
                  <PersonMapCard key={person.id} person={person} />
                ))}
                {people.length >= 80 ? (
                  <p className="px-2 py-1 text-[10px] text-muted-foreground">
                    Exibindo os 80 primeiros cadastros desta área. Aproxime o mapa para refinar.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-border p-5 text-center">
                <UsersRound className="h-7 w-7 text-muted-foreground" />
                <strong className="mt-3 text-xs">Nenhuma pessoa vinculada</strong>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                  O bairro está no mapa, mas ainda não possui pessoa ligada a estes endereços.
                </p>
              </div>
            )}
          </div>
        </aside>
      ) : null}

      <div className="absolute bottom-3 left-3 z-[900] flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2">
        {showRouteToggle ? (
          <button
            type="button"
            onClick={toggleRoute}
            className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-[10px] font-bold uppercase tracking-wider shadow-xl backdrop-blur transition ${
              routeVisible
                ? "border-operational bg-operational text-[var(--operational-contrast)]"
                : "border-operational/40 bg-background/92 text-operational"
            }`}
          >
            <Route className="h-4 w-4" /> {routeVisible ? "Ocultar rota" : "Mostrar rota"}
          </button>
        ) : null}

        <span className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background/92 px-3 text-[10px] text-muted-foreground shadow-xl backdrop-blur">
          {routeState === "loading" ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin text-operational" />
          ) : routeState === "ready" ? (
            <Route className="h-3.5 w-3.5 text-operational" />
          ) : (
            <LocateFixed className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          {routeState === "loading"
            ? "Calculando trajeto viário..."
            : routeState === "ready" && route
              ? `${(route.distanceMeters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km • ${Math.max(1, Math.round(route.durationSeconds / 60))} min`
              : routeState === "error"
                ? "Rota indisponível para este ponto"
                : zoom >= SHOW_PEOPLE_AT_ZOOM
                  ? "Perfis da área visível"
                  : "Aproxime para ver pessoas"}
        </span>
      </div>
    </div>
  );
}

function PersonMapCard({ person }: { person: MapaPessoaRecord }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getPessoaPhotoSignedUrl(person.foto_perfil_path, "thumbnail").then((url) => {
      if (!cancelled) setPhotoUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [person.foto_perfil_path]);

  return (
    <article className="flex gap-3 rounded-xl border border-border bg-card/80 p-3">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-operational/30 bg-operational/10 text-operational">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={`Foto de ${person.nome}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <UserRound className="h-6 w-6" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <strong className="truncate text-xs">{person.nome}</strong>
          <i className="rounded-full bg-operational/10 px-1.5 py-0.5 text-[7px] font-black uppercase not-italic text-operational">
            {person.vinculo}
          </i>
        </span>
        {person.apelido ? (
          <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
            Conhecido como {person.apelido}
          </span>
        ) : null}
        <span className="mt-2 flex items-start gap-1.5 border-t border-border pt-2 text-[10px] leading-relaxed text-foreground/85">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-operational" />
          <span>
            {formatAddress(person.endereco)}
            <small className="block text-[9px] text-muted-foreground">
              {person.endereco?.bairro ?? "Bairro não informado"}
            </small>
          </span>
        </span>
      </span>
    </article>
  );
}

function ScopeAddressList({ addresses }: { addresses: MapaEnderecoRecord[] }) {
  const uniqueAddresses = Array.from(
    new Map(addresses.map((address) => [formatAddress(address), address])).values(),
  );

  return (
    <section className="mb-3 rounded-xl border border-operational/25 bg-operational/5 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <strong className="text-[9px] font-black uppercase tracking-[0.16em] text-operational">
          Ruas e endereços
        </strong>
        <span className="text-[9px] text-muted-foreground">{uniqueAddresses.length}</span>
      </div>
      {uniqueAddresses.length ? (
        <div className="space-y-1.5">
          {uniqueAddresses.slice(0, 12).map((address) => (
            <span
              key={address.id}
              className="flex items-start gap-2 rounded-lg border border-border/70 bg-background/70 px-2.5 py-2 text-[10px]"
            >
              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-operational" />
              <span className="min-w-0">
                <strong className="block truncate font-semibold">{formatAddress(address)}</strong>
                <small className="text-[9px] text-muted-foreground">
                  {address.bairro ?? "Bairro não informado"} • {address.municipio}/{address.uf}
                </small>
              </span>
            </span>
          ))}
          {uniqueAddresses.length > 12 ? (
            <span className="block px-2 pt-1 text-[9px] text-muted-foreground">
              + {uniqueAddresses.length - 12} endereços. Aproxime o mapa para refinar a área.
            </span>
          ) : null}
        </div>
      ) : (
        <span className="text-[10px] text-muted-foreground">Nenhuma rua nesta área visível.</span>
      )}
    </section>
  );
}

function EmptyTerritory() {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border p-5 text-center">
      <MapPinned className="h-7 w-7 text-muted-foreground" />
      <strong className="mt-3 text-xs">Nenhum endereço cadastrado</strong>
      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
        Os bairros aparecerão automaticamente após o primeiro endereço ser salvo.
      </p>
    </div>
  );
}
