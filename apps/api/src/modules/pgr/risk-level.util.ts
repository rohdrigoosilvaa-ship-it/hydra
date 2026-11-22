import type { RiskLevel } from "@hydra/db";

/**
 * Matriz 5x5 de classificação do risco: linha = probabilidade (1-5), coluna = severidade (1-5). Nível 1 a 5
 * (Irrelevante, Baixo, Médio, Alto, Crítico). É a mesma matriz da avaliação do risco no cargo.
 */
const GRID: number[][] = [
  [1, 1, 2, 3, 3],
  [1, 2, 3, 3, 4],
  [1, 2, 3, 4, 5],
  [2, 2, 3, 4, 5],
  [2, 3, 4, 5, 5],
];
const LEVELS: RiskLevel[] = ["IRRELEVANT", "LOW", "MEDIUM", "HIGH", "CRITICAL"];

const clamp = (n: number) => Math.min(5, Math.max(1, Math.round(n) || 1));

export function computeRiskLevel(probability: number, severity: number): RiskLevel {
  return LEVELS[GRID[clamp(probability) - 1]![clamp(severity) - 1]! - 1]!;
}

const LABEL: Record<RiskLevel, string> = { IRRELEVANT: "Irrelevante", LOW: "Baixo", MEDIUM: "Médio", HIGH: "Alto", CRITICAL: "Crítico" };

/** Nível de risco por extenso (Irrelevante, Baixo, Médio, Alto, Crítico). */
export const riskLevelLabel = (level: RiskLevel) => LABEL[level];

const CLASSIFICATION: Record<RiskLevel, string> = {
  IRRELEVANT: "Aceitável",
  LOW: "Tolerável",
  MEDIUM: "Moderado",
  HIGH: "Substancial",
  CRITICAL: "Intolerável",
};

/** Classificação do risco (Aceitável … Intolerável), calculada junto com o nível. */
export const riskClassification = (level: RiskLevel) => CLASSIFICATION[level];

/** Risco ainda não avaliado: marcador sem valor (nunca é "aceitável"). */
export const NOT_EVALUATED = { probability: 1, severity: 1, riskLevel: "IRRELEVANT" as RiskLevel, classification: "Não avaliado", evaluated: false };
