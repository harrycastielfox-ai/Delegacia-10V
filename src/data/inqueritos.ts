import { INQUERITOS_AMOSTRA } from "@/data/sipi";

export type VisibilidadeCaso = "Público" | "Privado";

export type InqueritoCaso = {
  id: string;
  ppe: string;
  numeroFisico?: string;
  numeroBo?: string;
  prioridade: string;
  dataFato: string;
  dataInstauracao?: string;
  prazo?: string;
  dataLimite?: string;
  diasCorridos: number;
  tipificacao: string;
  gravidade: string;
  tipo: string;
  reuPreso: boolean;
  vitima?: string;
  autorInvestigado?: string;
  autorDeterminado?: string;
  vinculadoFaccao?: string;
  nomeFaccao?: string;
  bairroDistrito: string;
  motivacao?: string;
  equipeResponsavel?: string;
  escrivao?: string;
  situacao?: string;
  statusDiligencias: string;
  diligenciasPendentes?: string;
  ultimaAtualizacao?: string;
  medidaProtetiva?: string;
  numeroProcessoMedida?: string;
  relatorioEnviado?: string;
  dataEnvioRelatorio?: string;
  observacoes?: string;
  visibilidade: VisibilidadeCaso;
};

export const INQUERITOS_CASOS: InqueritoCaso[] = INQUERITOS_AMOSTRA.map((item) => ({
  id: item.ppe.replace(/\//g, "-"),
  ppe: item.ppe,
  prioridade: item.prior,
  dataFato: item.dataFato,
  diasCorridos: item.dias,
  tipificacao: item.tipif,
  gravidade: item.grav,
  tipo: item.tipo,
  reuPreso: item.reuPreso,
  bairroDistrito: item.bairro,
  statusDiligencias: item.status,
  situacao: item.status,
  visibilidade: "Público",
  observacoes: "",
}));

export function getInqueritoByCaseId(caseId: string) {
  const safeDecode = (value: string) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  const raw = (caseId ?? "").trim();
  if (!raw) return undefined;

  const decoded = safeDecode(raw);
  const candidates = Array.from(
    new Set([
      raw,
      decoded,
      raw.replace(/-/g, "/"),
      decoded.replace(/-/g, "/"),
    ]),
  );

  return INQUERITOS_CASOS.find((item) => {
    const legacyId = item.ppe.replace(/\//g, "-");
    return candidates.some((candidate) => candidate === item.id || candidate === item.ppe || candidate === legacyId);
  });
}
