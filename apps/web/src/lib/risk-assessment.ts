/** Avaliação do risco: probabilidade × severidade → nível; certeza da estimativa → resultado. */

export const PROBABILITY_OPTIONS = [
  { value: 1, label: "Raro (1)" },
  { value: 2, label: "Pouco Provável (2)" },
  { value: 3, label: "Possível (3)" },
  { value: 4, label: "Provável (4)" },
  { value: 5, label: "Muito Provável (5)" },
] as const;

export const SEVERITY_OPTIONS = [
  { value: 1, label: "Leve (1)" },
  { value: 2, label: "Baixa (2)" },
  { value: 3, label: "Moderada (3)" },
  { value: 4, label: "Alta (4)" },
  { value: 5, label: "Extrema (5)" },
] as const;

export const CERTAINTY_OPTIONS = [
  { value: 1, label: "Certeza alta (1)" },
  { value: 2, label: "Certeza média (2)" },
  { value: 3, label: "Certeza baixa (3)" },
] as const;

/** Nível de 1 (azul) a 5 (vermelho). Linha = probabilidade 1..5, coluna = severidade 1..5. */
const GRID: number[][] = [
  [1, 1, 2, 3, 3],
  [1, 2, 3, 3, 4],
  [1, 2, 3, 4, 5],
  [2, 2, 3, 4, 5],
  [2, 3, 4, 5, 5],
];

export const LEVEL_COLOR: Record<number, string> = {
  1: "#38c8f5",
  2: "#8fd14f",
  3: "#fde38c",
  4: "#ffc107",
  5: "#e2504f",
};

/** Resultado por nível (1..5) e certeza (1..3) — tabela "Risco × Certeza". */
export const RESULT_TABLE: Record<number, [string, string, string]> = {
  5: ["Ação imediata ou interrupção da atividade", "Controle e informação adicional necessários", "Controle e informação adicional necessários"],
  4: ["Controle necessário", "Controle e informação adicional necessários", "Controle e informação adicional necessários"],
  3: ["Controle adicional se for possível e viável", "Informação adicional necessária", "Informação adicional necessária"],
  2: ["Nenhum controle adicional é necessário", "Informação adicional necessária", "Informação adicional necessária"],
  1: ["Nenhuma ação é necessária", "Nenhuma informação adicional é necessária", "Nenhuma informação adicional é necessária"],
};

export const riskLevel = (probability: number | null | undefined, severity: number | null | undefined) =>
  probability && severity ? GRID[probability - 1]![severity - 1]! : null;

/** Nome e classificação de cada nível (mesmos termos do PGR). */
export const LEVEL_NAME: Record<number, { name: string; classification: string }> = {
  1: { name: "Irrelevante", classification: "Aceitável" },
  2: { name: "Baixo", classification: "Tolerável" },
  3: { name: "Médio", classification: "Moderado" },
  4: { name: "Alto", classification: "Substancial" },
  5: { name: "Crítico", classification: "Intolerável" },
};

/** Resultado = probabilidade × severidade, classificado pela matriz; a ação recomendada depende da certeza da estimativa. */
export function riskResult(probability?: number | null, severity?: number | null, certainty?: number | null) {
  const level = riskLevel(probability, severity);
  if (!level || !probability || !severity) return null;
  const { name, classification } = LEVEL_NAME[level]!;
  return {
    level,
    label: `Risco ${name} · ${classification}`,
    product: probability * severity,
    color: LEVEL_COLOR[level]!,
    action: certainty ? RESULT_TABLE[level]![certainty - 1]! : null,
  };
}

export { GRID as RISK_GRID };

export interface HelpTable {
  id: string;
  title: string;
  subtitle: string;
  headers: string[];
  rows: (string | number)[][];
  note: string;
}

const OBS = "Obs.: Esta é uma sugestão para auxiliar na escolha do nível de probabilidade, ficando sob responsabilidade do profissional habilitado a correta gradação.";

export const PROBABILITY_HELP: HelpTable[] = [
  {
    id: "fisico",
    title: "Sugestão para Avaliação Quantitativa - Risco Físico",
    subtitle: "Estimativa de Probabilidade baseada no LEO: Limite de Exposição Ocupacional (sem considerar o EPI) | AIHA (2015)",
    headers: ["Nível", "Categoria", "Níveis de Exposição"],
    rows: [
      [1, "Exposição a níveis muito baixos.", "Exposições < 10% LEO"],
      [2, "Exposição baixa", "Exposições >10% e < 50% LEO"],
      [3, "Exposição moderada", "Exposições > 50% e < 100% LEO"],
      [4, "Exposição excessiva", "Exposições > 100% a 500% LEO"],
      [5, "Exposição muito excessiva", "Exposições superiores a 5 x LEO"],
    ],
    note: OBS,
  },
  {
    id: "quimico",
    title: "Sugestão para Avaliação Qualitativa - Risco Químico",
    subtitle: "Estimativa de Probabilidade: Substâncias Químicas",
    headers: ["Nível", "Inalação/Contato direto", "Condições da atividade"],
    rows: [
      [1, "Sem possibilidade", "Sistema¹ totalmente fechado."],
      [2, "Baixa possibilidade", "Sistema¹ fechado, com pouca possibilidade de exposição durante a atividade."],
      [3, "Pouca possibilidade", "Sistema¹ semiaberto/sistema aberto com ventilação automática e barreiras de controle"],
      [4, "Média possibilidade", "Sistema¹ aberto, ventilação passiva e barreiras protetoras"],
      [5, "Alta possibilidade", "Sistema¹ aberto, sem ventilação"],
    ],
    note: `¹ Sistema se refere a fonte geradora da substância química. ${OBS}`,
  },
  {
    id: "outros",
    title: "Sugestão para Avaliação Qualitativa - Risco Mecânico/Ergonômico/Biológico",
    subtitle: "Estimativa de Probabilidade: Controle Existente X Medidas Preventivas",
    headers: ["Nível", "Categoria", "Medidas Preventivas"],
    rows: [
      [1, "Controle excelente", "Representa a melhor tecnologia ou prática de controle disponível."],
      [2, "Controle em conformidade legal", "Controle seguindo as normas legais, mantido adequadamente"],
      [3, "Controle com pequenas deficiências", "Controle adequado com pequenas deficiências na operação ou manutenção."],
      [4, "Controle deficiente", "Controle incompleto ou com deficiências relevantes."],
      [5, "Controle inexistente", "As medidas de controle são inexistentes ou totalmente inadequadas."],
    ],
    note: OBS,
  },
];

export const SEVERITY_HELP: HelpTable = {
  id: "severidade",
  title: "Sugestão para Avaliação Qualitativa - Riscos Ocupacionais",
  subtitle: "Estimativa de Severidade | AIHA (2015)",
  headers: ["Nível", "Definição"],
  rows: [
    [1, "Lesão leve sem necessidade de atenção médica, incômodos ou mal estar."],
    [2, "Lesão ou doenças sérias reversíveis."],
    [3, "Lesão ou doenças críticas irreversíveis que podem limitar a capacidade funcional."],
    [4, "Lesão ou doença incapacitante ou mortal."],
    [5, "Mortes ou incapacidades múltiplas (>10)."],
  ],
  note: "Obs.: Esta é uma sugestão para auxiliar na escolha do nível de severidade, ficando sob responsabilidade do profissional habilitado a correta gradação.",
};
