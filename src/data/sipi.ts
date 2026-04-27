// Dados reais extraídos da planilha "Controle de Procedimentos e Representações"
// Delegacia Territorial de Itabela - 23ª COORPIN
// Atualizado em: 22/10/2025

export const META = {
  unidade: "Delegacia Territorial de Itabela — 23ª COORPIN",
  atualizadoEm: "22/10/2025 às 01:01",
};

// Panorama geral
export const PANORAMA = {
  totalCadastrados: 668,
  relatorioEnviado: 285,
  taxaConclusao: 42.66, // %
  metaConclusao: 45,
  prazoCritico: 574, // < 3 dias
  prioridadeAlta: 331,
  reuPreso: 30,
  representacoesDeferidas: 8,
  medidasProtetivas: 43,
  emAndamento: 174,
  relatadosNaoEnviados: 2,
};

// Procedimentos por tipo
export const PROCEDIMENTOS = [
  { sigla: "IP", nome: "Inquéritos Policiais", total: 623, pendentes: 372 },
  { sigla: "APF", nome: "Autos de Prisão em Flagrante", total: 38, pendentes: 6 },
  { sigla: "TCO", nome: "Termos Circunstanciados", total: 5, pendentes: 0 },
  { sigla: "BOC", nome: "Boletim de Ocorrência Circ.", total: 1, pendentes: 0 },
  { sigla: "AIAI", nome: "Auto de Investigação de Ato Infracional", total: 1, pendentes: 0 },
];

// Pendentes específicos
export const PENDENTES_ESPECIFICOS = [
  { label: "IP de CVLI sem relatar", value: 188 },
  { label: "IP de Crimes Sexuais sem relatar", value: 25 },
  { label: "IP de Violência Doméstica sem relatar", value: 10 },
  { label: "APF não relatados", value: 6 },
];

// Análise por gravidade (do dashboard executivo)
export const POR_GRAVIDADE = [
  { name: "CVLI", value: 234 },
  { name: "Crimes Patrimoniais", value: 97 },
  { name: "Outros", value: 77 },
  { name: "Violência Doméstica", value: 74 },
  { name: "Crimes Violentos", value: 52 },
  { name: "Crimes de Trânsito", value: 45 },
  { name: "Crimes Sexuais", value: 42 },
  { name: "MIAE", value: 17 },
  { name: "Drogas", value: 16 },
  { name: "Vio. Criança/Adolesc.", value: 13 },
];

// Status diligências
export const POR_STATUS = [
  { name: "Concluída", value: 283, color: "var(--success)" },
  { name: "Pendente", value: 199, color: "var(--warning)" },
  { name: "Em Andamento", value: 174, color: "var(--info)" },
  { name: "Aguardando Terceiros", value: 7, color: "var(--purple)" },
  { name: "Aguard. Aprovação", value: 3, color: "var(--destructive)" },
];

// Por prioridade
export const POR_PRIORIDADE = [
  { name: "Alta", value: 331, color: "var(--destructive)" },
  { name: "Média", value: 210, color: "var(--warning)" },
  { name: "Baixa", value: 125, color: "var(--info)" },
];

