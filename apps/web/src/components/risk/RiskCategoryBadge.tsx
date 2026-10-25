import type { RiskCategory } from "../../lib/types";

/** Cor de cada categoria de risco, para achar rápido na lista (físico verde, químico vermelho, biológico marrom, ergonômico amarelo, acidente azul). */
export const CATEGORY_COLOR: Record<RiskCategory, { bg: string; fg: string; label: string }> = {
  FISICO: { bg: "#2e9e6a", fg: "#ffffff", label: "Físicos" },
  QUIMICO: { bg: "#c8433b", fg: "#ffffff", label: "Químicos" },
  BIOLOGICO: { bg: "#8a6a4b", fg: "#ffffff", label: "Biológicos" },
  ERGONOMICO: { bg: "#f2c037", fg: "#3a2f00", label: "Ergonômicos" },
  ACIDENTE: { bg: "#1f8fd1", fg: "#ffffff", label: "Acidentes" },
};

export function RiskCategoryBadge({ category }: { category: RiskCategory }) {
  const c = CATEGORY_COLOR[category];
  return (
    <span className="inline-block whitespace-nowrap rounded px-2 py-1 text-xs font-semibold" style={{ background: c.bg, color: c.fg }}>
      {c.label}
    </span>
  );
}
