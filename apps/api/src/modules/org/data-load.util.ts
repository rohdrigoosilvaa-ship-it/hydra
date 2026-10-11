import * as XLSX from "xlsx";
import { toIsoDate } from "./employees-import.util";

/**
 * Planilha única de carga de dados: 5 abas ligadas entre si por código/CNPJ/CPF.
 * Empresa → Unidade (Filial) → Setor / Cargo → Funcionário.
 */
export type SheetKey = "company" | "branch" | "department" | "position" | "employee";

export interface ColumnSpec {
  key: string;
  header: string;
  /** Aliases já normalizados (sem acento/asterisco, minúsculo). O primeiro é o nome oficial. */
  aliases: string[];
  required: boolean;
  width?: number;
}

export interface SheetSpec {
  key: SheetKey;
  /** Nome oficial da aba. */
  title: string;
  /** Trechos (normalizados) que identificam a aba mesmo com variação no nome. */
  match: string[];
  columns: ColumnSpec[];
}

const col = (key: string, header: string, required: boolean, extra: string[] = [], width = 22): ColumnSpec => ({
  key,
  header,
  required,
  width,
  aliases: [normalizeHeader(header), ...extra],
});

export const SHEETS: SheetSpec[] = [
  {
    key: "company",
    title: "Carga Empresas",
    match: ["empresa"],
    columns: [
      col("name", "Nome da Empresa", true, ["nome", "empresa"], 30),
      col("legalName", "Razão Social", true, [], 30),
      col("cnpj", "CNPJ", true, [], 20),
      col("cpf", "CPF", false, [], 16),
      col("telefone", "Telefone", false, [], 16),
      col("cei", "CEI", false, [], 14),
      col("caepf", "CAEPF", false, [], 14),
      col("cno", "CNO", false, [], 14),
      col("inscricaoEstadual", "Inscrição Estadual", false, [], 18),
      col("inscricaoMunicipal", "Inscrição Municipal", false, [], 18),
      col("codigoRH", "Código de RH", false, [], 14),
      col("cnae", "CNAE Principal", true, ["cnae"], 16),
      col("cnaeSecundario", "CNAE Secundário", false, [], 16),
      col("grauRisco", "Grau de Risco", true, [], 12),
      col("caracterizacaoProcessos", "Caracterização dos Processos e Ambientes de Trabalho", false, [], 40),
      col("descricaoLocal", "Descrição do Local", false, [], 40),
      col("cep", "CEP", true, [], 12),
      col("endereco", "Endereço", true, [], 34),
      col("numero", "Número", true, [], 10),
      col("complemento", "Complemento", false, [], 18),
      col("bairro", "Bairro", true, [], 22),
      col("cidade", "Cidade", true, [], 22),
      col("estado", "Estado", false, ["uf"], 8),
    ],
  },
  {
    key: "branch",
    title: "Carga Unidade",
    match: ["unidade"],
    columns: [
      col("code", "Código", true, ["codigo"], 14),
      col("name", "Nome", true, [], 30),
      col("company", "Empresa", true, [], 30),
      col("cityState", "Cidade/UF", true, ["cidade uf", "cidade"], 22),
      col("status", "Situação", false, [], 12),
    ],
  },
  {
    key: "department",
    title: "Carga Setor",
    match: ["setor"],
    columns: [
      col("code", "Código", true, ["codigo"], 14),
      col("name", "Nome", true, [], 30),
      col("company", "Empresa", true, [], 30),
      col("branch", "Unidade", true, ["codigo unidade", "codigo da unidade"], 16),
      col("status", "Situação", false, [], 12),
    ],
  },
  {
    key: "position",
    title: "Carga Cargo",
    match: ["cargo"],
    columns: [
      col("code", "Código", true, ["codigo"], 14),
      col("name", "Nome", true, [], 30),
      col("company", "Empresa", true, [], 30),
      col("cbo", "CBO", true, [], 12),
      col("status", "Situação", false, [], 12),
    ],
  },
  {
    key: "employee",
    title: "Carga Funcionarios",
    match: ["funcionario", "colaborador"],
    columns: [
      col("name", "Nome", true, [], 32),
      col("cpf", "CPF", true, [], 16),
      col("birthDate", "Data Nascimento", false, ["nascimento", "data de nascimento"], 16),
      col("status", "Situação", false, [], 12),
      col("branch", "Unidade", true, ["codigo unidade", "codigo da unidade"], 16),
      col("department", "Setor", true, ["codigo setor", "codigo do setor"], 16),
      col("position", "Cargo", true, ["codigo cargo", "codigo do cargo"], 16),
      col("admittedAt", "Admissão", true, ["admissao", "data admissao", "data de admissao"], 14),
      col("company", "Empresa", false, [], 30),
    ],
  },
];

