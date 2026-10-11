import * as XLSX from "xlsx";

export interface ParsedImportRow {
  rowNumber: number;
  matricula?: string;
  companyName?: string;
  branchName?: string;
  sex?: string;
  name?: string;
  departmentName?: string;
  positionName?: string;
  birthDate?: string; // ISO yyyy-mm-dd
  cpf?: string;
  admittedAt?: string; // ISO yyyy-mm-dd
  inactivatedAt?: string; // ISO yyyy-mm-dd
  situacao?: string;
}

function normalizeHeader(h: unknown): string {
  return String(h ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Aliases já normalizados (sem acento, minúsculo) — tolera pequenas variações de nome de coluna. */
const COLUMN_ALIASES: Record<keyof Omit<ParsedImportRow, "rowNumber">, string[]> = {
  matricula: ["matricula"],
  companyName: ["empresa"],
  branchName: ["unidade"],
  sex: ["sexo"],
  name: ["nome"],
  departmentName: ["setor"],
  positionName: ["cargo"],
  birthDate: ["data nascimento", "data de nascimento", "dt. nascimento", "dt nascimento"],
  cpf: ["cpf"],
  admittedAt: ["admissao", "data admissao", "data de admissao", "dt. admissao", "dt admissao"],
  inactivatedAt: ["dt.inativacao", "dt inativacao", "data inativacao", "data de inativacao"],
  situacao: ["situacao"],
};

function excelSerialToDate(serial: number): Date {
  // Excel epoch (1899-12-30) — mesma base usada pelo SSF do xlsx.
  const utcDays = Math.floor(serial - 25569);
  return new Date(utcDays * 86400 * 1000);
}

function toIsoDate(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    const d = excelSerialToDate(value);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
  }
  const raw = String(value).trim();
  if (!raw) return undefined;
  // dd/mm/aaaa
  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (br) {
    const d = br[1]!;
    const m = br[2]!;
    const y = br[3]!;
    const year = y.length === 2 ? Number(y) + 2000 : Number(y);
    const date = new Date(Date.UTC(year, Number(m) - 1, Number(d)));
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
  }
  // aaaa-mm-dd (com ou sem horário)
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const y = iso[1]!;
    const m = iso[2]!;
    const d = iso[3]!;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
  }
  return "__invalid__"; // sinaliza "tinha valor, mas não deu para interpretar"
}

/**
 * Lê a primeira planilha do arquivo, localiza a linha de cabeçalho (pode não
 * ser a primeira — a "Importação Funcionários - Hydra" tem um título na
 * linha 1) e mapeia cada coluna reconhecida para o campo correspondente.
 */
export function parseEmployeeImportSheet(buffer: Buffer): {
  rows: ParsedImportRow[];
  headerFound: boolean;
  missingColumns: string[];
} {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]!]!;
  const grid: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: true });

  let headerRowIndex = -1;
  let columnIndexByField = new Map<keyof Omit<ParsedImportRow, "rowNumber">, number>();

  for (let r = 0; r < Math.min(grid.length, 10); r++) {
    const row = grid[r] ?? [];
    const normalized = row.map(normalizeHeader);
    const hasName = normalized.some((h) => COLUMN_ALIASES.name.includes(h));
    const hasCpf = normalized.some((h) => COLUMN_ALIASES.cpf.includes(h));
    if (hasName && hasCpf) {
      headerRowIndex = r;
      const map = new Map<keyof Omit<ParsedImportRow, "rowNumber">, number>();
      for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [
        keyof Omit<ParsedImportRow, "rowNumber">,
        string[],
      ][]) {
        const idx = normalized.findIndex((h) => aliases.includes(h));
        if (idx >= 0) map.set(field, idx);
      }
      columnIndexByField = map;
      break;
    }
  }

  if (headerRowIndex === -1) {
    return { rows: [], headerFound: false, missingColumns: ["Nome", "CPF"] };
  }

  const requiredForHeader: (keyof Omit<ParsedImportRow, "rowNumber">)[] = [
    "name",
    "cpf",
    "companyName",
    "birthDate",
    "admittedAt",
    "situacao",
  ];
  const missingColumns = requiredForHeader
    .filter((f) => !columnIndexByField.has(f))
    .map((f) => COLUMN_ALIASES[f][0] ?? f);

  const rows: ParsedImportRow[] = [];
  for (let r = headerRowIndex + 1; r < grid.length; r++) {
    const raw = grid[r] ?? [];
    const isBlank = raw.every((cell) => cell === null || cell === undefined || String(cell).trim() === "");
    if (isBlank) continue;

    const get = (field: keyof Omit<ParsedImportRow, "rowNumber">) => {
      const idx = columnIndexByField.get(field);
      return idx === undefined ? null : raw[idx];
    };

    rows.push({
      rowNumber: r + 1, // 1-based, igual ao Excel
      matricula: get("matricula") != null ? String(get("matricula")).trim() : undefined,
      companyName: get("companyName") != null ? String(get("companyName")).trim() : undefined,
      branchName: get("branchName") != null ? String(get("branchName")).trim() : undefined,
      sex: get("sex") != null ? String(get("sex")).trim() : undefined,
      name: get("name") != null ? String(get("name")).trim() : undefined,
      departmentName: get("departmentName") != null ? String(get("departmentName")).trim() : undefined,
      positionName: get("positionName") != null ? String(get("positionName")).trim() : undefined,
      birthDate: toIsoDate(get("birthDate")),
      cpf: get("cpf") != null ? String(get("cpf")).trim() : undefined,
      admittedAt: toIsoDate(get("admittedAt")),
      inactivatedAt: toIsoDate(get("inactivatedAt")),
      situacao: get("situacao") != null ? String(get("situacao")).trim() : undefined,
    });
  }

  return { rows, headerFound: true, missingColumns };
}

export function isValidCpf(digits: string): boolean {
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(digits[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(digits[9]) && calc(10) === Number(digits[10]);
}
