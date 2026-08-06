import { Link } from "@tanstack/react-router";
import type { LatLngExpression, LayerGroup, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Building2,
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
  getPessoaDetalhes,
  getPessoaPhotoSignedUrl,
  listBairrosOperacionais,
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
  BairroOperacionalRecord,
  BairroPainelRecord,
  MapaEnderecoRecord,
  MapaPessoaRecord,
  PessoaDetalheRecord,
} from "../localizacaoTypes";

const ITABELA_CENTER: LatLngExpression = [-16.57257, -39.56629];
const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const WITHOUT_NEIGHBORHOOD = "__sem_bairro__";
const PENDING_NEIGHBORHOOD = "__bairro_pendente__";
const UNIDENTIFIED_NEIGHBORHOOD = "__bairro_nao_identificado__";
const SHOW_PEOPLE_AT_ZOOM = 17;
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
 *
 * O ponto fica separado do texto de propósito: com 18 bairros próximos, nem
 * todo nome cabe sem esbarrar no vizinho. Quando não cabe, `resolveBairroLabels`
 * (mais abaixo) esconde só o texto — o ponto permanece, marcando o lugar.
 */
function criarRotuloBairro(nome: string, total: number) {
  const wrapper = document.createElement("span");

  const dot = document.createElement("i");
  dot.className = "sipi-bairro-dot";
  wrapper.appendChild(dot);

  const text = document.createElement("span");
  text.className = "sipi-bairro-text";

  const label = document.createElement("b");
  label.className = "sipi-bairro-name";
  label.textContent = nome;
  text.appendChild(label);

  if (total > 0) {
    const contagem = document.createElement("i");
    contagem.className = "sipi-bairro-count";
    contagem.textContent = String(total);
    text.appendChild(contagem);
  }
  wrapper.appendChild(text);

  return { root: wrapper, text };
}

/**
 * Some nomes de bairro colidem na tela — "PALMARES" em cima de "OURO VERDE",
 * "CENTRO" atrás do marcador da delegacia. Em vez de deixar sobrepor (ilegível)
 * ou sumir de vez (perde o lugar), o texto se esconde e só o ponto permanece.
 *
 * Reexibe tudo antes de medir — um rótulo já escondido mede 0×0 e nunca mais
 * voltaria a aparecer — e prioriza o bairro com mais endereços cadastrados,
 * que é o que mais importa achar de relance.
 */
