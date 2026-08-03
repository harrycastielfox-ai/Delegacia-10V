import type {
  ChegadaRecord,
  DiligenciaDetalhe,
  DiligenciaListFilters,
  DiligenciaListRecord,
  DiligenciaPayload,
  DiligenciaRecord,
  EnderecoPayload,
  EnderecoRecord,
  LocalizacaoOverviewStats,
  MapaEnderecoRecord,
  MapaPessoaRecord,
  PessoaAlvoPayload,
  PessoaAlvoRecord,
  PessoaCadastroCompletoPayload,
  PessoaComLocal,
  PessoaDetalheRecord,
  PosicaoVtrRecord,
  RegistroFotograficoRecord,
  RotaSalvaRecord,
} from "@/features/localizacao/localizacaoTypes";
import { buildMapDirectionsUrl, buildWazeUrl, DEFAULT_ROUTE_ORIGIN } from "@/lib/mapLinks";
import { supabase } from "@/lib/supabaseClient";

const PRIVATE_BUCKET = "localizacao-private";

type SupabaseError = { message: string; code?: string; details?: string | null };

function fail(context: string, error: SupabaseError | null): never {
  console.error(`[localizacaoRepository] ${context}`, error);
  throw new Error(error?.message || context);
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function safeSearch(value: string) {
  return value
    .trim()
    .replace(/[%_,()]/g, " ")
    .replace(/\s+/g, " ");
}

async function findAddressIds(search: string): Promise<string[]> {
  const safe = safeSearch(search);
  if (!safe) return [];
  const { data, error } = await supabase
    .from("localizacao_enderecos")
    .select("id")
    .is("deleted_at", null)
    .or(
      `logradouro.ilike.%${safe}%,bairro.ilike.%${safe}%,ponto_referencia.ilike.%${safe}%,como_chegar.ilike.%${safe}%`,
    )
    .limit(60);
  if (error) fail("Falha ao localizar endereços relacionados à busca", error);
  return (data ?? []).map((item) => item.id);
}

async function findPersonIds(search: string): Promise<string[]> {
  const safe = safeSearch(search);
  if (!safe) return [];
  const { data, error } = await supabase
    .from("localizacao_pessoas")
    .select("id")
    .is("deleted_at", null)
    .or(
      `nome.ilike.%${safe}%,apelido.ilike.%${safe}%,telefone.ilike.%${safe}%,numero_bo.ilike.%${safe}%,numero_procedimento.ilike.%${safe}%`,
    )
    .limit(60);
  if (error) fail("Falha ao localizar pessoas relacionadas à busca", error);
  return (data ?? []).map((item) => item.id);
}

function formatAddress(
  address: Pick<EnderecoRecord, "logradouro" | "numero" | "sem_numero"> | null,
) {
  if (!address) return "Endereço não informado";
  const number = address.sem_numero ? "s/n" : (address.numero ?? "s/n");
  return `${address.logradouro}, ${number}`;
}

function asAddress(value: unknown): EnderecoRecord | null {
  if (!value) return null;
  return (Array.isArray(value) ? value[0] : value) as EnderecoRecord | null;
}

function asPerson(value: unknown): PessoaAlvoRecord | null {
  if (!value) return null;
  return (Array.isArray(value) ? value[0] : value) as PessoaAlvoRecord | null;
}

const TEST_NOW = "2026-08-03T12:00:00.000Z";
const TEST_ADDRESS: EnderecoRecord = {
  id: "test-address",
  logradouro: "Rua das Palmeiras",
  numero: "87",
  sem_numero: false,
  complemento: null,
  bairro: "Centro",
  municipio: "Itabela",
  uf: "BA",
  cep: null,
  ponto_referencia: "Próximo à praça principal",
  como_chegar: "Sobrado amarelo ao lado da praça, portão de grade preta.",
  latitude: -16.5721,
  longitude: -39.4863,
  maps_url: null,
  confirmado: true,
  observacoes: null,
  created_at: TEST_NOW,
  updated_at: TEST_NOW,
  created_by: null,
};
const TEST_PEOPLE: PessoaComLocal[] = [
  {
    id: "test-person-1",
    nome: "J. C. S.",
    apelido: "Nêgo do Sítio",
    telefone: "(73) 9 8814-2207",
    foto_perfil_path: null,
    vinculo: "alvo",
    numero_bo: null,
    numero_procedimento: null,
    inquerito_id: null,
    endereco: TEST_ADDRESS,
    fotos_local: [],
  },
  {
    id: "test-person-2",
    nome: "M. A. P.",
    apelido: "Dona Preta",
    telefone: "(73) 9 9127-4460",
    foto_perfil_path: null,
    vinculo: "testemunha",
    numero_bo: null,
    numero_procedimento: null,
    inquerito_id: null,
    endereco: {
      ...TEST_ADDRESS,
      id: "test-address-2",
      bairro: "Alvorada",
      ponto_referencia: "Acesso pela padaria",
      como_chegar: "Entre pela padaria e siga até o portão azul.",
    },
    fotos_local: [],
  },
];

export async function listDiligenciasPage(
  filters: DiligenciaListFilters = {},
): Promise<DiligenciaListRecord[]> {
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
  const page = Math.max(filters.page ?? 1, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const search = safeSearch(filters.busca ?? "");
  const [addressIds, personIds] = search
    ? await Promise.all([findAddressIds(search), findPersonIds(search)])
    : [[], []];

  let query = supabase
    .from("localizacao_diligencias")
    .select(
      "*, endereco:localizacao_enderecos(*), pessoa:localizacao_pessoas(id, endereco:localizacao_enderecos(*))",
      { count: "exact" },
    )
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (filters.status === "ativas") query = query.not("status", "in", '("concluida","cancelada")');
  else if (filters.status && filters.status !== "todos") query = query.eq("status", filters.status);
  if (filters.tipo) query = query.eq("tipo", filters.tipo);
  if (filters.equipe) query = query.eq("equipe_nome", filters.equipe);
  if (filters.de) query = query.gte("created_at", `${filters.de}T00:00:00`);
  if (filters.ate) query = query.lte("created_at", `${filters.ate}T23:59:59.999`);
  if (search) {
    const clauses = [
      `codigo.ilike.%${search}%`,
      `equipe_nome.ilike.%${search}%`,
      `viatura.ilike.%${search}%`,
    ];
    if (addressIds.length) clauses.push(`endereco_id.in.(${addressIds.join(",")})`);
    if (personIds.length) clauses.push(`pessoa_id.in.(${personIds.join(",")})`);
    query = query.or(clauses.join(","));
  }

  const { data, count, error } = await query;
  if (error) fail("Falha ao listar diligências", error);

  return (data ?? []).map((row) => {
    const embeddedPerson = Array.isArray(row.pessoa) ? row.pessoa[0] : row.pessoa;
    const personAddress = asAddress(embeddedPerson?.endereco);
    const address = asAddress(row.endereco) ?? personAddress;
    return {
      id: row.id,
      codigo: row.codigo,
      tipo: row.tipo,
      status: row.status,
      destino: formatAddress(address),
      bairro: address?.bairro ?? null,
      latitude: address?.latitude ?? null,
      longitude: address?.longitude ?? null,
      equipe_nome: row.equipe_nome,
      agendada_para: row.agendada_para,
      saida_em: row.saida_em,
      chegada_em: row.chegada_em,
      total_count: count ?? 0,
    } as DiligenciaListRecord;
  });
}

export async function getDiligenciaById(id: string): Promise<DiligenciaDetalhe | null> {
  const { data, error } = await supabase
    .from("localizacao_diligencias")
    .select(
      "*, endereco:localizacao_enderecos(*), pessoa:localizacao_pessoas(*), fotos:localizacao_registros_fotograficos(*), chegadas:localizacao_chegadas(*)",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) fail("Falha ao carregar diligência", error);
  if (!data) return null;

  const arrivals = Array.isArray(data.chegadas) ? (data.chegadas as ChegadaRecord[]) : [];
  arrivals.sort((a, b) => b.registrada_em.localeCompare(a.registrada_em));
  return {
    ...(data as DiligenciaRecord),
    endereco: asAddress(data.endereco),
    pessoa: asPerson(data.pessoa),
    fotos: (Array.isArray(data.fotos) ? data.fotos : []) as RegistroFotograficoRecord[],
    chegada: arrivals[0] ?? null,
  };
}

export async function getLocalizacaoOverviewStats(): Promise<LocalizacaoOverviewStats> {
  const { data, error } = await supabase.rpc("localizacao_overview_stats");
  if (error) fail("Falha ao carregar indicadores de localização", error);
  const stats = (data ?? {}) as Partial<LocalizacaoOverviewStats>;
  return {
    ativas: Number(stats.ativas ?? 0),
    em_deslocamento: Number(stats.em_deslocamento ?? 0),
    no_local: Number(stats.no_local ?? 0),
    concluidas_hoje: Number(stats.concluidas_hoje ?? 0),
    enderecos_cadastrados: Number(stats.enderecos_cadastrados ?? 0),
    pessoas_cadastradas: Number(stats.pessoas_cadastradas ?? 0),
    fotos_30_dias: Number(stats.fotos_30_dias ?? 0),
    por_dia: Array.isArray(stats.por_dia) ? stats.por_dia : [],
  };
}

export async function createDiligencia(payload: DiligenciaPayload): Promise<DiligenciaRecord> {
  const { data, error } = await supabase
    .from("localizacao_diligencias")
    .insert(payload)
    .select("*")
    .single();
  if (error) fail("Falha ao criar diligência", error);
  return data as DiligenciaRecord;
}

export async function updateDiligencia(
  id: string,
  payload: Partial<DiligenciaPayload>,
): Promise<DiligenciaRecord | null> {
  const { data, error } = await supabase
    .from("localizacao_diligencias")
    .update(payload)
    .eq("id", id)
    .is("deleted_at", null)
    .select("*")
    .maybeSingle();
  if (error) fail("Falha ao atualizar diligência", error);
  return data as DiligenciaRecord | null;
}

export async function registrarChegada(input: {
  diligencia_id: string;
  latitude: number;
  longitude: number;
  precisao_metros: number | null;
  observacoes?: string | null;
}): Promise<ChegadaRecord> {
  const { data, error } = await supabase
    .from("localizacao_chegadas")
    .insert({ ...input, observacoes: input.observacoes ?? null })
    .select("*")
    .single();
  if (error) fail("Falha ao registrar chegada", error);

  const { error: updateError } = await supabase
    .from("localizacao_diligencias")
    .update({ status: "no_local", chegada_em: data.registrada_em })
    .eq("id", input.diligencia_id);
  if (updateError) fail("Chegada criada, mas a diligência não foi atualizada", updateError);
  return data as ChegadaRecord;
}

export async function listEnderecos(search = ""): Promise<EnderecoRecord[]> {
  let query = supabase
    .from("localizacao_enderecos")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(60);
  if (search.trim()) {
    const safe = safeSearch(search);
    query = query.or(
      `logradouro.ilike.%${safe}%,bairro.ilike.%${safe}%,ponto_referencia.ilike.%${safe}%,como_chegar.ilike.%${safe}%`,
    );
  }
  const { data, error } = await query;
  if (error) fail("Falha ao listar endereços", error);
  return (data ?? []) as EnderecoRecord[];
}

/**
 * Camada territorial leve. Busca somente o necessário para posicionar endereços
 * e formar bairros; fichas e fotografias não trafegam nesta etapa.
 */
export async function listMapaEnderecos(): Promise<MapaEnderecoRecord[]> {
  if (import.meta.env.MODE === "test") {
    return TEST_PEOPLE.map((person) => person.endereco).filter(
      (address): address is EnderecoRecord => address !== null,
    );
  }

  const pageSize = 500;
  const records: MapaEnderecoRecord[] = [];

  for (let page = 0; page < 20; page += 1) {
    const from = page * pageSize;
    const { data, error } = await supabase
      .from("localizacao_enderecos")
      .select(
        "id, logradouro, numero, sem_numero, bairro, municipio, uf, latitude, longitude, maps_url",
      )
      .is("deleted_at", null)
      .order("bairro", { ascending: true, nullsFirst: false })
      .order("logradouro", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) fail("Falha ao carregar os endereços do mapa", error);
    const batch = (data ?? []) as MapaEnderecoRecord[];
    records.push(...batch);
    if (batch.length < pageSize) break;
  }

  return records;
}

/**
 * Os perfis são buscados apenas depois que o usuário seleciona um bairro ou
 * aproxima o mapa. O limite protege a tela quando uma área possui muitos cadastros.
 */
export async function listMapaPessoasPorEnderecos(
  addressIds: string[],
  limit = 80,
): Promise<MapaPessoaRecord[]> {
  const uniqueIds = Array.from(new Set(addressIds)).slice(0, 300);
  if (!uniqueIds.length) return [];

  if (import.meta.env.MODE === "test") {
    return TEST_PEOPLE.filter((person) =>
      person.endereco ? uniqueIds.includes(person.endereco.id) : false,
    ).slice(0, limit);
  }

  const { data, error } = await supabase
    .from("localizacao_pessoas")
    .select(
      "id, nome, apelido, foto_perfil_path, vinculo, endereco:localizacao_enderecos(id, logradouro, numero, sem_numero, bairro, municipio, uf, latitude, longitude, maps_url)",
    )
    .is("deleted_at", null)
    .in("endereco_id", uniqueIds)
    .order("nome", { ascending: true })
    .limit(Math.min(Math.max(limit, 1), 120));

  if (error) fail("Falha ao carregar as pessoas da área selecionada", error);
  return (data ?? []).map((person) => ({
    id: person.id,
    nome: person.nome,
    apelido: person.apelido,
    foto_perfil_path: person.foto_perfil_path,
    vinculo: person.vinculo,
    endereco: asAddress(person.endereco) as MapaEnderecoRecord | null,
  })) as MapaPessoaRecord[];
}

export async function createEndereco(payload: EnderecoPayload): Promise<EnderecoRecord> {
  const { data, error } = await supabase
    .from("localizacao_enderecos")
    .insert(payload)
    .select("*")
    .single();
  if (error) fail("Falha ao criar endereço", error);
  return data as EnderecoRecord;
}

export async function buscarPessoasComLocal(search = ""): Promise<PessoaComLocal[]> {
  if (import.meta.env.MODE === "test") {
    const target = normalize(search);
    return TEST_PEOPLE.filter((person) => {
      if (!target) return true;
      const address = person.endereco;
      return [
        person.nome,
        person.apelido ?? "",
        person.telefone ?? "",
        address?.logradouro ?? "",
        address?.bairro ?? "",
        address?.ponto_referencia ?? "",
        address?.como_chegar ?? "",
      ].some((value) => normalize(value).includes(target));
    });
  }

  const people = await listPessoas(search);
  return people.map((person) => ({
    id: person.id,
    nome: person.nome,
    apelido: person.apelido,
    telefone: person.telefone,
    foto_perfil_path: person.foto_perfil_path,
    vinculo: person.vinculo,
    numero_bo: person.numero_bo,
    numero_procedimento: person.numero_procedimento,
    inquerito_id: person.inquerito_id,
    endereco: asAddress((person as PessoaAlvoRecord & { endereco?: unknown }).endereco),
    fotos_local: [],
  }));
}

export async function getPessoaComLocal(id: string): Promise<PessoaComLocal | null> {
  const { data, error } = await supabase
    .from("localizacao_pessoas")
    .select("*, endereco:localizacao_enderecos(*)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) fail("Falha ao carregar pessoa", error);
  if (!data) return null;
  return {
    id: data.id,
    nome: data.nome,
    apelido: data.apelido,
    telefone: data.telefone,
    foto_perfil_path: data.foto_perfil_path,
    vinculo: data.vinculo,
    numero_bo: data.numero_bo,
    numero_procedimento: data.numero_procedimento,
    inquerito_id: data.inquerito_id,
    endereco: asAddress(data.endereco),
    fotos_local: [],
  } as PessoaComLocal;
}

export async function getPessoaDetalhes(id: string): Promise<PessoaDetalheRecord | null> {
  const { data, error } = await supabase
    .from("localizacao_pessoas")
    .select("*, endereco:localizacao_enderecos(*)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) fail("Falha ao carregar ficha da pessoa", error);
  if (!data) return null;

  return {
    ...data,
    endereco: asAddress(data.endereco),
  } as unknown as PessoaDetalheRecord;
}

export async function listPessoas(search = ""): Promise<PessoaAlvoRecord[]> {
  const safe = safeSearch(search);
  const addressIds = safe ? await findAddressIds(safe) : [];
  let query = supabase
    .from("localizacao_pessoas")
    .select("*, endereco:localizacao_enderecos(*)")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(60);
  if (safe) {
    const clauses = [
      `nome.ilike.%${safe}%`,
      `apelido.ilike.%${safe}%`,
      `telefone.ilike.%${safe}%`,
      `numero_bo.ilike.%${safe}%`,
      `numero_procedimento.ilike.%${safe}%`,
    ];
    if (addressIds.length) clauses.push(`endereco_id.in.(${addressIds.join(",")})`);
    query = query.or(clauses.join(","));
  }
  const { data, error } = await query;
  if (error) fail("Falha ao listar pessoas", error);
  return (data ?? []) as unknown as PessoaAlvoRecord[];
}

export async function createPessoa(payload: PessoaAlvoPayload): Promise<PessoaAlvoRecord> {
  const { data, error } = await supabase
    .from("localizacao_pessoas")
    .insert(payload)
    .select("*")
    .single();
  if (error) fail("Falha ao criar pessoa", error);
  return data as PessoaAlvoRecord;
}

interface PhotoCompressionOptions {
  maxDimension: number;
  quality: number;
}

async function compressPhoto(
  file: File,
  { maxDimension, quality }: PhotoCompressionOptions,
): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Selecione um arquivo de imagem.");
  if (file.size > 12 * 1024 * 1024) throw new Error("A fotografia deve ter no máximo 12 MB.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a fotografia.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível comprimir a foto."))),
      "image/webp",
      quality,
    );
  });
}

