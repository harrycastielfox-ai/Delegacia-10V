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

export function toInqueritoCaseId(ppe: string) {
  return encodeURIComponent(ppe);
}

export function getInqueritoByCaseId(caseId: string) {
  const decodedCaseId = decodeURIComponent(caseId);

  return INQUERITOS_CASOS.find(
    (item) =>
      item.id === caseId ||
      item.id === decodedCaseId ||
      item.ppe === caseId ||
      item.ppe === decodedCaseId ||
      toInqueritoCaseId(item.ppe) === caseId,
  );
}
