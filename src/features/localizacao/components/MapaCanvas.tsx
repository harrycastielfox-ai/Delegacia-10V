import { Link } from "@tanstack/react-router";
import type { LatLngExpression, LayerGroup, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Building2,
  ClipboardList,
  House,
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
  getBairroPainel,
  getPessoaPhotoSignedUrl,
  listBairrosOperacionais,
  listMapaEnderecos,
  listMapaPessoasPorEnderecos,
  listReferencias,
} from "@/lib/repositories/localizacaoRepository";
import { fetchDrivingRoute, type RoadRoute } from "@/lib/roadRouting";
import {
  BAIRROS_OPERACIONAIS_ITABELA,
  encontrarBairroOperacional,
  normalizarChaveBairro,
} from "../localizacaoConstants";
import type {
  BairroOperacionalRecord,
  BairroPainelRecord,
  DiligenciaListRecord,
  MapaEnderecoRecord,
  MapaPessoaRecord,
  ReferenciaRecord,
} from "../localizacaoTypes";
import { DiligenciaStatusBadge } from "./DiligenciaStatusBadge";

const ITABELA_CENTER: LatLngExpression = [-16.57257, -39.56629];
const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const WITHOUT_NEIGHBORHOOD = "__sem_bairro__";
const PENDING_NEIGHBORHOOD = "__bairro_pendente__";
const UNIDENTIFIED_NEIGHBORHOOD = "__bairro_nao_identificado__";
const SHOW_PEOPLE_AT_ZOOM = 17;
/** Só as âncoras da cidade (hospital, terminal, praça, órgão público). */
const SHOW_REFERENCES_AT_ZOOM = 16;
/** Demais referências: escola, igreja, mercado, comércio. */
const SHOW_ALL_REFERENCES_AT_ZOOM = 18;
/** Nome escrito ao lado do ponto. */
const SHOW_REFERENCE_NAMES_AT_ZOOM = 18;
/** Teto de fotos resolvidas por vez: cada uma é um link assinado no Storage. */
const MAX_FOTOS_NO_MAPA = 80;

/** Dados mínimos para desenhar o morador sobre o endereço. */
type MarcadorPessoa = {
  id: string;
  nome: string;
  apelido: string | null;
  vinculo: string;
  fotoUrl: string | null;
  iniciais: string;
};