export async function uploadPessoaFoto(personId: string, file: File): Promise<string> {
  const [profileBlob, thumbnailBlob] = await Promise.all([
    compressPhoto(file, { maxDimension: 1600, quality: 0.92 }),
    compressPhoto(file, { maxDimension: 320, quality: 0.9 }),
  ]);
  const photoId = crypto.randomUUID();
  const profilePath = `pessoas/${personId}/profile-${photoId}.webp`;
  const thumbnailPath = `pessoas/${personId}/thumbnail-${photoId}.webp`;

  const { error } = await supabase.storage.from(PRIVATE_BUCKET).upload(profilePath, profileBlob, {
    contentType: "image/webp",
    cacheControl: "86400",
    upsert: false,
  });
  if (error) fail("Falha ao enviar fotografia da pessoa", error);

  const { error: thumbnailError } = await supabase.storage
    .from(PRIVATE_BUCKET)
    .upload(thumbnailPath, thumbnailBlob, {
      contentType: "image/webp",
      cacheControl: "86400",
      upsert: false,
    });
  if (thumbnailError) {
    await supabase.storage.from(PRIVATE_BUCKET).remove([profilePath]);
    fail("Falha ao gerar miniatura da pessoa", thumbnailError);
  }

  const { error: updateError } = await supabase
    .from("localizacao_pessoas")
    .update({ foto_perfil_path: profilePath })
    .eq("id", personId);
  if (updateError) {
    await supabase.storage.from(PRIVATE_BUCKET).remove([profilePath, thumbnailPath]);
    fail("Foto enviada, mas o cadastro não foi atualizado", updateError);
  }
  return profilePath;
}