// CVLI comparativo histórico (planilha "Dashboards CVLI")
export const CVLI_MENSAL = [
  { mes: "Jan", r2023: 1, e2023: 1, r2024: 0, e2024: 0, r2025: 4, e2025: 4, r2026: 3, e2026: 1 },
  { mes: "Fev", r2023: 3, e2023: 0, r2024: 0, e2024: 0, r2025: 3, e2025: 2, r2026: 1, e2026: 1 },
  { mes: "Mar", r2023: 1, e2023: 1, r2024: 0, e2024: 0, r2025: 1, e2025: 0, r2026: 2, e2026: 2 },
  { mes: "Abr", r2023: 1, e2023: 1, r2024: 0, e2024: 0, r2025: 6, e2025: 4, r2026: 0, e2026: 0 },
  { mes: "Mai", r2023: 1, e2023: 1, r2024: 1, e2024: 1, r2025: 1, e2025: 1, r2026: 0, e2026: 0 },
  { mes: "Jun", r2023: 1, e2023: 1, r2024: 1, e2024: 1, r2025: 1, e2025: 0, r2026: 0, e2026: 0 },
  { mes: "Jul", r2023: 1, e2023: 1, r2024: 3, e2024: 3, r2025: 3, e2025: 2, r2026: 0, e2026: 0 },
  { mes: "Ago", r2023: 2, e2023: 1, r2024: 4, e2024: 1, r2025: 3, e2025: 0, r2026: 0, e2026: 0 },
  { mes: "Set", r2023: 2, e2023: 1, r2024: 3, e2024: 3, r2025: 1, e2025: 1, r2026: 0, e2026: 0 },
  { mes: "Out", r2023: 2, e2023: 2, r2024: 0, e2024: 0, r2025: 4, e2025: 2, r2026: 0, e2026: 0 },
  { mes: "Nov", r2023: 1, e2023: 0, r2024: 6, e2024: 2, r2025: 0, e2025: 0, r2026: 0, e2026: 0 },
  { mes: "Dez", r2023: 3, e2023: 2, r2024: 0, e2024: 0, r2025: 2, e2025: 1, r2026: 0, e2026: 0 },
];

export const CVLI_ANUAL = [
  { ano: "2023", registros: 19, elucidados: 12, taxa: 63.2 },
  { ano: "2024", registros: 18, elucidados: 11, taxa: 61.1 },
  { ano: "2025", registros: 29, elucidados: 17, taxa: 58.6 },
  { ano: "2026", registros: 6, elucidados: 4, taxa: 66.7 },
];

// Bairros / distritos
export const POR_BAIRRO = [
  { bairro: "Centro", total: 190, cvli: 34, alta: 63 },
  { bairro: "Bandeirante", total: 63, cvli: 19, alta: 27 },
  { bairro: "Ouro Verde", total: 41, cvli: 8, alta: 14 },
  { bairro: "Monte Pascoal", total: 30, cvli: 10, alta: 12 },
  { bairro: "Pereirão", total: 21, cvli: 4, alta: 7 },
  { bairro: "Irmã Dulce", total: 11, cvli: 3, alta: 6 },
  { bairro: "Dapezão", total: 10, cvli: 6, alta: 8 },
  { bairro: "Montinho", total: 7, cvli: 0, alta: 4 },
  { bairro: "Francisqueto", total: 6, cvli: 3, alta: 3 },
  { bairro: "Jaqueira", total: 1, cvli: 0, alta: 1 },
  { bairro: "Outros", total: 39, cvli: 6, alta: 14 },
];

// Representações Judiciais (panorama)
export const REPRESENTACOES = {
  total: 12,
  indeferidas: 1,
  taxaDeferimento: 91.7,
  cumpridas: 3,
  pendentes: 1,
  taxaCumprimento: 25,
};

export const REPRESENTACOES_TIPO = [
  { tipo: "Prisão Temporária", total: 2, deferidas: 1, cumpridas: 0 },
  { tipo: "Prisão Preventiva", total: 2, deferidas: 0, cumpridas: 0 },
  { tipo: "Busca e Apreensão", total: 4, deferidas: 4, cumpridas: 2 },
  { tipo: "Quebra de Sigilo / Interceptação", total: 3, deferidas: 3, cumpridas: 1 },
  { tipo: "Outros", total: 1, deferidas: 0, cumpridas: 0 },
];