function iniciaisDe(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  const primeira = partes[0][0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1][0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}
const FALLBACK_TERRITORY: BairroOperacionalRecord[] = BAIRROS_OPERACIONAIS_ITABELA.map(
  (bairro, index) => ({
    id: `fallback-${index + 1}`,
    nome: bairro.nome,
    chave: normalizarChaveBairro(bairro.nome).replace(/\s+/g, "-"),
    aliases: [...bairro.aliases],
    municipio: "Itabela",
    uf: "BA",
    ordem: index + 1,
    centro_latitude: bairro.centro?.[0] ?? null,
    centro_longitude: bairro.centro?.[1] ?? null,
    limite_geojson: null,
    posicao_confirmada: bairro.centro !== null,
    fonte: null,
    ativo: true,
  }),
);

interface TerritoryScope {
  kind: "bairro" | "endereco" | "area";
  label: string;
  bairroId: string | null;
  addressIds: string[];
}

interface NeighborhoodGroup {
  key: string;
  bairroId: string | null;
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

function normalizeNeighborhood(value: string | null, catalog: BairroOperacionalRecord[]) {
  const label = value?.replace(/\s+/g, " ").trim();
  if (!label) return { key: WITHOUT_NEIGHBORHOOD, label: "Bairro não informado" };
  const normalized = normalizarChaveBairro(label);
  const databaseNeighborhood = catalog.find((bairro) =>
    [bairro.nome, ...bairro.aliases].some(
      (candidate) => normalizarChaveBairro(candidate) === normalized,
    ),
  );
  const canonical = databaseNeighborhood ?? encontrarBairroOperacional(label);
  return canonical
    ? { key: normalizarChaveBairro(canonical.nome), label: canonical.nome }
    : { key: normalizarChaveBairro(label), label };
}

function groupNeighborhoods(
  addresses: MapaEnderecoRecord[],
  catalog: BairroOperacionalRecord[],
): NeighborhoodGroup[] {
  const catalogOrder = new Map(
    catalog.map((bairro, index) => [normalizarChaveBairro(bairro.nome), index]),
  );
  const groups = new Map<
    string,
    {
      label: string;
      bairroId: string | null;
      addresses: MapaEnderecoRecord[];
      catalogCenter: readonly [number, number] | null;
    }
  >();

  catalog.forEach((bairro) => {
    const catalogCenter =
      bairro.centro_latitude !== null && bairro.centro_longitude !== null
        ? ([bairro.centro_latitude, bairro.centro_longitude] as const)
        : null;
    groups.set(normalizarChaveBairro(bairro.nome), {
      label: bairro.nome,
      bairroId: bairro.id,
      addresses: [],
      catalogCenter,
    });
  });

  addresses.forEach((address) => {
    const linkedNeighborhood = address.bairro_id
      ? catalog.find((bairro) => bairro.id === address.bairro_id)
      : null;
    const neighborhood = linkedNeighborhood
      ? {
          key: normalizarChaveBairro(linkedNeighborhood.nome),
          label: linkedNeighborhood.nome,
        }
      : address.bairro_status === "pendente"
        ? { key: PENDING_NEIGHBORHOOD, label: "Classificação pendente" }
        : address.bairro_status === "nao_identificado"
          ? { key: UNIDENTIFIED_NEIGHBORHOOD, label: "Bairro não identificado" }
          : normalizeNeighborhood(address.bairro, catalog);
    const current = groups.get(neighborhood.key) ?? {
      label: neighborhood.label,
      bairroId: linkedNeighborhood?.id ?? null,
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
    return {
      key,
      bairroId: group.bairroId,
      label: group.label,
      addresses: group.addresses,
      mappedAddresses,
      center,
    };
  }).sort((a, b) => {
    if (a.key === WITHOUT_NEIGHBORHOOD) return 1;
    if (b.key === WITHOUT_NEIGHBORHOOD) return -1;
    if (a.key === PENDING_NEIGHBORHOOD) return 1;
    if (b.key === PENDING_NEIGHBORHOOD) return -1;
    if (a.key === UNIDENTIFIED_NEIGHBORHOOD) return 1;
    if (b.key === UNIDENTIFIED_NEIGHBORHOOD) return -1;
    const aCatalogIndex = catalogOrder.get(a.key);
    const bCatalogIndex = catalogOrder.get(b.key);
    if (aCatalogIndex !== undefined && bCatalogIndex !== undefined) {
      return aCatalogIndex - bCatalogIndex;
    }
    if (aCatalogIndex !== undefined) return -1;
    if (bCatalogIndex !== undefined) return 1;
    return a.label.localeCompare(b.label, "pt-BR");
  });
}

function formatAddress(address: MapaEnderecoRecord | null) {
  if (!address) return "Endereço não informado";
  const number = address.sem_numero ? "s/n" : (address.numero ?? "s/n");
  return `${address.logradouro}, ${number}`;
}

/**
 * Rótulo do bairro no estilo de carta: o nome escrito sobre o mapa, com a
 * contagem discreta ao lado. Elemento do DOM porque o nome vem do banco.
 */
function criarRotuloBairro(nome: string, total: number) {
  const wrapper = document.createElement("span");
  const label = document.createElement("b");
  label.textContent = nome;
  wrapper.appendChild(label);
  if (total > 0) {
    const contagem = document.createElement("i");
    contagem.textContent = String(total);
    wrapper.appendChild(contagem);
  }
  return wrapper;
}

/**
 * Monta o conteúdo do marcador de pessoa como elemento, não como texto HTML:
 * nome e apelido vêm do banco e nunca devem ser interpretados como marcação.
 */
function criarConteudoPessoa(pessoa: MarcadorPessoa) {
  const wrapper = document.createElement("span");
  if (pessoa.fotoUrl) {
    const img = document.createElement("img");
    img.src = pessoa.fotoUrl;
    img.alt = "";
    img.loading = "lazy";
    wrapper.appendChild(img);
  } else {
    const iniciais = document.createElement("b");
    iniciais.textContent = pessoa.iniciais;
    wrapper.appendChild(iniciais);
  }
  return wrapper;
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
    previous.bairroId === next.bairroId &&
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
  const referenceLayerRef = useRef<LayerGroup | null>(null);
  const diligenceLayerRef = useRef<LayerGroup | null>(null);
  const routeLayerRef = useRef<LayerGroup | null>(null);
  const addressesRef = useRef<MapaEnderecoRecord[]>([]);
  const selectionLockedRef = useRef(false);
  const refreshViewportRef = useRef<() => void>(() => undefined);
  const syncZoomLayersRef = useRef<() => void>(() => undefined);
  const initialFitDoneRef = useRef(false);

  const [mapReady, setMapReady] = useState(false);
  const [addresses, setAddresses] = useState<MapaEnderecoRecord[]>([]);
  const [territoryCatalog, setTerritoryCatalog] =
    useState<BairroOperacionalRecord[]>(FALLBACK_TERRITORY);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [mapError, setMapError] = useState("");
  const [zoom, setZoom] = useState(14);
  // O catálogo territorial abre junto do mapa para que bairros sem coordenadas
  // também sejam visíveis. O usuário pode fechá-lo para usar toda a área do mapa.
  const [directoryOpen, setDirectoryOpen] = useState(true);
  const [scope, setScope] = useState<TerritoryScope | null>(null);
  const [people, setPeople] = useState<MapaPessoaRecord[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState("");
  /** Morador de cada endereço, para o marcador virar a foto quando o mapa aproxima. */
  const [addressPeople, setAddressPeople] = useState<Map<string, MarcadorPessoa>>(new Map());
  const [references, setReferences] = useState<ReferenciaRecord[]>([]);
  const [neighborhoodPanel, setNeighborhoodPanel] = useState<BairroPainelRecord | null>(null);
  const [neighborhoodPanelLoading, setNeighborhoodPanelLoading] = useState(false);
  const [neighborhoodPanelError, setNeighborhoodPanelError] = useState("");
  const [internalRouteVisible, setInternalRouteVisible] = useState(true);
  const [route, setRoute] = useState<RoadRoute | null>(null);
  const [routeState, setRouteState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const routeVisible = controlledRouteVisible ?? internalRouteVisible;
  const neighborhoods = useMemo(
    () => groupNeighborhoods(addresses, territoryCatalog),
    [addresses, territoryCatalog],
  );
  const namedNeighborhoods = neighborhoods.filter(
    (item) =>
      item.key !== WITHOUT_NEIGHBORHOOD &&
      item.key !== PENDING_NEIGHBORHOOD &&
      item.key !== UNIDENTIFIED_NEIGHBORHOOD,
  );
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
    void Promise.all([listMapaEnderecos(), listBairrosOperacionais()])
      .then(([addressRecords, neighborhoodRecords]) => {
        if (!cancelled) {
          setAddresses(addressRecords);
          if (neighborhoodRecords.length) setTerritoryCatalog(neighborhoodRecords);
        }
      })
      .catch((cause) => {
        console.error("[MapaCanvas] Falha ao carregar território", cause);
        if (!cancelled) {
          setMapError("Não foi possível atualizar o território; exibindo o catálogo local.");
        }
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
      referenceLayerRef.current = L.layerGroup();
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
      referenceLayerRef.current = null;
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
      bairroId: group.bairroId,
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
      bairroId: null,
      addressIds: visible.map((item) => item.id).sort(),
    };
    setScope((previous) => (sameScope(previous, next) ? previous : next));
  };

  syncZoomLayersRef.current = () => {
    const map = mapRef.current;
    const neighborhoodLayer = neighborhoodLayerRef.current;
    const addressLayer = addressLayerRef.current;
    if (!map || !neighborhoodLayer || !addressLayer) return;
    const referenceLayer = referenceLayerRef.current;
    const zoom = map.getZoom();
    /*
     * Referência em três degraus, senão 56 rótulos se sobrepõem e o mapa vira
     * ruído: primeiro só os pontos que servem de âncora na cidade, depois os
     * demais, e o nome escrito apenas bem de perto.
     */
    if (referenceLayer) {
      const showReferences = zoom >= SHOW_REFERENCES_AT_ZOOM;
      if (showReferences && !map.hasLayer(referenceLayer)) map.addLayer(referenceLayer);
      if (!showReferences && map.hasLayer(referenceLayer)) map.removeLayer(referenceLayer);
      const container = map.getContainer();
      container.classList.toggle("sipi-map-refs-todas", zoom >= SHOW_ALL_REFERENCES_AT_ZOOM);
      container.classList.toggle("sipi-map-refs-nomeadas", zoom >= SHOW_REFERENCE_NAMES_AT_ZOOM);
    }
    const showAddresses = zoom >= SHOW_PEOPLE_AT_ZOOM;
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

    // Agrupamentos técnicos ("Classificação pendente", "Bairro não informado")
    // não são lugares: rotulá-los no mapa como se fossem bairro confunde. Os
    // endereços deles continuam aparecendo, como pessoa, ao aproximar.
    const AGRUPAMENTOS_TECNICOS = new Set([
      WITHOUT_NEIGHBORHOOD,
      PENDING_NEIGHBORHOOD,
      UNIDENTIFIED_NEIGHBORHOOD,
    ]);

    neighborhoods.forEach((group) => {
      if (!group.center) return;
      if (AGRUPAMENTOS_TECNICOS.has(group.key)) return;
      const marker = L.marker(group.center, {
        icon: L.divIcon({
          className: "sipi-neighborhood-marker",
          html: criarRotuloBairro(group.label, group.addresses.length),
          iconSize: [180, 26],
          iconAnchor: [90, 13],
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
      const morador = addressPeople.get(address.id);

      // Com morador o marcador é a foto da pessoa; sem morador, um pino de casa.
      // Formatos diferentes, não só cores: no sol do celular a cor sozinha some.
      const marker = morador
        ? L.marker([address.latitude, address.longitude], {
            icon: L.divIcon({
              className: "sipi-person-marker",
              html: criarConteudoPessoa(morador),
              iconSize: [44, 50],
              iconAnchor: [22, 48],
            }),
            keyboard: true,
            title: morador.nome,
            zIndexOffset: 200,
          })
        : L.marker([address.latitude, address.longitude], {
            icon: L.divIcon({
              className: "sipi-address-marker",
              html: "<span></span>",
              iconSize: [22, 28],
              iconAnchor: [11, 26],
            }),
            keyboard: true,
            title: formatAddress(address),
          });

      marker.bindTooltip(
        morador
          ? createSafeTooltip(
              morador.apelido ? `${morador.nome} (${morador.apelido})` : morador.nome,
              formatAddress(address),
            )
          : createSafeTooltip(formatAddress(address), address.bairro ?? "Bairro não informado"),
        { direction: "top", offset: [0, morador ? -46 : -24] },
      );
      marker.on("click", () => {
        selectionLockedRef.current = true;
        setDirectoryOpen(false);
        setScope({
          kind: "endereco",
          label: formatAddress(address),
          bairroId: address.bairro_id,
          addressIds: [address.id],
        });
      });
      marker.addTo(addressLayer);
    });

    syncZoomLayersRef.current();
    if (!initialFitDoneRef.current && mappedTerritoryPoints.length) {
      initialFitDoneRef.current = true;
      const bounds = L.latLngBounds(mappedTerritoryPoints);
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.25), { maxZoom: 16, animate: false });
    }
  }, [
    mapReady,
    mappedAddresses,
    mappedTerritoryPoints,
    neighborhoods,
    openNeighborhood,
    addressPeople,
  ]);

  /** Pontos de referência: apoio de orientação, discretos e sem clique. */
  useEffect(() => {
    const L = leafletRef.current;
    const layer = referenceLayerRef.current;
    if (!mapReady || !L || !layer) return;
    layer.clearLayers();

    references.forEach((referencia) => {
      const conteudo = document.createElement("span");
      const ponto = document.createElement("i");
      const nome = document.createElement("b");
      nome.textContent = referencia.nome;
      conteudo.appendChild(ponto);
      conteudo.appendChild(nome);
      L.marker([referencia.latitude, referencia.longitude], {
        icon: L.divIcon({
          className: `sipi-reference-marker sipi-reference-${referencia.tipo}`,
          html: conteudo,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        interactive: false,
        keyboard: false,
        zIndexOffset: -200,
      }).addTo(layer);
    });
  }, [mapReady, references]);

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
    if (scope?.kind !== "bairro" || !scope.bairroId) {
      setNeighborhoodPanel(null);
      setNeighborhoodPanelError("");
      setNeighborhoodPanelLoading(false);
      return;
    }

    let cancelled = false;
    setNeighborhoodPanel(null);
    setNeighborhoodPanelLoading(true);
    setNeighborhoodPanelError("");
    void getBairroPainel(scope.bairroId)
      .then((panel) => {
        if (!cancelled) setNeighborhoodPanel(panel);
      })
      .catch((cause) => {
        console.error("[MapaCanvas] Falha ao carregar painel territorial", cause);
        if (!cancelled) {
          setNeighborhoodPanelError("Não foi possível carregar a ficha completa deste bairro.");
        }
      })
      .finally(() => {
        if (!cancelled) setNeighborhoodPanelLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scope]);

  useEffect(() => {
    if (scope?.kind === "bairro" && scope.bairroId) {
      setPeople([]);
      setPeopleError("");
      setPeopleLoading(false);
      return;
    }
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
    let cancelled = false;
    void listReferencias()
      .then((registros) => {
        if (!cancelled) setReferences(registros);
      })
      .catch((cause) => {
        // Referência é apoio à orientação: se falhar, o mapa continua útil.
        console.error("[MapaCanvas] Falha ao carregar pontos de referência", cause);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Carrega o morador de cada endereço mapeado e resolve a foto.
   *
   * O marcador de perto passa a ser a pessoa, não um número — é assim que o
   * policial reconhece o lugar. As fotos são privadas: cada uma vem por link
   * assinado e temporário, e só a partir do zoom em que os endereços aparecem.
   */
  useEffect(() => {
    const ids = mappedAddresses.map((address) => address.id);
    if (!ids.length) {
      setAddressPeople(new Map());
      return;
    }
    let cancelled = false;
    void listMapaPessoasPorEnderecos(ids)
      .then(async (registros) => {
        if (cancelled) return;
        // Um endereço pode ter mais de um morador; o primeiro representa o ponto.
        const porEndereco = new Map<string, MapaPessoaRecord>();
        for (const pessoa of registros) {
          const enderecoId = pessoa.endereco?.id;
          if (enderecoId && !porEndereco.has(enderecoId)) porEndereco.set(enderecoId, pessoa);
        }

        const entradas = [...porEndereco.entries()].slice(0, MAX_FOTOS_NO_MAPA);
        const resolvidas = await Promise.all(
          entradas.map(async ([enderecoId, pessoa]) => {
            let fotoUrl: string | null = null;
            if (pessoa.foto_perfil_path) {
              try {
                fotoUrl = await getPessoaPhotoSignedUrl(pessoa.foto_perfil_path, "thumbnail");
              } catch (cause) {
                console.error("[MapaCanvas] Falha ao resolver foto de perfil", cause);
              }
            }
            return [
              enderecoId,
              {
                id: pessoa.id,
                nome: pessoa.nome,
                apelido: pessoa.apelido,
                vinculo: pessoa.vinculo,
                fotoUrl,
                iniciais: iniciaisDe(pessoa.nome),
              } satisfies MarcadorPessoa,
            ] as const;
          }),
        );
        if (!cancelled) setAddressPeople(new Map(resolvidas));
      })
      .catch((cause) => {
        console.error("[MapaCanvas] Falha ao carregar moradores do mapa", cause);
        if (!cancelled) setAddressPeople(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [mappedAddresses]);

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
  const territorialAddresses = neighborhoodPanel?.enderecos ?? scopeAddresses;
  const territorialPeople = neighborhoodPanel?.pessoas ?? people;
  const territorialLoading = neighborhoodPanelLoading || peopleLoading;
  const territorialError = neighborhoodPanelError || peopleError;

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
                {addresses.some((item) => item.bairro_status === "pendente") ? (
                  <p className="rounded-lg border border-warning/25 bg-warning/5 p-3 text-[10px] leading-relaxed text-muted-foreground">
                    Existem {addresses.filter((item) => item.bairro_status === "pendente").length}{" "}
                    endereço(s) aguardando classificação. Eles não entram nos totais oficiais de
                    nenhum bairro até a confirmação em Endereços.
                  </p>
                ) : null}
              </div>
            ) : territorialLoading ? (
              <div className="flex min-h-40 items-center justify-center gap-2 text-xs text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin text-operational" /> Montando ficha
                territorial...
              </div>
            ) : territorialError ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                {territorialError}
              </p>
            ) : (
              <div className="space-y-3">
                {neighborhoodPanel ? <TerritoryStats panel={neighborhoodPanel} /> : null}
                {scope ? (
                  <ScopeAddressList
                    addresses={territorialAddresses}
                    total={neighborhoodPanel?.enderecos_total}
                  />
                ) : null}
                {neighborhoodPanel ? <NeighborhoodDiligences panel={neighborhoodPanel} /> : null}

                <section>
                  <div className="mb-2 flex items-center justify-between gap-2 px-1">
                    <strong className="text-[9px] font-black uppercase tracking-[0.16em] text-operational">
                      Pessoas vinculadas
                    </strong>
                    <span className="text-[9px] text-muted-foreground">
                      {neighborhoodPanel?.pessoas_total ?? territorialPeople.length}
                    </span>
                  </div>
                  {territorialPeople.length ? (
                    <div className="space-y-2">
                      {territorialPeople.map((person) => (
                        <PersonMapCard key={person.id} person={person} />
                      ))}
                      {neighborhoodPanel &&
                      neighborhoodPanel.pessoas_total > neighborhoodPanel.pessoas.length ? (
                        <p className="px-2 py-1 text-[10px] text-muted-foreground">
                          Exibindo {neighborhoodPanel.pessoas.length} de{" "}
                          {neighborhoodPanel.pessoas_total} perfis. Abra Pessoas / Alvos para a
                          lista completa.
                        </p>
                      ) : territorialPeople.length >= 80 ? (
                        <p className="px-2 py-1 text-[10px] text-muted-foreground">
                          Exibindo os 80 primeiros cadastros desta área. Aproxime o mapa para
                          refinar.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-border p-5 text-center">
                      <UsersRound className="h-7 w-7 text-muted-foreground" />
                      <strong className="mt-3 text-xs">Nenhuma pessoa vinculada</strong>
                      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                        Este bairro ainda não possui pessoa ligada aos endereços classificados.
                      </p>
                    </div>
                  )}
                </section>

                {scope?.kind === "bairro" ? (
                  <Link
                    to="/localizacao/pessoas"
                    className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-operational/35 bg-operational/10 px-3 text-[9px] font-black uppercase tracking-wider text-operational transition hover:bg-operational hover:text-[var(--operational-contrast)]"
                  >
                    <UsersRound className="h-3.5 w-3.5" /> Abrir Pessoas / Alvos
                  </Link>
                ) : null}
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

function TerritoryStats({ panel }: { panel: BairroPainelRecord }) {
  const stats = [
    {
      label: "Endereços",
      value: panel.enderecos_total,
      detail: `${panel.enderecos_posicionados} no mapa`,
      icon: House,
    },
    {
      label: "Pessoas",
      value: panel.pessoas_total,
      detail: "vinculadas",
      icon: UsersRound,
    },
    {
      label: "Diligências",
      value: panel.diligencias_ativas,
      detail: "ativas",
      icon: ClipboardList,
    },
  ];

  return (
    <section className="grid grid-cols-3 gap-1.5" aria-label="Resumo territorial do bairro">
      {stats.map(({ label, value, detail, icon: Icon }) => (
        <article
          key={label}
          className="min-w-0 rounded-xl border border-operational/20 bg-operational/5 p-2.5"
        >
          <Icon className="h-3.5 w-3.5 text-operational" />
          <strong className="mt-2 block text-lg font-black tabular-nums">{value}</strong>
          <span className="block truncate text-[7px] font-black uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span className="mt-0.5 block truncate text-[8px] text-muted-foreground">{detail}</span>
        </article>
      ))}
    </section>
  );
}

function NeighborhoodDiligences({ panel }: { panel: BairroPainelRecord }) {
  return (
    <section className="rounded-xl border border-border bg-card/60 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <strong className="text-[9px] font-black uppercase tracking-[0.16em] text-operational">
          Diligências ativas
        </strong>
        <span className="text-[9px] text-muted-foreground">{panel.diligencias_ativas}</span>
      </div>
      {panel.diligencias.length ? (
        <div className="space-y-1.5">
          {panel.diligencias.map((diligence) => (
            <Link
              key={diligence.id}
              to="/localizacao/diligencias/$diligenciaId"
              params={{ diligenciaId: diligence.id }}
              className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-2.5 py-2 transition hover:border-operational/40"
            >
              <ClipboardList className="h-3.5 w-3.5 shrink-0 text-operational" />
              <span className="min-w-0 flex-1">
                <strong className="block truncate font-mono text-[9px]">{diligence.codigo}</strong>
                <span className="block truncate text-[9px] text-muted-foreground">
                  {diligence.destino}
                </span>
              </span>
              <DiligenciaStatusBadge status={diligence.status} />
            </Link>
          ))}
          {panel.diligencias_ativas > panel.diligencias.length ? (
            <span className="block px-2 pt-1 text-[9px] text-muted-foreground">
              + {panel.diligencias_ativas - panel.diligencias.length} diligência(s) na lista
              completa.
            </span>
          ) : null}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">Nenhuma operação ativa neste bairro.</p>
      )}
    </section>
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

function ScopeAddressList({
  addresses,
  total = addresses.length,
}: {
  addresses: MapaEnderecoRecord[];
  total?: number;
}) {
  const uniqueAddresses = Array.from(
    new Map(addresses.map((address) => [formatAddress(address), address])).values(),
  );

  return (
    <section className="mb-3 rounded-xl border border-operational/25 bg-operational/5 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <strong className="text-[9px] font-black uppercase tracking-[0.16em] text-operational">
          Ruas e endereços
        </strong>
        <span className="text-[9px] text-muted-foreground">{total}</span>
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
          {total > uniqueAddresses.length ? (
            <span className="block px-2 pt-1 text-[9px] text-muted-foreground">
              + {total - uniqueAddresses.length} endereço(s) na lista completa.
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