export async function getPessoaPhotoSignedUrl(
  path: string | null,
  variant: "profile" | "thumbnail" = "profile",
): Promise<string | null> {
  if (!path) return null;
  const requestedPath =
    variant === "thumbnail" && path.includes("/profile-")
      ? path.replace("/profile-", "/thumbnail-")
      : path;
  return getLocalizacaoPhotoSignedUrl(requestedPath);
}

export async function getLocalizacaoPhotoSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(PRIVATE_BUCKET).createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

export async function createPessoaCadastroCompleto(
  payload: PessoaCadastroCompletoPayload,
): Promise<{
  pessoa: PessoaAlvoRecord;
  foto_ok: boolean;
  rota_ok: boolean;
}> {
  let addressId = payload.endereco_id;
  let createdAddressId: string | null = null;
  if (payload.endereco) {
    const address = await createEndereco(payload.endereco);
    addressId = address.id;
    createdAddressId = address.id;
  }

  let person: PessoaAlvoRecord;
  try {
    person = await createPessoa({
      ...payload.pessoa,
      endereco_id: addressId,
      foto_perfil_path: null,
    });
  } catch (error) {
    if (createdAddressId) {
      await supabase
        .from("localizacao_enderecos")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", createdAddressId);
    }
    throw error;
  }

  let photoOk = !payload.foto;
  if (payload.foto) {
    try {
      const path = await uploadPessoaFoto(person.id, payload.foto);
      person = { ...person, foto_perfil_path: path };
      photoOk = true;
    } catch (error) {
      console.error("[localizacaoRepository] Pessoa salva, mas a foto falhou", error);
    }
  }

  let routeOk = !payload.salvar_rota;
  if (payload.salvar_rota && addressId) {
    try {
      const address =
        payload.endereco ?? (await listEnderecos()).find((item) => item.id === addressId);
      const target = address
        ? {
            endereco: formatAddress(address),
            latitude: address.latitude,
            longitude: address.longitude,
            cidade: `${address.municipio}, ${address.uf}`,
          }
        : null;
      if (target) {
        const { error } = await supabase.from("localizacao_rotas_salvas").insert({
          nome: `Delegacia → ${person.apelido || person.nome}`,
          destino_endereco_id: addressId,
          pessoa_id: person.id,
          google_maps_url: buildMapDirectionsUrl(target, {
            origin: DEFAULT_ROUTE_ORIGIN,
          }),
          waze_url: buildWazeUrl(target),
        });
        if (error) throw error;
        routeOk = true;
      }
    } catch (error) {
      console.error("[localizacaoRepository] Pessoa salva, mas a rota falhou", error);
    }
  }

  return { pessoa: person, foto_ok: photoOk, rota_ok: routeOk };
}