// Lista de representações (amostra real)
export const REPRESENTACOES_LISTA = [
  { id: 1, ppe: "72921/2025", vitima: "Jose Vitor Carvalho de Jesus", investigado: "Ana Luiza Santos", data: "03/11/2025", tipo: "Outros", processo: "8001619-92.2025.8.05.0111", status: "Em análise" },
  { id: 2, ppe: "28259/2025", vitima: "Maria Angelina Resende de Jesus", investigado: "Silvanio Alves Lacerda", data: "03/11/2025", tipo: "Prisão Preventiva", processo: "8001618-10.2025.8.05.0111", status: "Aguardando Análise Judicial" },
  { id: 3, ppe: "118411/2025", vitima: "(Estado)", investigado: "Ionan G. Toscano de Britto; Vanderson Pena", data: "06/11/2025", tipo: "Prisão Temporária", processo: "8001651-97.2025.8.05.0111", status: "Indeferida" },
  { id: 4, ppe: "118411/2025", vitima: "(Estado)", investigado: "Ionan G. Toscano + 2", data: "06/11/2025", tipo: "Busca e Apreensão Domiciliar", processo: "8001651-97.2025.8.05.0111", status: "Cumprida (Positiva)" },
  { id: 5, ppe: "118411/2025", vitima: "(Estado)", investigado: "Ionan G. Toscano + 2", data: "06/11/2025", tipo: "Interceptação Telefônica", processo: "8001651-97.2025.8.05.0111", status: "Deferida" },
];

// Estatísticas do período (Abr/2026)
export const PERIODO = {
  inicial: "01/04/2026",
  final: "30/04/2026",
  instaurados: 7,
  relatorios: 29,
  apf: 1,
  mpu: 1,
  tco: 0,
  cvli: 0,
  cvliElucidados: 2,
  prisoes: 2,
  patrimonio: 1,
  taxaConclusao: 414.3, // 29/7
};

// Equipe (do controle: 644 com DT Itabela + escrivães)
export const EQUIPES = [
  { name: "DT Itabela (Geral)", value: 644, pct: 96 },
  { name: "Esc. Adrieli Souza", value: 18, pct: 3 },
  { name: "Outros", value: 6, pct: 1 },
];