function resolveBairroLabels(
  entries: Array<{ el: HTMLElement; priority: number }>,
  reservado: DOMRect[] = [],
) {
  if (!entries.length) return;
  const MARGEM = 4;
  const colide = (a: DOMRect, b: DOMRect) =>
    a.left - MARGEM < b.right &&
    a.right + MARGEM > b.left &&
    a.top - MARGEM < b.bottom &&
    a.bottom + MARGEM > b.top;

  entries.forEach(({ el }) => el.classList.remove("is-hidden"));

  const ocupados = [...reservado];
  [...entries]
    .sort((a, b) => b.priority - a.priority)
    .forEach(({ el }) => {
      const rect = el.getBoundingClientRect();
      if (ocupados.some((outro) => colide(rect, outro))) {
        el.classList.add("is-hidden");
      } else {
        ocupados.push(rect);
      }
    });
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

export function MapaCanvas({
  routeVisible: controlledRouteVisible,
  onRouteVisibleChange,
  showRouteToggle = true,
  onSelectedPersonChange,
  onRouteChange,
  className = "",
}: {
  routeVisible?: boolean;
  onRouteVisibleChange?: (visible: boolean) => void;
  showRouteToggle?: boolean;
  /** Repassa a ficha completa da pessoa clicada no mapa para o painel ao lado. */
  onSelectedPersonChange?: (person: PessoaDetalheRecord | null) => void;
  /** Repassa a rota calculada (e seu estado) para o painel ao lado exibir a distância/tempo. */
  onRouteChange?: (route: RoadRoute | null, state: "idle" | "loading" | "ready" | "error") => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const neighborhoodLayerRef = useRef<LayerGroup | null>(null);
  const addressLayerRef = useRef<LayerGroup | null>(null);
  const centralLayerRef = useRef<LayerGroup | null>(null);
  const routeLayerRef = useRef<LayerGroup | null>(null);
  const selectionLockedRef = useRef(false);
  const syncZoomLayersRef = useRef<() => void>(() => undefined);
  const initialFitDoneRef = useRef(false);
  /** Rótulos de bairro atualmente desenhados, para reavaliar colisão a cada zoom/pan. */
  const bairroLabelEntriesRef = useRef<Array<{ el: HTMLElement; priority: number }>>([]);
  const resolveBairroLabelsRef = useRef<() => void>(() => undefined);
  // Refs em vez de usar as props direto dentro dos handlers do Leaflet: essas
  // funções são recriadas a cada render do componente pai, e os handlers são
  // montados de forma imperativa (não reagem a closures desatualizadas sozinhos).
  const onSelectedPersonChangeRef = useRef<
    ((person: PessoaDetalheRecord | null) => void) | undefined
  >(onSelectedPersonChange);
  const onRouteChangeRef = useRef<
    ((route: RoadRoute | null, state: "idle" | "loading" | "ready" | "error") => void) | undefined
  >(onRouteChange);
  /** Descarta a resposta de uma ficha se outra pessoa já foi clicada depois. */
  const personSelectionTokenRef = useRef(0);

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
  const [neighborhoodPanel, setNeighborhoodPanel] = useState<BairroPainelRecord | null>(null);
  const [neighborhoodPanelLoading, setNeighborhoodPanelLoading] = useState(false);
  const [neighborhoodPanelError, setNeighborhoodPanelError] = useState("");
  const [internalRouteVisible, setInternalRouteVisible] = useState(true);
  const [route, setRoute] = useState<RoadRoute | null>(null);
  const [routeState, setRouteState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  /** Ponto de destino da rota: o endereço da pessoa clicada no mapa. */
  const [routeTarget, setRouteTarget] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );

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
    onSelectedPersonChangeRef.current = onSelectedPersonChange;
    onRouteChangeRef.current = onRouteChange;
  }, [onSelectedPersonChange, onRouteChange]);

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
      centralLayerRef.current = L.layerGroup().addTo(map);
      routeLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setMapReady(true);

      const onViewportChange = () => {
        setZoom(map.getZoom());
        syncZoomLayersRef.current();
        resolveBairroLabelsRef.current();
      };
      map.on("zoomend moveend", onViewportChange);
      map.on("click", () => {
        // Painel só abre por ação direta (clicar num bairro, endereço ou
        // pessoa) — não mais sozinho ao passear pelo mapa. Um clique no
        // fundo do mapa só fecha o que estiver aberto.
        selectionLockedRef.current = false;
        setDirectoryOpen(false);
        setRouteTarget(null);
        onSelectedPersonChangeRef.current?.(null);
        setScope(null);
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
      centralLayerRef.current = null;
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

  syncZoomLayersRef.current = () => {
    const map = mapRef.current;
    const neighborhoodLayer = neighborhoodLayerRef.current;
    const addressLayer = addressLayerRef.current;
    if (!map || !neighborhoodLayer || !addressLayer) return;
    const zoom = map.getZoom();
    const showAddresses = zoom >= SHOW_PEOPLE_AT_ZOOM;
    if (showAddresses) {
      if (map.hasLayer(neighborhoodLayer)) map.removeLayer(neighborhoodLayer);
      if (!map.hasLayer(addressLayer)) map.addLayer(addressLayer);
    } else {
      if (map.hasLayer(addressLayer)) map.removeLayer(addressLayer);
      if (!map.hasLayer(neighborhoodLayer)) map.addLayer(neighborhoodLayer);
    }
  };

  resolveBairroLabelsRef.current = () => {
    // A delegacia (marcador "DT") fica sempre visível por cima; se um nome de
    // bairro cair embaixo dela, o texto some, sobrando só o ponto no lugar.
    const central = containerRef.current?.querySelector(".sipi-central-marker");
    const reservado = central ? [central.getBoundingClientRect()] : [];
    resolveBairroLabels(bairroLabelEntriesRef.current, reservado);
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

    bairroLabelEntriesRef.current = [];

    neighborhoods.forEach((group) => {
      if (!group.center) return;
      if (AGRUPAMENTOS_TECNICOS.has(group.key)) return;
      const rotulo = criarRotuloBairro(group.label, group.addresses.length);
      const marker = L.marker(group.center, {
        icon: L.divIcon({
          className: "sipi-neighborhood-marker",
          html: rotulo.root,
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
      bairroLabelEntriesRef.current.push({ el: rotulo.text, priority: group.addresses.length });
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

        if (morador) {
          // Foto de perfil clicada: abre a ficha da pessoa no painel ao lado e
          // traça a rota até o endereço dela — não o painel territorial.
          setRouteTarget({ latitude: address.latitude, longitude: address.longitude });
          const token = ++personSelectionTokenRef.current;
          void getPessoaDetalhes(morador.id)
            .then((detail) => {
              if (personSelectionTokenRef.current !== token) return;
              onSelectedPersonChangeRef.current?.(detail);
            })
            .catch((cause) => {
              console.error("[MapaCanvas] Falha ao carregar ficha da pessoa", cause);
            });
          return;
        }

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
    resolveBairroLabelsRef.current();
    if (!initialFitDoneRef.current && mappedTerritoryPoints.length) {
      initialFitDoneRef.current = true;
      const bounds = L.latLngBounds(mappedTerritoryPoints);
      // Padding menor: os 18 bairros já cobrem quase 4 km de ponta a ponta —
      // uma margem generosa só empurra a cidade para o meio de mata vazia.
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.12), { maxZoom: 16, animate: false });
    }
  }, [
    mapReady,
    mappedAddresses,
    mappedTerritoryPoints,
    neighborhoods,
    openNeighborhood,
    addressPeople,
  ]);

  useEffect(() => {
    const L = leafletRef.current;
    const layer = centralLayerRef.current;
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
    resolveBairroLabelsRef.current();
  }, [mapReady]);

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
    if (!routeVisible || !routeTarget) {
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
      routeTarget,
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
  }, [routeVisible, routeTarget]);

  useEffect(() => {
    onRouteChangeRef.current?.(route, routeState);
  }, [route, routeState]);

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
  ];

  return (
    <section className="grid grid-cols-2 gap-1.5" aria-label="Resumo territorial do bairro">
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
