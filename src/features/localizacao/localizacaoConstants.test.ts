import { describe, expect, it } from "vitest";
import {
  BAIRROS_ITABELA,
  canonicalizarBairro,
  encontrarBairroOperacional,
} from "./localizacaoConstants";

describe("catálogo territorial de Itabela", () => {
  it("inclui os bairros adicionais confirmados na investigação", () => {
    expect(BAIRROS_ITABELA).toEqual(
      expect.arrayContaining([
        "Bacia",
        "Bela Vista",
        "Dapezão",
        "Ventania",
        "Imperial",
        "Francisqueto",
        "Peladão",
      ]),
    );
  });

  it("agrupa grafias alternativas no nome operacional", () => {
    expect(canonicalizarBairro("Bandeirantes")).toBe("Bandeirante");
    expect(canonicalizarBairro("Village")).toBe("Jaqueira");
    expect(canonicalizarBairro("MANZOLAO")).toBe("Manzolão");
    expect(canonicalizarBairro("  Irma   Dulce ")).toBe("Irmã Dulce");
  });

  it("mantém uma localidade nova em vez de descartar o texto", () => {
    expect(canonicalizarBairro("Nova localidade")).toBe("Nova localidade");
    expect(encontrarBairroOperacional("Nova localidade")).toBeNull();
  });
});