// Amostra real de inquéritos (primeiros casos)
export const INQUERITOS_AMOSTRA = [
  { ppe: "29777/2026", prior: "ALTA", dataFato: "25/06/2026", dias: 102, tipif: "MORTE POR INTERVENÇÃO DE AGENTE DE SEG. PÚBLICA", grav: "MIAE", tipo: "IP", reuPreso: false, bairro: "Bandeirante", status: "Em Andamento" },
  { ppe: "1476/2026", prior: "MÉDIA", dataFato: "10/04/2026", dias: -4, tipif: "TRÁFICO DE DROGAS (Art. 33 Lei 11.343/2006)", grav: "Drogas", tipo: "BOC", reuPreso: true, bairro: "Ouro Verde", status: "Em Andamento" },
  { ppe: "33908/2026", prior: "ALTA", dataFato: "06/04/2026", dias: -7, tipif: "FURTO QUALIFICADO C/ ROMPIMENTO DE OBSTÁCULO", grav: "Patrimônio", tipo: "APF", reuPreso: true, bairro: "Centro", status: "Em Andamento" },
  { ppe: "8390/2026", prior: "BAIXA", dataFato: "01/04/2026", dias: 17, tipif: "DESOBEDIÊNCIA (Art. 330 CPB)", grav: "Outro", tipo: "TCO", reuPreso: false, bairro: "Centro", status: "Concluída" },
  { ppe: "32786/2026", prior: "ALTA", dataFato: "30/03/2026", dias: 18, tipif: "ESTUPRO DE VULNERÁVEL (Art. 217-A CPB)", grav: "Sexuais", tipo: "IP", reuPreso: false, bairro: "Centro", status: "Concluída" },
  { ppe: "9300/2026", prior: "MÉDIA", dataFato: "30/03/2026", dias: 16, tipif: "PERTURBAÇÃO DO TRABALHO OU DO SOSSEGO ALHEIO", grav: "Outro", tipo: "TCO", reuPreso: false, bairro: "Irmã Dulce", status: "Em Andamento" },
  { ppe: "29200/2026", prior: "MÉDIA", dataFato: "24/03/2026", dias: -11, tipif: "ADULTERAÇÃO DE SINAL DE VEÍCULO + RECEPTAÇÃO", grav: "Outro", tipo: "APF", reuPreso: true, bairro: "Zona Rural", status: "Concluída" },
  { ppe: "28764/2026", prior: "MÉDIA", dataFato: "23/03/2026", dias: -12, tipif: "FURTO + CORROMPER MENORES", grav: "Patrimônio", tipo: "APF", reuPreso: true, bairro: "—", status: "Concluída" },
  { ppe: "1195/2026", prior: "BAIXA", dataFato: "23/03/2026", dias: -22, tipif: "FURTO (Art. 155 CPB)", grav: "Patrimônio", tipo: "APF", reuPreso: true, bairro: "Centro", status: "Concluída" },
  { ppe: "28908/2026", prior: "ALTA", dataFato: "22/03/2026", dias: -6, tipif: "ROUBO COM EMPREGO DE ARMA DE FOGO", grav: "Violento", tipo: "APF", reuPreso: true, bairro: "Ouro Verde", status: "Concluída" },
  { ppe: "27180/2026", prior: "MÉDIA", dataFato: "18/03/2026", dias: -17, tipif: "TRÁFICO DE DROGAS + PORTE ILEGAL DE ARMA", grav: "Drogas", tipo: "APF", reuPreso: true, bairro: "Pereirão", status: "Em Andamento" },
  { ppe: "25870/2026", prior: "ALTA", dataFato: "15/03/2026", dias: -2, tipif: "HOMICÍDIO QUALIFICADO POR EMBOSCADA", grav: "CVLI", tipo: "IP", reuPreso: false, bairro: "Village (Jaqueira)", status: "Em Andamento" },
  { ppe: "25872/2026", prior: "ALTA", dataFato: "14/03/2026", dias: 0, tipif: "HOMICÍDIO QUALIFICADO POR EMBOSCADA", grav: "CVLI", tipo: "IP", reuPreso: false, bairro: "Village (Jaqueira)", status: "Em Andamento" },
  { ppe: "24962/2026", prior: "MÉDIA", dataFato: "11/03/2026", dias: -2, tipif: "AMEAÇA — VIOLÊNCIA DOMÉSTICA CONTRA A MULHER", grav: "Vio. Doméstica", tipo: "IP", reuPreso: false, bairro: "Outros", status: "Concluída" },
  { ppe: "23825/2026", prior: "ALTA", dataFato: "10/03/2026", dias: -5, tipif: "MORTE POR INTERVENÇÃO DE AGENTE DE SEG. PÚBLICA", grav: "MIAE", tipo: "IP", reuPreso: false, bairro: "Irmã Dulce", status: "Em Andamento" },
  { ppe: "24037/2026", prior: "ALTA", dataFato: "10/03/2026", dias: -5, tipif: "MORTE POR INTERVENÇÃO DE AGENTE DE SEG. PÚBLICA", grav: "MIAE", tipo: "IP", reuPreso: false, bairro: "Zona Rural", status: "Em Andamento" },
  { ppe: "23261/2026", prior: "MÉDIA", dataFato: "09/03/2026", dias: -26, tipif: "POSSE IRREGULAR DE ARMA DE FOGO", grav: "Outro", tipo: "APF", reuPreso: true, bairro: "Zona Rural", status: "Em Andamento" },
  { ppe: "23587/2026", prior: "MÉDIA", dataFato: "09/03/2026", dias: -26, tipif: "FURTO QUALIFICADO MEDIANTE CONCURSO", grav: "Outro", tipo: "APF", reuPreso: true, bairro: "Monte Pascoal", status: "Em Andamento" },
  { ppe: "24963/2026", prior: "MÉDIA", dataFato: "27/02/2026", dias: -2, tipif: "IMPORTUNAÇÃO SEXUAL (Art. 215-A CPB)", grav: "Vio. Criança", tipo: "IP", reuPreso: false, bairro: "Outros", status: "Concluída" },
];

// Elucidações por equipe (CVLI 2025)
export const ELUCIDACOES_EQUIPE = [
  { equipe: "IPC Marluan / IPC Rivaldo", jan: 4, fev: 2, mar: 1, abr: 4, mai: 4, jun: 0, jul: 2, ago: 0, set: 1, out: 3, nov: 0, dez: 0, total: 21 },
];
