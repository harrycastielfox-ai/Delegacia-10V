import { describe, expect, it } from "vitest";
import {
  daysUntilOperationalDate,
  hasRelatorioEnviado,
  isInqueritoEmAndamento,
  isOperationalDateDueWithin,
  isOperationalDateOverdue,
  isYesLike,
  parseOperationalDate,
} from "./operationalMetrics";
import type { InqueritoRecord } from "@/lib/repositories/inqueritosRepository";

function makeInquerito(overrides: Partial<InqueritoRecord> = {}): InqueritoRecord {
  return {
    id: "inq-1",
    codigo_interno: null,
    numero_ppe: null,
    numero_fisico: null,
    numero_bo: null,
    origem_registro: null,
    visibilidade: null,
    tipo: null,
    tipo_procedimento_normalizado: null,
    tipificacao: null,
    gravidade: null,
    categoria_criminal: null,
    prioridade: null,
    prioridade_operacional: null,
    situacao: null,
    status_diligencias: null,
    data_fato: null,
    data_instauracao: null,
    prazo: null,
    dias_decorridos: null,
    bairro: null,
    distrito: null,
    vitima: null,
    investigado: null,
    reu_preso: null,
    reu_preso_normalizado: null,
    elucidado: null,
    autoria_determinada: null,
    cvli_elucidado: null,
    data_elucidacao: null,
    houve_arma_fogo: null,
    arma_utilizada: null,
    faccao: null,
    nome_faccao: null,
    equipe: null,
    equipe_responsavel: null,
    escrivao: null,
    escrivao_responsavel_id: null,
    relatorio_enviado: null,
    relatorio_status: null,
    data_envio_relatorio: null,
    data_relatorio: null,
    medida_protetiva: null,
    medida_protetiva_normalizada: null,
    numero_processo_medida: null,
    representacoes_legais: null,
    diligencias_pendentes: null,
    delegado_responsavel: null,
    motivacao: null,
    observacoes: null,
    created_at: null,
    updated_at: null,
    deleted_at: null,
    ...overrides,
  };
}

const FIXED_NOW = Date.UTC(2026, 0, 15, 12); // 2026-01-15 noon UTC

describe("parseOperationalDate", () => {
  it("parses dd/mm/yyyy and yyyy-mm-dd", () => {
    expect(parseOperationalDate("15/01/2026")?.toISOString().slice(0, 10)).toBe("2026-01-15");
    expect(parseOperationalDate("2026-01-15")?.toISOString().slice(0, 10)).toBe("2026-01-15");
  });

  it("returns null for empty or invalid input", () => {
    expect(parseOperationalDate("")).toBeNull();
    expect(parseOperationalDate(null)).toBeNull();
    expect(parseOperationalDate("not-a-date")).toBeNull();
  });
});

describe("daysUntilOperationalDate", () => {
  it("computes whole-day differences regardless of time-of-day", () => {
    expect(daysUntilOperationalDate("2026-01-20", FIXED_NOW)).toBe(5);
    expect(daysUntilOperationalDate("2026-01-15", FIXED_NOW)).toBe(0);
    expect(daysUntilOperationalDate("2026-01-10", FIXED_NOW)).toBe(-5);
  });

  it("returns null when the date cannot be parsed", () => {
    expect(daysUntilOperationalDate("", FIXED_NOW)).toBeNull();
  });
});

describe("isOperationalDateOverdue", () => {
  it("is true only for dates strictly in the past", () => {
    expect(isOperationalDateOverdue("2026-01-14", FIXED_NOW)).toBe(true);
    expect(isOperationalDateOverdue("2026-01-15", FIXED_NOW)).toBe(false);
    expect(isOperationalDateOverdue("2026-01-16", FIXED_NOW)).toBe(false);
  });

  it("is false when there is no date", () => {
    expect(isOperationalDateOverdue(null, FIXED_NOW)).toBe(false);
  });
});

describe("isOperationalDateDueWithin", () => {
  it("includes today and the boundary day, excludes overdue and out-of-range dates", () => {
    expect(isOperationalDateDueWithin("2026-01-15", 7, FIXED_NOW)).toBe(true);
    expect(isOperationalDateDueWithin("2026-01-22", 7, FIXED_NOW)).toBe(true);
    expect(isOperationalDateDueWithin("2026-01-23", 7, FIXED_NOW)).toBe(false);
    expect(isOperationalDateDueWithin("2026-01-14", 7, FIXED_NOW)).toBe(false);
  });
});

describe("isYesLike", () => {
  it("accepts common truthy aliases including ok", () => {
    for (const value of ["true", "T", "1", "sim", "s", "yes", "y", "ok"]) {
      expect(isYesLike(value)).toBe(true);
    }
  });

  it("passes booleans through directly", () => {
    expect(isYesLike(true)).toBe(true);
    expect(isYesLike(false)).toBe(false);
  });

  it("rejects unrelated text", () => {
    expect(isYesLike("nao")).toBe(false);
    expect(isYesLike("")).toBe(false);
  });
});

describe("hasRelatorioEnviado", () => {
  it("is true when relatorio_status is enviado", () => {
    expect(hasRelatorioEnviado(makeInquerito({ relatorio_status: "enviado" }))).toBe(true);
  });

  it("is true when relatorio_enviado is yes-like", () => {
    expect(hasRelatorioEnviado(makeInquerito({ relatorio_enviado: "sim" }))).toBe(true);
  });

  it("is true when a report date is present even without an explicit status", () => {
    expect(hasRelatorioEnviado(makeInquerito({ data_relatorio: "2026-01-01" }))).toBe(true);
    expect(hasRelatorioEnviado(makeInquerito({ data_envio_relatorio: "2026-01-01" }))).toBe(true);
  });

  it("is false when there is no report signal at all", () => {
    expect(hasRelatorioEnviado(makeInquerito({}))).toBe(false);
  });
});

describe("isInqueritoEmAndamento", () => {
  it("is false once a relatorio has been sent", () => {
    expect(isInqueritoEmAndamento(makeInquerito({ relatorio_status: "enviado" }))).toBe(false);
  });

  it("is false for closed-sounding situacao/status_diligencias", () => {
    for (const situacao of ["Arquivado", "Finalizado", "Encerrado", "Cancelado", "Baixado"]) {
      expect(isInqueritoEmAndamento(makeInquerito({ situacao }))).toBe(false);
    }
  });

  it("is true for an open case with no report sent", () => {
    expect(isInqueritoEmAndamento(makeInquerito({ situacao: "Em andamento" }))).toBe(true);
    expect(isInqueritoEmAndamento(makeInquerito({}))).toBe(true);
  });
});
