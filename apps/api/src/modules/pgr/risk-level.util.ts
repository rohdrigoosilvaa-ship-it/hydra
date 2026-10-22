import type { RiskLevel } from "@hydra/db";

/**
 * Matriz 4x4 de classificação do risco: linhas = frequência/probabilidade (1-4),
 * colunas = severidade/potencial de dano (1-4). Não é só o produto — ex.: 4 pode ser Baixo ou Médio.
 */
const MATRIX: RiskLevel[][] = [
  ["IRRELEVANT", "LOW", "LOW", "MEDIUM"],
  ["LOW", "LOW", "MEDIUM", "HIGH"],
  ["LOW", "MEDIUM", "HIGH", "HIGH"],
  ["MEDIUM", "HIGH", "HIGH", "CRITICAL"],
];

const clamp = (n: number) => Math.min(4, Math.max(1, Math.round(n) || 1));

/** Valores antigos de 5 (escala anterior) contam como o máximo da matriz. */
export function computeRiskLevel(probability: number, severity: number): RiskLevel {
  return MATRIX[clamp(probability) - 1]![clamp(severity) - 1]!;
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
