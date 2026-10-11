/**
 * Dimensionamento da CIPA — Quadro I da NR-05 (nº de membros por grau de
 * risco e faixa de empregados). Os números são por lado (empregador e
 * empregados têm representação simétrica).
 */

interface DimensionamentoCell {
  efetivos: number;
  suplentes: number;
}

interface FaixaEmpregados {
  min: number;
  max: number;
  label: string;
  /** Índice 0-3 = grau de risco 1-4. `null` = CIPA dispensada nessa combinação. */
  porGrau: [DimensionamentoCell | null, DimensionamentoCell | null, DimensionamentoCell | null, DimensionamentoCell | null];
}

const QUADRO_I_CIPA: FaixaEmpregados[] = [
  { min: 0, max: 19, label: "0 a 19", porGrau: [null, null, null, null] },
  { min: 20, max: 29, label: "20 a 29", porGrau: [null, null, { efetivos: 1, suplentes: 1 }, { efetivos: 1, suplentes: 1 }] },
  { min: 30, max: 50, label: "30 a 50", porGrau: [null, null, { efetivos: 1, suplentes: 1 }, { efetivos: 2, suplentes: 1 }] },
  { min: 51, max: 80, label: "51 a 80", porGrau: [null, { efetivos: 1, suplentes: 1 }, { efetivos: 2, suplentes: 1 }, { efetivos: 3, suplentes: 2 }] },
  { min: 81, max: 100, label: "81 a 100", porGrau: [{ efetivos: 1, suplentes: 1 }, { efetivos: 1, suplentes: 1 }, { efetivos: 2, suplentes: 1 }, { efetivos: 3, suplentes: 2 }] },
  { min: 101, max: 120, label: "101 a 120", porGrau: [{ efetivos: 1, suplentes: 1 }, { efetivos: 2, suplentes: 1 }, { efetivos: 2, suplentes: 1 }, { efetivos: 4, suplentes: 2 }] },
  { min: 121, max: 140, label: "121 a 140", porGrau: [{ efetivos: 1, suplentes: 1 }, { efetivos: 2, suplentes: 1 }, { efetivos: 3, suplentes: 2 }, { efetivos: 4, suplentes: 2 }] },
  { min: 141, max: 300, label: "141 a 300", porGrau: [{ efetivos: 1, suplentes: 1 }, { efetivos: 3, suplentes: 2 }, { efetivos: 4, suplentes: 2 }, { efetivos: 4, suplentes: 3 }] },
  { min: 301, max: 500, label: "301 a 500", porGrau: [{ efetivos: 2, suplentes: 2 }, { efetivos: 4, suplentes: 3 }, { efetivos: 5, suplentes: 4 }, { efetivos: 5, suplentes: 4 }] },
  { min: 501, max: 1000, label: "501 a 1000", porGrau: [{ efetivos: 4, suplentes: 3 }, { efetivos: 5, suplentes: 4 }, { efetivos: 6, suplentes: 4 }, { efetivos: 6, suplentes: 5 }] },
  { min: 1001, max: 2500, label: "1001 a 2500", porGrau: [{ efetivos: 5, suplentes: 4 }, { efetivos: 6, suplentes: 5 }, { efetivos: 8, suplentes: 6 }, { efetivos: 9, suplentes: 7 }] },
  { min: 2501, max: 5000, label: "2501 a 5000", porGrau: [{ efetivos: 6, suplentes: 5 }, { efetivos: 8, suplentes: 6 }, { efetivos: 10, suplentes: 8 }, { efetivos: 11, suplentes: 8 }] },
  { min: 5001, max: 10000, label: "5001 a 10000", porGrau: [{ efetivos: 8, suplentes: 6 }, { efetivos: 10, suplentes: 8 }, { efetivos: 12, suplentes: 8 }, { efetivos: 13, suplentes: 10 }] },
];

/** Acréscimo de membros por grupo de 2.500 empregados acima de 10.000. */
const INCREMENTO_ACIMA_10000: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 2 };

export interface DimensionamentoCipaResult {
  faixaLabel: string;
  titularesEmpregados: number;
  suplentesEmpregados: number;
  titularesOrganizacao: number;
  suplentesOrganizacao: number;
  totalMembros: number;
  semObrigatoriedade: boolean;
}

function buildResult(faixaLabel: string, efetivos: number, suplentes: number): DimensionamentoCipaResult {
  return {
    faixaLabel,
    titularesEmpregados: efetivos,
    suplentesEmpregados: suplentes,
    titularesOrganizacao: efetivos,
    suplentesOrganizacao: suplentes,
    totalMembros: (efetivos + suplentes) * 2,
    semObrigatoriedade: false,
  };
}

export function calcularDimensionamentoCipa(grauRisco: number, empregados: number): DimensionamentoCipaResult | null {
  if (![1, 2, 3, 4].includes(grauRisco) || empregados <= 0) return null;
  const grauIndex = grauRisco - 1;

  if (empregados > 10000) {
    const ultimaFaixa = QUADRO_I_CIPA[QUADRO_I_CIPA.length - 1]!;
    const cell = ultimaFaixa.porGrau[grauIndex];
    if (!cell) return null;
    const incremento = INCREMENTO_ACIMA_10000[grauRisco]!;
    const gruposAdicionais = Math.ceil((empregados - 10000) / 2500);
    return buildResult(
      `Acima de 10.000 (${ultimaFaixa.label} + adicional)`,
      cell.efetivos + incremento * gruposAdicionais,
      cell.suplentes + incremento * gruposAdicionais,
    );
  }

  const faixa = QUADRO_I_CIPA.find((f) => empregados >= f.min && empregados <= f.max);
  if (!faixa) return null;
  const cell = faixa.porGrau[grauIndex];
  if (!cell) {
    return {
      faixaLabel: faixa.label,
      titularesEmpregados: 0,
      suplentesEmpregados: 0,
      titularesOrganizacao: 0,
      suplentesOrganizacao: 0,
      totalMembros: 0,
      semObrigatoriedade: true,
    };
  }
  return buildResult(faixa.label, cell.efetivos, cell.suplentes);
}