export async function updatePessoaCadastroCompleto(
  personId: string,
  payload: PessoaCadastroCompletoPayload,
): Promise<{
  pessoa: PessoaAlvoRecord;
  foto_ok: boolean;
  rota_ok: boolean;
}> {
  let addressId = payload.endereco_id;
  let createdAddressId: string | null = null;

  // Uma correção manual cria um novo registro para não alterar silenciosamente
  // o endereço de outra pessoa ou diligência que compartilhe o endereço antigo.
  if (payload.endereco) {
    const address = await createEndereco(payload.endereco);
    addressId = address.id;
    createdAddressId = address.id;
  }

  const { data, error } = await supabase
    .from("localizacao_pessoas")
    .update({
      ...payload.pessoa,
      endereco_id: addressId,
    })
    .eq("id", personId)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error) {
    if (createdAddressId) {
      await supabase
        .from("localizacao_enderecos")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", createdAddressId);
    }
    fail("Falha ao atualizar pessoa", error);
  }

  let person = data as PessoaAlvoRecord;
  let photoOk = !payload.foto;
  if (payload.foto) {
    try {
      const path = await uploadPessoaFoto(person.id, payload.foto);
      person = { ...person, foto_perfil_path: path };
      photoOk = true;
    } catch (uploadError) {
      console.error("[localizacaoRepository] Cadastro atualizado, mas a foto falhou", uploadError);
    }
  }

  let routeOk = !payload.salvar_rota;
  if (payload.salvar_rota && addressId) {
    try {
      const address =
        payload.endereco ?? (await listEnderecos()).find((item) => item.id === addressId);
      const target = address
        ? {
            endereco: formatAddress(address),
            latitude: address.latitude,
            longitude: address.longitude,
            cidade: `${address.municipio}, ${address.uf}`,
          }
        : null;

      if (target) {
        const { error: routeError } = await supabase.from("localizacao_rotas_salvas").insert({
          nome: `Delegacia → ${person.apelido || person.nome}`,
          destino_endereco_id: addressId,
          pessoa_id: person.id,
          google_maps_url: buildMapDirectionsUrl(target, {
            origin: DEFAULT_ROUTE_ORIGIN,
          }),
          waze_url: buildWazeUrl(target),
        });
        if (routeError) throw routeError;
        routeOk = true;
      }
    } catch (routeError) {
      console.error("[localizacaoRepository] Cadastro atualizado, mas a rota falhou", routeError);
    }
  }

  return { pessoa: person, foto_ok: photoOk, rota_ok: routeOk };
}

