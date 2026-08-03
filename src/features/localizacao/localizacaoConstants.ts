import type { DiligenciaStatus, DiligenciaTipo, PessoaVinculo } from "./localizacaoTypes";

export const DILIGENCIA_STATUS_LABELS: Record<DiligenciaStatus, string> = {
  planejada: "Planejada",
  em_deslocamento: "Em deslocamento",
  no_local: "No local",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

/** Token do design system usado por cada status. Nunca usar cor crua na UI. */
export const DILIGENCIA_STATUS_TONE: Record<
  DiligenciaStatus,
  "operational" | "success" | "warning" | "info" | "muted-foreground"
> = {
  planejada: "warning",
  em_deslocamento: "operational",
  no_local: "success",
  concluida: "info",
  cancelada: "muted-foreground",
};

export const DILIGENCIA_TIPO_LABELS: Record<DiligenciaTipo, string> = {
  intimacao: "Intimação",
  verificacao_endereco: "Verificação de endereço",
  cumprimento_mandado: "Cumprimento de mandado",
  oitiva: "Oitiva",
  vistoria_local: "Vistoria de local",
  patrulhamento: "Patrulhamento",
  apoio_outra_unidade: "Apoio a outra unidade",
  outro: "Outro",
};

export const PESSOA_VINCULO_LABELS: Record<PessoaVinculo, string> = {
  alvo: "Alvo",
  testemunha: "Testemunha",
  vitima: "Vítima",
  informante: "Informante",
  outro: "Outro",
};

/** Ordem em que os status aparecem na trilha de progresso da diligência. */
export const DILIGENCIA_PROGRESSO: DiligenciaStatus[] = [
  "planejada",
  "em_deslocamento",
  "no_local",
  "concluida",
];

export const MUNICIPIO_PADRAO = "Itabela";
export const UF_PADRAO = "BA";

export interface BairroOperacional {
  nome: string;
  aliases: readonly string[];
  /** Centro confirmado em base cartográfica; nulo evita inventar posição no mapa. */
  centro: readonly [latitude: number, longitude: number] | null;
}

/**
 * Relação territorial da sede de Itabela.
 *
 * Os dez primeiros nomes vieram da relação operacional fornecida pela unidade. Os demais foram
 * confirmados em publicações da Prefeitura/Câmara. Somente Centro, Bandeirante, Ouro Verde e
 * Jaqueira possuem centro cartográfico localizado com segurança no OpenStreetMap neste momento.
 */
export const BAIRROS_OPERACIONAIS_ITABELA: readonly BairroOperacional[] = [
  { nome: "Centro", aliases: [], centro: [-16.57257, -39.56629] },
  {
    nome: "Pereirão",
    aliases: ["Pereirao"],
    centro: null,
  },
  {
    nome: "Bandeirante",
    aliases: ["Bandeirantes"],
    centro: [-16.5787642, -39.5506699],
  },
  { nome: "Ouro Verde", aliases: [], centro: [-16.5756828, -39.5749892] },
  { nome: "Palmares", aliases: [], centro: null },
  { nome: "Ubirajara Brito", aliases: [], centro: null },
  {
    nome: "Jaqueira",
    aliases: ["Village", "Vilagge"],
    centro: [-16.5787503, -39.5989604],
  },
  { nome: "Irmã Dulce", aliases: ["Irma Dulce"], centro: null },
  { nome: "Triunfo", aliases: ["Triunfo 1"], centro: null },
  { nome: "Manzolão", aliases: ["Manzolao"], centro: null },
  { nome: "Bacia", aliases: ["Bairro da Bacia"], centro: null },
  { nome: "Bela Vista", aliases: [], centro: null },
  { nome: "Dapezão", aliases: ["Dapezao"], centro: null },
  { nome: "Ventania", aliases: [], centro: null },
  { nome: "Imperial", aliases: [], centro: null },
  { nome: "Francisqueto", aliases: [], centro: null },
  { nome: "Peladão", aliases: ["Peladao", "Campo do Peladão", "Campo do Peladao"], centro: null },
] as const;

export const BAIRROS_ITABELA = BAIRROS_OPERACIONAIS_ITABELA.map((bairro) => bairro.nome);

export function normalizarChaveBairro(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function encontrarBairroOperacional(value: string | null | undefined) {
  if (!value?.trim()) return null;
  const key = normalizarChaveBairro(value);
  return (
    BAIRROS_OPERACIONAIS_ITABELA.find((bairro) =>
      [bairro.nome, ...bairro.aliases].some((nome) => normalizarChaveBairro(nome) === key),
    ) ?? null
  );
}

/** Mantém texto livre para localidades novas, mas corrige automaticamente aliases conhecidos. */
export function canonicalizarBairro(value: string | null | undefined) {
  const label = value?.replace(/\s+/g, " ").trim();
  if (!label) return null;
  return encontrarBairroOperacional(label)?.nome ?? label;
}
