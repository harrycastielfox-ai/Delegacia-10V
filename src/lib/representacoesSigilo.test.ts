import { describe, expect, it } from "vitest";
import { canAccessSigilosa, isRepresentacaoSigilosa } from "./representacoesSigilo";
import type { RepresentacaoRecord } from "@/lib/repositories/representacoesRepository";

describe("isRepresentacaoSigilosa", () => {
  it("is false for null/undefined", () => {
    expect(isRepresentacaoSigilosa(null)).toBe(false);
    expect(isRepresentacaoSigilosa(undefined)).toBe(false);
  });

  it("prefers the normalized boolean field when present", () => {
    expect(
      isRepresentacaoSigilosa({
        pedido_sigiloso_normalizado: true,
        pedido_sigiloso: "nao",
      } as Partial<RepresentacaoRecord>),
    ).toBe(true);
  });

  it("accepts common truthy aliases in the raw text field", () => {
    for (const value of ["sim", "S", "true", "1", "sigilosa", "Sigiloso", "yes"]) {
      expect(isRepresentacaoSigilosa({ pedido_sigiloso: value })).toBe(true);
    }
  });

  it("is false for empty or negative values", () => {
    expect(isRepresentacaoSigilosa({ pedido_sigiloso: "nao" })).toBe(false);
    expect(isRepresentacaoSigilosa({ pedido_sigiloso: "" })).toBe(false);
    expect(isRepresentacaoSigilosa({})).toBe(false);
  });
});

describe("canAccessSigilosa", () => {
  it("denies access with no profile or no role", () => {
    expect(canAccessSigilosa(null)).toBe(false);
    expect(canAccessSigilosa({})).toBe(false);
  });

  it("allows admin, delegado and atlas_access regardless of field name used", () => {
    expect(canAccessSigilosa({ cargo: "admin" })).toBe(true);
    expect(canAccessSigilosa({ cargo: "delegado" })).toBe(true);
    expect(canAccessSigilosa({ cargo: "atlas_access" })).toBe(true);
    expect(canAccessSigilosa({ role: "administrador" })).toBe(true);
    expect(canAccessSigilosa({ perfil: "atlas access" })).toBe(true);
  });

  it("denies membro and sipi_access", () => {
    expect(canAccessSigilosa({ cargo: "membro" })).toBe(false);
    expect(canAccessSigilosa({ cargo: "sipi_access" })).toBe(false);
  });
});
