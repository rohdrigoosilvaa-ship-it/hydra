import type { RiskLevel } from "./types";

/** Matriz 4x4 do PGR: linhas = frequência/probabilidade, colunas = severidade/potencial de dano. */
const MATRIX: RiskLevel[][] = [
  ["IRRELEVANT", "LOW", "LOW", "MEDIUM"],
  ["LOW", "LOW", "MEDIUM", "HIGH"],
  ["LOW", "MEDIUM", "HIGH", "HIGH"],
  ["MEDIUM", "HIGH", "HIGH", "CRITICAL"],
];

export const clampScale = (n: number) => Math.min(4, Math.max(1, Math.round(n) || 1));

export function riskLevelOf(probability: number, severity: number): RiskLevel {
  return MATRIX[clampScale(probability) - 1]![clampScale(severity) - 1]!;
}

export const MATRIX_LEVEL_LABEL: Record<RiskLevel, string> = {
  IRRELEVANT: "Irrelevante",
  LOW: "Baixo",
  MEDIUM: "Médio",
  HIGH: "Alto",
  CRITICAL: "Crítico",
};

/** Cores da tabela de referência (fundo das células). */
export const MATRIX_LEVEL_COLOR: Record<RiskLevel, string> = {
  IRRELEVANT: "#00c800",
  LOW: "#00b050",
  MEDIUM: "#ffd966",
  HIGH: "#f4b183",
  CRITICAL: "#ff0000",
};

export const PROBABILITY_OPTIONS = [
  { value: 1, label: "1 — Ocasional" },
  { value: 2, label: "2 — Intermitente" },
  { value: 3, label: "3 — Habitual" },
  { value: 4, label: "4 — Permanente" },
];

export const SEVERITY_OPTIONS = [
  { value: 1, label: "1 — Leve" },
  { value: 2, label: "2 — Moderado" },
  { value: 3, label: "3 — Sério" },
  { value: 4, label: "4 — Severo" },
];

/** Classificação do risco (Aceitável … Intolerável), calculada junto com o nível. */
export const MATRIX_CLASSIFICATION: Record<RiskLevel, string> = {
  IRRELEVANT: "Aceitável",
  LOW: "Tolerável",
  MEDIUM: "Moderado",
  HIGH: "Substancial",
  CRITICAL: "Intolerável",
};