export async function listRotasSalvas(): Promise<RotaSalvaRecord[]> {
  const { data, error } = await supabase
    .from("localizacao_rotas_salvas")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) fail("Falha ao listar rotas salvas", error);
  return (data ?? []).map((row) => ({
    ...row,
    paradas: Array.isArray(row.paradas) ? row.paradas : [],
  })) as RotaSalvaRecord[];
}

export async function listPosicoesVtr(_diligenciaId: string): Promise<PosicaoVtrRecord[]> {
  return [];
}

export async function uploadFotosDiligencia(
  diligenciaId: string,
  files: File[],
): Promise<RegistroFotograficoRecord[]> {
  const uploaded: RegistroFotograficoRecord[] = [];
  for (const file of files.slice(0, 8)) {
    const blob = await compressPhoto(file, { maxDimension: 1440, quality: 0.88 });
    const path = `diligencias/${diligenciaId}/${crypto.randomUUID()}.webp`;
    const { error: uploadError } = await supabase.storage
      .from(PRIVATE_BUCKET)
      .upload(path, blob, { contentType: "image/webp", upsert: false });
    if (uploadError) fail("Falha ao enviar fotografia da diligência", uploadError);
    const { data, error } = await supabase
      .from("localizacao_registros_fotograficos")
      .insert({ diligencia_id: diligenciaId, storage_path: path })
      .select("*")
      .single();
    if (error) fail("Falha ao registrar fotografia da diligência", error);
    uploaded.push(data as RegistroFotograficoRecord);
  }
  return uploaded;
}
