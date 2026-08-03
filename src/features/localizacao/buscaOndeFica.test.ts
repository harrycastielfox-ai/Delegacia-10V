import { describe, expect, it } from "vitest";
import {
  buscarPessoasComLocal,
  getBairroPainel,
  listBairrosOperacionais,
} from "@/lib/repositories/localizacaoRepository";

/**
 * Contrato da busca "Onde Fica". Estes casos descrevem como o policial realmente
 * procura em campo — e são a especificação que a consulta no Supabase terá de
 * atender quando o repositório deixar de ser em memória.
 */
describe("busca Onde Fica", () => {
  it("acha pelo apelido, que é como a pessoa é conhecida", async () => {
    const resultado = await buscarPessoasComLocal("Nêgo");
    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe("J. C. S.");
  });

  it("ignora acento — ninguém digita circunflexo no meio da diligência", async () => {
    const comAcento = await buscarPessoasComLocal("Nêgo");
    const semAcento = await buscarPessoasComLocal("nego");
    expect(semAcento.map((p) => p.id)).toEqual(comAcento.map((p) => p.id));
  });

  it("acha pelo texto de como chegar, não só pelo endereço formal", async () => {
    const resultado = await buscarPessoasComLocal("padaria");
    expect(resultado).toHaveLength(1);
    expect(resultado[0].apelido).toBe("Dona Preta");
  });

  it("acha pelo telefone", async () => {
    const resultado = await buscarPessoasComLocal("8814");
    expect(resultado).toHaveLength(1);
    expect(resultado[0].apelido).toBe("Nêgo do Sítio");
  });

  it("acha pelo bairro", async () => {
    const resultado = await buscarPessoasComLocal("centro");
    expect(resultado.map((p) => p.apelido)).toContain("Nêgo do Sítio");
  });

  it("já devolve o endereço resolvido, sem a tela precisar cruzar nada", async () => {
    const [pessoa] = await buscarPessoasComLocal("Nêgo");
    expect(pessoa.endereco?.logradouro).toBe("Rua das Palmeiras");
    expect(pessoa.endereco?.latitude).toBeCloseTo(-16.5721, 4);
  });

  it("termo vazio devolve todo mundo", async () => {
    const resultado = await buscarPessoasComLocal("");
    expect(resultado.length).toBeGreaterThan(1);
  });

  it("termo sem correspondência devolve lista vazia", async () => {
    expect(await buscarPessoasComLocal("zzzznaoexiste")).toEqual([]);
  });
});

describe("painel territorial do bairro", () => {
  it("carrega contadores e perfis somente para o bairro selecionado", async () => {
    const bairros = await listBairrosOperacionais();
    const centro = bairros.find((bairro) => bairro.nome === "Centro");
    expect(centro).toBeDefined();

    const painel = await getBairroPainel(centro!.id);
    expect(painel?.bairro_nome).toBe("Centro");
    expect(painel?.enderecos_total).toBe(1);
    expect(painel?.pessoas_total).toBe(1);
    expect(painel?.pessoas[0]?.apelido).toBe("Nêgo do Sítio");
  });
});
