import { describe, expect, it } from "vitest";
import {
  buildModuleAlerts,
  buildSmartAlerts,
  countModuleAlertsTotal,
  isValidModulo,
} from "./alertasInteligentes";
import type { InqueritoRecord } from "@/lib/repositories/inqueritosRepository";
import type { RepresentacaoRecord } from "@/lib/repositories/representacoesRepository";

function makeInquerito(overrides: Partial<InqueritoRecord> = {}): InqueritoRecord {
  return {
    id: "inq-1",
    codigo_interno: null,
    numero_ppe: "PPE-1",
    numero_fisico: null,
    numero_bo: null,
    origem_registro: null,
    visibilidade: null,
    tipo: null,
    tipo_procedimento_normalizado: null,
    tipificacao: "furto",
    gravidade: null,
    categoria_criminal: null,
    prioridade: null,
    prioridade_operacional: null,
    situacao: "em andamento",
    status_diligencias: "concluida",
    data_fato: "2026-01-01",
    data_instauracao: "2026-01-02",
    prazo: null,
    dias_decorridos: null,
    bairro: null,
    distrito: null,
    vitima: "Fulano",
    investigado: "Ciclano",
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
    equipe: "Equipe A",
    equipe_responsavel: null,
    escrivao: null,
    escrivao_responsavel_id: null,
    relatorio_enviado: null,
    relatorio_status: "pendente",
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

function makeRepresentacao(overrides: Partial<RepresentacaoRecord> = {}): RepresentacaoRecord {
  return {
    id: "rep-1",
    codigo_interno: null,
    inquerito_id: null,
    justificativa_sem_inquerito: null,
    numero_ppe: "PPE-1",
    processo_judicial: "0001-2026",
    tipo: "Prisão Preventiva",
    tipo_normalizado: null,
    data_representacao: "2026-01-01",
    responsavel: null,
    vitima: "Fulano",
    investigado: "Ciclano",
    autor_preso: null,
    resumo_fatos: null,
    fundamentacao: null,
    objetivo: null,
    diligencias_relacionadas: null,
    status: "Em elaboração",
    data_envio_judiciario: null,
    data_decisao_judicial: null,
    vara_juizo: null,
    prazo_concedido_dias: null,
    data_vencimento: null,
    observacoes_decisao: null,
    data_cumprimento: null,
    cumprimento_status: null,
    equipe_cumprimento: null,
    resultado_cumprimento: null,
    observacoes_cumprimento: null,
    prioridade_operacional: null,
    equipe_responsavel: "Equipe A",
    acompanhamento_especial: null,
    pedido_sigiloso: null,
    pedido_sigiloso_normalizado: null,
    medida_protetiva_normalizada: null,
    observacoes_internas: null,
    created_at: null,
    updated_at: null,
    deleted_at: null,
    ...overrides,
  };
}

describe("buildSmartAlerts — inqueritos", () => {
  it("flags an overdue prazo on an active case as critico", () => {
    const alerts = buildSmartAlerts([makeInquerito({ prazo: "2026-01-01" })], []);
    const alert = alerts.find((a) => a.id === "inq-inq-1-vencido");
    expect(alert?.severity).toBe("critico");
  });

  it("does not raise a prazo alert for a case that is no longer in andamento", () => {
    const alerts = buildSmartAlerts(
      [makeInquerito({ prazo: "2026-01-01", relatorio_status: "enviado" })],
      [],
    );
    expect(alerts.some((a) => a.category === "prazo")).toBe(false);
  });

  it("flags réu preso and medida protetiva as alto", () => {
    const alerts = buildSmartAlerts(
      [
        makeInquerito({ reu_preso: "sim" }),
        makeInquerito({ id: "inq-2", medida_protetiva: "sim" }),
      ],
      [],
    );
    expect(alerts.find((a) => a.id === "inq-inq-1-preso")?.severity).toBe("alto");
    expect(alerts.find((a) => a.id === "inq-inq-2-medida")?.severity).toBe("alto");
  });

  it("flags CVLI/homicídio without relatório as critico, but not once sent", () => {
    const semRelatorio = buildSmartAlerts(
      [makeInquerito({ tipificacao: "Homicídio qualificado" })],
      [],
    );
    expect(semRelatorio.find((a) => a.id === "inq-inq-1-cvli-sem-rel")?.severity).toBe("critico");

    const comRelatorio = buildSmartAlerts(
      [makeInquerito({ tipificacao: "Homicídio qualificado", relatorio_status: "enviado" })],
      [],
    );
    expect(comRelatorio.some((a) => a.id === "inq-inq-1-cvli-sem-rel")).toBe(false);
  });

  it("flags missing essential fields as dados incompletos", () => {
    const alerts = buildSmartAlerts([makeInquerito({ numero_ppe: null })], []);
    expect(alerts.find((a) => a.id === "inq-inq-1-incompleto")?.severity).toBe("baixo");
  });

  it("does not flag a fully filled active case as incomplete", () => {
    const alerts = buildSmartAlerts([makeInquerito()], []);
    expect(alerts.some((a) => a.id === "inq-inq-1-incompleto")).toBe(false);
  });
});

describe("buildSmartAlerts — representações", () => {
  it("flags a sigilosa representação and masks the principal as Sigiloso", () => {
    const alerts = buildSmartAlerts(
      [],
      [makeRepresentacao({ pedido_sigiloso_normalizado: true, vitima: "Nome Real" })],
    );
    const alert = alerts.find((a) => a.id === "rep-rep-1-sigilosa");
    expect(alert?.severity).toBe("alto");
    expect(alert?.principal).toBe("Sigiloso");
  });

  it("flags an overdue representação as critico and not simultaneously as vencendo", () => {
    const alerts = buildSmartAlerts(
      [],
      [makeRepresentacao({ status: "Deferida", data_vencimento: "2026-01-01" })],
    );
    expect(alerts.find((a) => a.id === "rep-rep-1-vencida")?.severity).toBe("critico");
    expect(alerts.some((a) => a.id === "rep-rep-1-vencendo")).toBe(false);
  });

  it("does not flag a vencida representação that has already been cumprida", () => {
    const alerts = buildSmartAlerts(
      [],
      [
        makeRepresentacao({
          status: "Cumprida",
          data_vencimento: "2026-01-01",
          cumprimento_status: "cumprido",
        }),
      ],
    );
    expect(alerts.some((a) => a.id === "rep-rep-1-vencida")).toBe(false);
  });

  it("flags missing judicial fields as dados incompletos", () => {
    const alerts = buildSmartAlerts([], [makeRepresentacao({ processo_judicial: null })]);
    expect(alerts.find((a) => a.id === "rep-rep-1-incompleta")?.severity).toBe("baixo");
  });
});

describe("buildModuleAlerts / countModuleAlertsTotal", () => {
  it("buckets alerts by severity and category without double counting the total", () => {
    const smartAlerts = buildSmartAlerts(
      [makeInquerito({ prazo: "2026-01-01" })],
      [makeRepresentacao({ pedido_sigiloso_normalizado: true })],
    );
    const moduleAlerts = buildModuleAlerts(smartAlerts);

    expect(moduleAlerts.criticos.every((a) => a.severity === "critico")).toBe(true);
    expect(moduleAlerts.sigilosas).toHaveLength(1);
    expect(countModuleAlertsTotal(moduleAlerts)).toBe(new Set(smartAlerts.map((a) => a.id)).size);
  });
});

describe("isValidModulo", () => {
  it("accepts known module keys and rejects unknown strings", () => {
    expect(isValidModulo("criticos")).toBe(true);
    expect(isValidModulo("sigilosas")).toBe(true);
    expect(isValidModulo("modulo-inexistente")).toBe(false);
  });
});
