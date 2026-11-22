import type { RiskLevel } from "./types";
import { PROBABILITY_OPTIONS, SEVERITY_OPTIONS } from "./risk-assessment";

/**
 * Matriz 5x5 do PGR: linha = probabilidade (1-5), coluna = severidade (1-5) → nível. É a mesma matriz da
 * avaliação do risco no cargo e do PDF; os níveis são os de `RiskLevel`.
 */
const GRID: number[][] = [
  [1, 1, 2, 3, 3],
  [1, 2, 3, 3, 4],
  [1, 2, 3, 4, 5],
  [2, 2, 3, 4, 5],
  [2, 3, 4, 5, 5],
];
const LEVELS: RiskLevel[] = ["IRRELEVANT", "LOW", "MEDIUM", "HIGH", "CRITICAL"];

export const clampScale = (n: number) => Math.min(5, Math.max(1, Math.round(n) || 1));

export function riskLevelOf(probability: number, severity: number): RiskLevel {
  return LEVELS[GRID[clampScale(probability) - 1]![clampScale(severity) - 1]! - 1]!;
}

export const MATRIX_LEVEL_LABEL: Record<RiskLevel, string> = {
  IRRELEVANT: "Irrelevante",
  LOW: "Baixo",
  MEDIUM: "Médio",
  HIGH: "Alto",
  CRITICAL: "Crítico",
};

/** Cores da matriz (fundo das células). */
export const MATRIX_LEVEL_COLOR: Record<RiskLevel, string> = {
  IRRELEVANT: "#38c8f5",
  LOW: "#8fd14f",
  MEDIUM: "#fde38c",
  HIGH: "#ffc107",
  CRITICAL: "#e2504f",
};

export { PROBABILITY_OPTIONS, SEVERITY_OPTIONS };

/** Classificação do risco (Aceitável … Intolerável), calculada junto com o nível. */
export const MATRIX_CLASSIFICATION: Record<RiskLevel, string> = {
  IRRELEVANT: "Aceitável",
  LOW: "Tolerável",
  MEDIUM: "Moderado",
  HIGH: "Substancial",
  CRITICAL: "Intolerável",
};
