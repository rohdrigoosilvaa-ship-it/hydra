import type { RiskLevel } from "@hydra/db";

/** Matriz 5x5 (probabilidade x severidade) — regra simples de NR-01 para o MVP. */
export function computeRiskLevel(probability: number, severity: number): RiskLevel {
  const score = probability * severity;
  if (score >= 20) return "CRITICAL";
  if (score >= 12) return "HIGH";
  if (score >= 6) return "MEDIUM";
  return "LOW";
}
