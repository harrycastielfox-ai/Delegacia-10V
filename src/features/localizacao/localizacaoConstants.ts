import type { PessoaVinculo } from "./localizacaoTypes";

export const PESSOA_VINCULO_LABELS: Record<PessoaVinculo, string> = {
  alvo: "Alvo",
  testemunha: "Testemunha",
  vitima: "Vítima",
  informante: "Informante",
  outro: "Outro",
};

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
 * confirmados em publicações da Prefeitura/Câmara.
 *
 * Centro, Bandeirante, Ouro Verde e Jaqueira foram localizados no OpenStreetMap. Os demais centros
 * vieram do Mapa Urbano Estatístico do IBGE (folha 291465305, SIRGAS 2000/EPSG:4674), lendo a
 * posição do rótulo de cada bairro na folha georreferenciada. Conferido contra os quatro já
 * conhecidos: a diferença ficou entre 477 e 708 m, compatível com a distância entre o rótulo
 * impresso e o ponto central — os dois caem dentro do mesmo bairro.
 *
 * Atenção ao ler a folha: o IBGE imprime o nome do bairro onde há espaço livre, não sobre as casas.
 * Em Pereirão, Ubirajara, Manzolão e Triunfo o rótulo cai em área vazia, então o centro foi tomado
 * do agrupamento de ruas correspondente, e não da posição do texto. Pereirão foi conferido contra o
 * Google Maps (o loteamento das ruas A a T); os outros três seguem aproximados até alguém da
 * unidade confirmar.
 *
 * O Centro foi reposicionado com base na unidade: vai da delegacia até a Avenida Porto Seguro
 * (chamada localmente de Rua Porto Seguro), cerca de 1,5 km. O ponto ficava numa das pontas e
 * passou para o meio desse trecho.
 *
 * Bairros ainda sem centro não aparecem na relação do IBGE, provavelmente por serem nomes de uso
 * popular. Precisam ser posicionados por quem conhece a cidade.
 */
export const BAIRROS_OPERACIONAIS_ITABELA: readonly BairroOperacional[] = [
  { nome: "Centro", aliases: [], centro: [-16.573791, -39.559451] },
  { nome: "Pereirão", aliases: ["Pereirao"], centro: [-16.574546, -39.548468] },
  {
    nome: "Bandeirante",
    aliases: ["Bandeirantes"],
    centro: [-16.5787642, -39.5506699],
  },
  { nome: "Ouro Verde", aliases: [], centro: [-16.5756828, -39.5749892] },
  { nome: "Palmares", aliases: [], centro: null },
  { nome: "Ubirajara Brito", aliases: ["Ubirajara"], centro: [-16.578552, -39.54806] },
  {
    nome: "Jaqueira",
    aliases: ["Village", "Vilagge"],
    centro: [-16.5787503, -39.5989604],
  },
  { nome: "Irmã Dulce", aliases: ["Irma Dulce"], centro: [-16.579072, -39.562281] },
  { nome: "Triunfo", aliases: ["Triunfo 1", "Triunfo I"], centro: [-16.574149, -39.574271] },
  { nome: "Manzolão", aliases: ["Manzolao"], centro: [-16.581712, -39.559289] },
  { nome: "Bacia", aliases: ["Bairro da Bacia"], centro: null },
  { nome: "Bela Vista", aliases: [], centro: null },
  { nome: "Dapezão", aliases: ["Dapezao"], centro: [-16.581287, -39.54735] },
  {
    nome: "Jardim Paquetá",
    aliases: ["Jardim Paqueta", "Paquetá", "Paqueta"],
    centro: [-16.577416, -39.57615],
  },
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