export function normalizeHeader(h: unknown): string {
  return String(h ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\*/g, "")
    .replace(/[^a-zA-Z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

export type RawRow = { rowNumber: number } & Record<string, string | undefined>;

export interface ParsedSheet {
  spec: SheetSpec;
  rows: RawRow[];
  missingColumns: string[];
}

const DATE_KEYS = new Set(["admittedAt", "birthDate"]);

function cellToString(v: unknown, isDate: boolean): string | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  if (isDate) return toIsoDate(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

/** Lê o arquivo e devolve só as abas reconhecidas (as demais, como "Instruções", são ignoradas). */
export function parseDataLoadWorkbook(buffer: Buffer): ParsedSheet[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const out: ParsedSheet[] = [];
  const used = new Set<string>();

  for (const spec of SHEETS) {
    const sheetName = wb.SheetNames.find((n) => {
      if (used.has(n)) return false;
      const norm = normalizeHeader(n);
      return norm === normalizeHeader(spec.title) || (norm.startsWith("carga") && spec.match.some((m) => norm.includes(m)));
    });
    if (!sheetName) continue;
    used.add(sheetName);

    const grid: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]!, { header: 1, defval: null, blankrows: true });
    const headerCells = (grid[0] ?? []).map(normalizeHeader);

    const indexByKey = new Map<string, number>();
    const missingColumns: string[] = [];
    for (const c of spec.columns) {
      const idx = headerCells.findIndex((h) => c.aliases.includes(h));
      if (idx >= 0) indexByKey.set(c.key, idx);
      else if (c.required) missingColumns.push(c.header);
    }

    const rows: RawRow[] = [];
    for (let r = 1; r < grid.length; r++) {
      const line = grid[r] ?? [];
      const row = { rowNumber: r + 1 } as unknown as RawRow;
      let hasValue = false;
      for (const c of spec.columns) {
        const idx = indexByKey.get(c.key);
        if (idx === undefined) continue;
        const value = cellToString(line[idx], DATE_KEYS.has(c.key));
        if (value !== undefined) hasValue = true;
        row[c.key] = value;
      }
      if (hasValue) rows.push(row);
    }
    out.push({ spec, rows, missingColumns });
  }
  return out;
}

/** Gera a planilha modelo (cabeçalhos com * nos obrigatórios + aba de instruções). */
export function buildDataLoadTemplate(): Buffer {
  const wb = XLSX.utils.book_new();
  for (const spec of SHEETS) {
    const ws = XLSX.utils.aoa_to_sheet([spec.columns.map((c) => (c.required ? `${c.header} *` : c.header))]);
    ws["!cols"] = spec.columns.map((c) => ({ wch: Math.max(c.width ?? 16, c.header.length + 4) }));
    XLSX.utils.book_append_sheet(wb, ws, spec.title);
  }
  const help = [
    ["Como preencher a planilha de carga de dados"],
    [""],
    ["Preencha as abas na ordem: Empresas → Unidade → Setor → Cargo → Funcionarios."],
    ["Colunas marcadas com * são obrigatórias. As demais são opcionais e podem ser complementadas depois, na própria tela."],
    [""],
    ["Como as abas se ligam"],
    ["Empresa: identificada pelo CNPJ. Nas demais abas, a coluna Empresa aceita o CNPJ ou o Nome da Empresa."],
    ["Unidade, Setor e Cargo: identificados pelo Código (único dentro de cada empresa)."],
    ["Setor: a coluna Unidade recebe o Código da Unidade (aba Carga Unidade) da mesma empresa."],
    ["Funcionarios: Unidade, Setor e Cargo recebem os Códigos (ou nomes) das respectivas abas; a empresa é a da Unidade."],
    ["Se a mesma Unidade/Setor/Cargo existir em mais de uma empresa, preencha a coluna opcional Empresa (CNPJ ou nome) na aba Funcionarios."],
    ["Funcionário é identificado pelo CPF."],
    [""],
    ["Regras"],
    ["Situação: Ativo ou Inativo (vazio = Ativo). Funcionários também aceitam Afastado."],
    ["Grau de Risco: 1 a 4 (NR-4). Admissão: dd/mm/aaaa. Cidade/UF: ex. Campinas/SP."],
    ["Reenviar a planilha atualiza os registros que já existem (mesmo CNPJ/código/CPF) — campos vazios não apagam dados já cadastrados."],
    ["Linhas com erro não são importadas; o sistema mostra a aba, a linha e o motivo."],
  ];
  const wsHelp = XLSX.utils.aoa_to_sheet(help);
  wsHelp["!cols"] = [{ wch: 120 }];
  XLSX.utils.book_append_sheet(wb, wsHelp, "Instruções");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
