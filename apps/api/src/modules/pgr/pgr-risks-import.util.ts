import * as XLSX from "xlsx";
import type { EvaluationCriteria, ExposureType, RiskCategory } from "@hydra/db";

export interface ParsedRiskImportRow {
  rowNumber: number;
  sheetName: string;
  category: RiskCategory | null;
  companyName?: string;
  branchName?: string;
  gheName?: string;
  departmentName?: string;
  positionName?: string;
  hazardName?: string;
  hazardAgent?: string;
  typicalInjuries?: string;
  sourceCircumstances?: string;
  propagationMeans?: string;
  exposureType?: ExposureType | "__invalid__";
  evaluationCriteria?: EvaluationCriteria | "__invalid__";
  exposureProfile?: string;
  probability?: number | "__invalid__";
  severity?: number | "__invalid__";
  classification?: string;
  conclusion?: string;
  adminControls?: string;
  engineeringControls?: string;
  epcMeasures?: string;
  epiMeasures?: string;
}

type Field = keyof Omit<ParsedRiskImportRow, "rowNumber" | "sheetName" | "category">;

function normalize(h: unknown): string {
  return String(h ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Nome da aba (sem acento) → categoria — as 5 abas do modelo oficial. */
const SHEET_CATEGORY: Record<string, RiskCategory> = {
  fisico: "FISICO",
  quimico: "QUIMICO",
  biologico: "BIOLOGICO",
  ergonomico: "ERGONOMICO",
  acidente: "ACIDENTE",
};

const COLUMN_ALIASES: Record<Field, string[]> = {
  companyName: ["empresa"],
  branchName: ["unidade"],
  gheName: ["ghe"],
  departmentName: ["setor"],
  positionName: ["cargo"],
  hazardName: ["perigo/fator de risco", "perigo / fator de risco", "perigo"],
  hazardAgent: ["agente/fator de risco", "agente / fator de risco", "agente"],
  typicalInjuries: ["possiveis lesoes ou agravos"],
  sourceCircumstances: ["fontes ou circunstancias"],
  propagationMeans: ["meio de propagacao"],
  exposureType: ["tipo de exposicao"],
  evaluationCriteria: ["criterio"],
  exposureProfile: ["perfil de exposicao"],
  probability: ["probabilidade (1-5)", "probabilidade"],
  severity: ["severidade (1-5)", "severidade"],
  classification: ["classificacao"],
  conclusion: ["conclusao"],
  adminControls: ["medidas administrativas"],
  engineeringControls: ["medidas de engenharia"],
  epcMeasures: ["epc"],
  epiMeasures: ["epi"],
};

// "Qtd. Colaboradores" existe no modelo só para referência visual de quem
// preenche a planilha — o sistema já calcula esse número a partir dos
// colaboradores reais vinculados ao GHE, então essa coluna nunca é lida.

const EXPOSURE_TYPE_BY_TEXT: Record<string, ExposureType> = {
  eventual: "EVENTUAL",
  intermitente: "INTERMITENTE",
  permanente: "PERMANENTE",
};
const EVALUATION_CRITERIA_BY_TEXT: Record<string, EvaluationCriteria> = {
  qualitativo: "QUALITATIVO",
  quantitativo: "QUANTITATIVO",
};

function cell(raw: unknown[], idx: number | undefined): unknown {
  if (idx === undefined) return null;
  return raw[idx] ?? null;
}

function str(raw: unknown[], idx: number | undefined): string | undefined {
  const v = cell(raw, idx);
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

function num(raw: unknown[], idx: number | undefined): number | "__invalid__" | undefined {
  const v = cell(raw, idx);
  if (v === null || v === undefined || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : "__invalid__";
}

function exposureType(raw: unknown[], idx: number | undefined): ExposureType | "__invalid__" | undefined {
  const s = str(raw, idx);
  if (!s) return undefined;
  return EXPOSURE_TYPE_BY_TEXT[normalize(s)] ?? "__invalid__";
}

function evaluationCriteria(raw: unknown[], idx: number | undefined): EvaluationCriteria | "__invalid__" | undefined {
  const s = str(raw, idx);
  if (!s) return undefined;
  return EVALUATION_CRITERIA_BY_TEXT[normalize(s)] ?? "__invalid__";
}

export interface ParsedRiskWorkbook {
  rows: ParsedRiskImportRow[];
  sheetsFound: string[];
  sheetsIgnored: string[];
}

/**
 * Lê as abas de categoria de risco do modelo oficial (Físico/Químico/
 * Biológico/Ergonômico/Acidente) — outras abas (ex.: "Base de Riscos", só com
 * notas) são ignoradas silenciosamente. Cada aba usa as mesmas 24 colunas.
 */
export function parseRiskImportWorkbook(buffer: Buffer): ParsedRiskWorkbook {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const rows: ParsedRiskImportRow[] = [];
  const sheetsFound: string[] = [];
  const sheetsIgnored: string[] = [];

  for (const sheetName of wb.SheetNames) {
    const category = SHEET_CATEGORY[normalize(sheetName)];
    if (!category) {
      sheetsIgnored.push(sheetName);
      continue;
    }

    const sheet = wb.Sheets[sheetName]!;
    const grid: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: true });

    let headerRowIndex = -1;
    let columnIndexByField = new Map<Field, number>();
    let groupColIdx = -1;
    for (let r = 0; r < Math.min(grid.length, 5); r++) {
      const normalized = (grid[r] ?? []).map(normalize);
      const hasGhe = normalized.some((h) => COLUMN_ALIASES.gheName.includes(h));
      const hasHazard = normalized.some((h) => COLUMN_ALIASES.hazardName.includes(h));
      if (hasGhe && hasHazard) {
        headerRowIndex = r;
        const map = new Map<Field, number>();
        for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [Field, string[]][]) {
          const idx = normalized.findIndex((h) => aliases.includes(h));
          if (idx >= 0) map.set(field, idx);
        }
        columnIndexByField = map;
        // "Grupo de Risco" é lido à parte — não tem campo próprio em
        // ParsedRiskImportRow, só decide `category`.
        groupColIdx = normalized.findIndex((h) => h === "grupo de risco");
        break;
      }
    }
    if (headerRowIndex === -1) continue; // aba sem cabeçalho reconhecível — ignora
    sheetsFound.push(sheetName);

    const idx = (f: Field) => columnIndexByField.get(f);
    for (let r = headerRowIndex + 1; r < grid.length; r++) {
      const raw = grid[r] ?? [];
      const isBlank = raw.every((c) => c === null || c === undefined || String(c).trim() === "");
      if (isBlank) continue;

      const groupText = groupColIdx >= 0 ? str(raw, groupColIdx) : undefined;
      const resolvedCategory = groupText ? (SHEET_CATEGORY[normalize(groupText)] ?? null) : category;

      rows.push({
        rowNumber: r + 1,
        sheetName,
        category: resolvedCategory,
        companyName: str(raw, idx("companyName")),
        branchName: str(raw, idx("branchName")),
        gheName: str(raw, idx("gheName")),
        departmentName: str(raw, idx("departmentName")),
        positionName: str(raw, idx("positionName")),
        hazardName: str(raw, idx("hazardName")),
        hazardAgent: str(raw, idx("hazardAgent")),
        typicalInjuries: str(raw, idx("typicalInjuries")),
        sourceCircumstances: str(raw, idx("sourceCircumstances")),
        propagationMeans: str(raw, idx("propagationMeans")),
        exposureType: exposureType(raw, idx("exposureType")),
        evaluationCriteria: evaluationCriteria(raw, idx("evaluationCriteria")),
        exposureProfile: str(raw, idx("exposureProfile")),
        probability: num(raw, idx("probability")),
        severity: num(raw, idx("severity")),
        classification: str(raw, idx("classification")),
        conclusion: str(raw, idx("conclusion")),
        adminControls: str(raw, idx("adminControls")),
        engineeringControls: str(raw, idx("engineeringControls")),
        epcMeasures: str(raw, idx("epcMeasures")),
        epiMeasures: str(raw, idx("epiMeasures")),
      });
    }
  }

  return { rows, sheetsFound, sheetsIgnored };
}
