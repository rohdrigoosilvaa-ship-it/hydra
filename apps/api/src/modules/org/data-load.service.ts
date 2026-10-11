import { BadRequestException, Injectable } from "@nestjs/common";
import type { Prisma } from "@hydra/db";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS, type Permission } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { normalizeCpf } from "./employees.service";
import { isValidCpf } from "./employees-import.util";
import { hasTenantWideAccess, isCompanyInScope } from "./scope.util";
import { parseDataLoadWorkbook, type ParsedSheet, type RawRow, type SheetKey } from "./data-load.util";

export type RowStatus = "new" | "update" | "error";

export interface DataLoadRowResult {
  rowNumber: number;
  label: string;
  status: RowStatus;
  errors: string[];
}

export interface DataLoadSheetResult {
  key: SheetKey;
  title: string;
  total: number;
  created: number;
  updated: number;
  errorCount: number;
  rows: DataLoadRowResult[];
}

export interface DataLoadResult {
  dryRun: boolean;
  fileName?: string;
  created: number;
  updated: number;
  errorCount: number;
  sheets: DataLoadSheetResult[];
}

/** Lançada para desfazer a transação na pré-visualização (nada é gravado). */
class DryRunRollback extends Error {
  constructor(readonly result: DataLoadResult) {
    super("dry-run");
  }
}

const lower = (s?: string | null) => (s ?? "").trim().toLowerCase();
const digits = (s?: string | null) => (s ?? "").replace(/\D/g, "");

function formatCnpj(d: string) {
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : d;
}

function parseRecordStatus(raw?: string): "ACTIVE" | "INACTIVE" | undefined {
  const v = lower(raw);
  if (v === "" || v === "ativo" || v === "ativa") return "ACTIVE";
  if (v === "inativo" || v === "inativa") return "INACTIVE";
  return undefined;
}

function parseEmployeeStatus(raw?: string): "ACTIVE" | "ON_LEAVE" | "TERMINATED" | undefined {
  const v = lower(raw);
  if (v === "" || v === "ativo") return "ACTIVE";
  if (v === "inativo" || v === "desligado") return "TERMINATED";
  if (v === "afastado") return "ON_LEAVE";
  return undefined;
}

type CompanyRec = { id: string; name: string; cnpj: string | null };
type CodedRec = { id: string; companyId: string; code: string | null; name: string };

interface Ctx {
  tx: Prisma.TransactionClient;
  tenantId: string;
  userId: string;
  assignments: RoleAssignmentClaim[];
  companiesByCnpj: Map<string, CompanyRec>;
  companiesByName: Map<string, CompanyRec[]>;
  branches: CodedRec[];
  departments: CodedRec[];
  positions: CodedRec[];
  employeesByKey: Map<string, string>; // `${companyId}|${cpf}` → id
}

@Injectable()
export class DataLoadService {
  constructor(private readonly prisma: PrismaService) {}

  async run(
    tenantId: string,
    userId: string,
    assignments: RoleAssignmentClaim[],
    buffer: Buffer,
    dryRun: boolean,
    fileName?: string,
  ): Promise<DataLoadResult> {
    let sheets: ParsedSheet[];
    try {
      sheets = parseDataLoadWorkbook(buffer);
    } catch {
      throw new BadRequestException("Não consegui ler o arquivo. Envie a planilha de carga em .xlsx.");
    }
    if (sheets.length === 0) {
      throw new BadRequestException(
        'Nenhuma aba reconhecida. Use as abas "Carga Empresas", "Carga Unidade", "Carga Setor", "Carga Cargo" e "Carga Funcionarios".',
      );
    }
    const broken = sheets.filter((s) => s.missingColumns.length > 0);
    if (broken.length > 0) {
      throw new BadRequestException(
        broken.map((s) => `Aba "${s.spec.title}": faltam as colunas ${s.missingColumns.join(", ")}.`).join(" "),
      );
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const ctx = await this.loadContext(tx, tenantId, userId, assignments);
          const results: DataLoadSheetResult[] = [];
          for (const sheet of sheets) {
            results.push(await this.processSheet(ctx, sheet));
          }
          const result: DataLoadResult = {
            dryRun,
            fileName,
            created: results.reduce((n, s) => n + s.created, 0),
            updated: results.reduce((n, s) => n + s.updated, 0),
            errorCount: results.reduce((n, s) => n + s.errorCount, 0),
            sheets: results,
          };
          if (dryRun) throw new DryRunRollback(result);
          return result;
        },
        { timeout: 25_000, maxWait: 5_000 },
      );
    } catch (err) {
      if (err instanceof DryRunRollback) return err.result;
      throw err;
    }
  }

  private async loadContext(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    assignments: RoleAssignmentClaim[],
  ): Promise<Ctx> {
    const base = { tenantId, deletedAt: null };
    const [companies, branches, departments, positions, employees] = await Promise.all([
      tx.company.findMany({ where: base, select: { id: true, name: true, cnpj: true } }),
      tx.branch.findMany({ where: base, select: { id: true, companyId: true, code: true, name: true } }),
      tx.department.findMany({ where: base, select: { id: true, companyId: true, code: true, name: true } }),
      tx.position.findMany({ where: base, select: { id: true, companyId: true, code: true, name: true } }),
      tx.employee.findMany({ where: base, select: { id: true, companyId: true, cpf: true } }),
    ]);

    const ctx: Ctx = {
      tx,
      tenantId,
      userId,
      assignments,
      companiesByCnpj: new Map(),
      companiesByName: new Map(),
      branches,
      departments,
      positions,
      employeesByKey: new Map(),
    };
    for (const c of companies) this.indexCompany(ctx, c);
    for (const e of employees) {
      const cpf = normalizeCpf(e.cpf);
      if (cpf) ctx.employeesByKey.set(`${e.companyId}|${cpf}`, e.id);
    }
    return ctx;
  }

  private indexCompany(ctx: Ctx, c: CompanyRec) {
    const d = digits(c.cnpj);
    if (d) ctx.companiesByCnpj.set(d, c);
    const key = lower(c.name);
    const same = (ctx.companiesByName.get(key) ?? []).filter((x) => x.id !== c.id);
    ctx.companiesByName.set(key, [...same, c]);
  }

  private async processSheet(ctx: Ctx, sheet: ParsedSheet): Promise<DataLoadSheetResult> {
    const handlers: Record<SheetKey, (ctx: Ctx, row: RawRow, seen: Set<string>) => Promise<DataLoadRowResult>> = {
      company: (c, r, s) => this.companyRow(c, r, s),
      branch: (c, r, s) => this.codedRow(c, r, s, "branch"),
      department: (c, r, s) => this.codedRow(c, r, s, "department"),
      position: (c, r, s) => this.codedRow(c, r, s, "position"),
      employee: (c, r, s) => this.employeeRow(c, r, s),
    };
    const seen = new Set<string>();
    const rows: DataLoadRowResult[] = [];
    for (const row of sheet.rows) {
      rows.push(await handlers[sheet.spec.key](ctx, row, seen));
    }
    return {
      key: sheet.spec.key,
      title: sheet.spec.title,
      total: rows.length,
      created: rows.filter((r) => r.status === "new").length,
      updated: rows.filter((r) => r.status === "update").length,
      errorCount: rows.filter((r) => r.status === "error").length,
      rows,
    };
  }

  private fail(row: RawRow, label: string, ...errors: string[]): DataLoadRowResult {
    return { rowNumber: row.rowNumber, label, status: "error", errors };
  }

  private can(ctx: Ctx, permission: Permission, companyId: string) {
    return isCompanyInScope(ctx.assignments, permission, companyId);
  }

  /** Empresa referenciada em outra aba: aceita CNPJ ou nome. */
  private resolveCompany(ctx: Ctx, ref?: string): { company?: CompanyRec; error?: string } {
    if (!ref) return { error: "Empresa é obrigatória." };
    const d = digits(ref);
    if (d.length === 14) {
      const c = ctx.companiesByCnpj.get(d);
      return c ? { company: c } : { error: `Empresa com CNPJ ${formatCnpj(d)} não encontrada (cadastre na aba Carga Empresas).` };
    }
    const matches = ctx.companiesByName.get(lower(ref)) ?? [];
    if (matches.length === 1) return { company: matches[0] };
    if (matches.length > 1) return { error: `Mais de uma empresa chamada "${ref}" — use o CNPJ na coluna Empresa.` };
    return { error: `Empresa "${ref}" não encontrada (cadastre na aba Carga Empresas).` };
  }

  // ---------------------------------------------------------------- Empresas

  private async companyRow(ctx: Ctx, row: RawRow, seen: Set<string>): Promise<DataLoadRowResult> {
    const label = row.name ?? row.legalName ?? row.cnpj ?? `linha ${row.rowNumber}`;
    const errors = requiredErrors(row, {
      name: "Nome da Empresa",
      legalName: "Razão Social",
      cnpj: "CNPJ",
      cnae: "CNAE Principal",
      grauRisco: "Grau de Risco",
      cep: "CEP",
      endereco: "Endereço",
      numero: "Número",
      bairro: "Bairro",
      cidade: "Cidade",
    });

    const cnpjDigits = digits(row.cnpj);
    if (row.cnpj && cnpjDigits.length !== 14) errors.push(`CNPJ inválido: "${row.cnpj}" (precisa ter 14 dígitos).`);
    if (cnpjDigits && seen.has(cnpjDigits)) errors.push("CNPJ repetido nesta aba.");

    let grauRisco: number | undefined;
    if (row.grauRisco) {
      grauRisco = Number(row.grauRisco.replace(/\D/g, ""));
      if (!Number.isInteger(grauRisco) || grauRisco < 1 || grauRisco > 4) {
        errors.push(`Grau de Risco inválido: "${row.grauRisco}" (use 1 a 4).`);
      }
    }
    if (errors.length) return this.fail(row, label, ...errors);
    seen.add(cnpjDigits);

    const existing = ctx.companiesByCnpj.get(cnpjDigits);
    const data = {
      name: row.name!,
      legalName: row.legalName,
      cnpj: formatCnpj(cnpjDigits),
      cpf: row.cpf,
      telefone: row.telefone,
      cei: row.cei,
      caepf: row.caepf,
      cno: row.cno,
      inscricaoEstadual: row.inscricaoEstadual,
      inscricaoMunicipal: row.inscricaoMunicipal,
      codigoRH: row.codigoRH,
      cnae: row.cnae,
      cnaeSecundario: row.cnaeSecundario,
      grauRisco,
      caracterizacaoProcessos: row.caracterizacaoProcessos,
      descricaoLocal: row.descricaoLocal,
      cep: row.cep,
      endereco: row.endereco,
      numero: row.numero,
      complemento: row.complemento,
      bairro: row.bairro,
      cidade: row.cidade,
      estado: row.estado?.toUpperCase(),
    };

    if (existing) {
      if (!this.can(ctx, PERMISSIONS.ORG_COMPANY_WRITE, existing.id)) {
        return this.fail(row, label, "Você não tem acesso para alterar esta empresa.");
      }
      const updated = await ctx.tx.company.update({
        where: { id: existing.id },
        data: { ...data, updatedById: ctx.userId },
        select: { id: true, name: true, cnpj: true },
      });
      this.indexCompany(ctx, updated);
      return { rowNumber: row.rowNumber, label, status: "update", errors: [] };
    }

    if (!hasTenantWideAccess(ctx.assignments, PERMISSIONS.ORG_COMPANY_WRITE)) {
      return this.fail(row, label, "Apenas administradores podem cadastrar novas empresas.");
    }
    const created = await ctx.tx.company.create({
      data: { ...data, tenantId: ctx.tenantId, createdById: ctx.userId, updatedById: ctx.userId },
      select: { id: true, name: true, cnpj: true },
    });
    this.indexCompany(ctx, created);
    return { rowNumber: row.rowNumber, label, status: "new", errors: [] };
  }

  // ------------------------------------------------- Unidade / Setor / Cargo

  private listFor(ctx: Ctx, kind: "branch" | "department" | "position") {
    return kind === "branch" ? ctx.branches : kind === "department" ? ctx.departments : ctx.positions;
  }

  /** Procura pelo código; registros antigos sem código são encontrados pelo nome e passam a ter o código. */
  private findCoded(list: CodedRec[], companyId: string, code: string, name: string) {
    const byCode = list.find((r) => r.companyId === companyId && lower(r.code) === lower(code));
    if (byCode) return byCode;
    return list.find((r) => r.companyId === companyId && !r.code && lower(r.name) === lower(name));
  }

  private async codedRow(
    ctx: Ctx,
    row: RawRow,
    seen: Set<string>,
    kind: "branch" | "department" | "position",
  ): Promise<DataLoadRowResult> {
    const label = [row.code, row.name].filter(Boolean).join(" — ") || `linha ${row.rowNumber}`;
    const errors = requiredErrors(row, {
      code: "Código",
      name: "Nome",
      company: "Empresa",
      ...(kind === "branch" ? { cityState: "Cidade/UF" } : {}),
      ...(kind === "department" ? { branch: "Unidade" } : {}),
      ...(kind === "position" ? { cbo: "CBO" } : {}),
    });

    const status = parseRecordStatus(row.status);
    if (!status) errors.push(`Situação inválida: "${row.status}" (use Ativo ou Inativo).`);

    const { company, error } = row.company ? this.resolveCompany(ctx, row.company) : { company: undefined, error: undefined };
    if (error) errors.push(error);

    if (company && row.code) {
      const dupKey = `${company.id}|${lower(row.code)}`;
      if (seen.has(dupKey)) errors.push(`Código "${row.code}" repetido nesta aba para a mesma empresa.`);
      seen.add(dupKey);
    }

    let branchId: string | undefined;
    if (kind === "department" && company && row.branch) {
      const branch = ctx.branches.find((b) => b.companyId === company.id && lower(b.code) === lower(row.branch));
      if (!branch) errors.push(`Unidade com código "${row.branch}" não encontrada nesta empresa (cadastre na aba Carga Unidade).`);
      else branchId = branch.id;
    }
    if (errors.length || !company) return this.fail(row, label, ...errors);

    const permission =
      kind === "branch"
        ? PERMISSIONS.ORG_BRANCH_WRITE
        : kind === "department"
          ? PERMISSIONS.ORG_DEPARTMENT_WRITE
          : PERMISSIONS.ORG_POSITION_WRITE;
    if (!this.can(ctx, permission, company.id)) {
      return this.fail(row, label, "Você não tem acesso a esta empresa.");
    }

    const list = this.listFor(ctx, kind);
    const existing = this.findCoded(list, company.id, row.code!, row.name!);
    const common = { code: row.code!, name: row.name!, status: status! };

    if (kind === "branch") {
      const [city, state] = splitCityState(row.cityState!);
      const data = { ...common, city, state };
      const rec = existing
        ? await ctx.tx.branch.update({ where: { id: existing.id }, data: { ...data, updatedById: ctx.userId } })
        : await ctx.tx.branch.create({
            data: { ...data, tenantId: ctx.tenantId, companyId: company.id, createdById: ctx.userId, updatedById: ctx.userId },
          });
      this.upsertIndex(ctx.branches, existing, rec.id, company.id, rec.code, rec.name);
    } else if (kind === "department") {
      const data = { ...common, branchId };
      const rec = existing
        ? await ctx.tx.department.update({ where: { id: existing.id }, data })
        : await ctx.tx.department.create({ data: { ...data, tenantId: ctx.tenantId, companyId: company.id } });
      this.upsertIndex(ctx.departments, existing, rec.id, company.id, rec.code, rec.name);
    } else {
      const data = { ...common, cbo: row.cbo };
      const rec = existing
        ? await ctx.tx.position.update({ where: { id: existing.id }, data })
        : await ctx.tx.position.create({ data: { ...data, tenantId: ctx.tenantId, companyId: company.id } });
      this.upsertIndex(ctx.positions, existing, rec.id, company.id, rec.code, rec.name);
    }
    return { rowNumber: row.rowNumber, label, status: existing ? "update" : "new", errors: [] };
  }

  private upsertIndex(
    list: CodedRec[],
    existing: CodedRec | undefined,
    id: string,
    companyId: string,
    code: string | null,
    name: string,
  ) {
    if (existing) {
      existing.code = code;
      existing.name = name;
    } else {
      list.push({ id, companyId, code, name });
    }
  }

  // ------------------------------------------------------------ Funcionários

  /** Código sem empresa: precisa ser inequívoco em toda a base. */
  private findUnique(list: CodedRec[], code: string): { rec?: CodedRec; ambiguous: boolean } {
    const matches = list.filter((r) => lower(r.code) === lower(code));
    return { rec: matches.length === 1 ? matches[0] : undefined, ambiguous: matches.length > 1 };
  }

  private async employeeRow(ctx: Ctx, row: RawRow, seen: Set<string>): Promise<DataLoadRowResult> {
    const label = row.name ?? `linha ${row.rowNumber}`;
    const errors = requiredErrors(row, {
      name: "Nome",
      cpf: "CPF",
      branch: "Unidade",
      department: "Setor",
      position: "Cargo",
      admittedAt: "Admissão",
    });

    const status = parseEmployeeStatus(row.status);
    if (!status) errors.push(`Situação inválida: "${row.status}" (use Ativo, Inativo ou Afastado).`);
    if (row.admittedAt === "__invalid__") errors.push("Admissão em formato inválido (use dd/mm/aaaa).");

    const cpf = normalizeCpf(row.cpf);
    if (row.cpf && (!cpf || !isValidCpf(cpf))) errors.push(`CPF inválido: "${row.cpf}".`);
    if (cpf && seen.has(cpf)) errors.push("CPF repetido nesta aba.");
    if (errors.length) return this.fail(row, label, ...errors);
    seen.add(cpf!);

    const branch = this.findUnique(ctx.branches, row.branch!);
    if (!branch.rec) {
      return this.fail(
        row,
        label,
        branch.ambiguous
          ? `Código de unidade "${row.branch}" existe em mais de uma empresa — use códigos de unidade únicos.`
          : `Unidade com código "${row.branch}" não encontrada (cadastre na aba Carga Unidade).`,
      );
    }
    const companyId = branch.rec.companyId;
    const department = ctx.departments.find((d) => d.companyId === companyId && lower(d.code) === lower(row.department));
    const position = ctx.positions.find((p) => p.companyId === companyId && lower(p.code) === lower(row.position));
    const linkErrors: string[] = [];
    if (!department) linkErrors.push(`Setor com código "${row.department}" não encontrado na empresa da unidade "${row.branch}".`);
    if (!position) linkErrors.push(`Cargo com código "${row.position}" não encontrado na empresa da unidade "${row.branch}".`);
    if (linkErrors.length) return this.fail(row, label, ...linkErrors);

    if (!this.can(ctx, PERMISSIONS.ORG_EMPLOYEE_WRITE, companyId)) {
      return this.fail(row, label, "Você não tem acesso a esta empresa.");
    }

    const data = {
      name: row.name!,
      cpf,
      branchId: branch.rec.id,
      departmentId: department!.id,
      positionId: position!.id,
      admittedAt: new Date(row.admittedAt!),
      status: status!,
    };
    const key = `${companyId}|${cpf}`;
    const existingId = ctx.employeesByKey.get(key);
    if (existingId) {
      await ctx.tx.employee.update({
        where: { id: existingId },
        // reativar limpa a data de inativação; inativar numa reimportação mantém a data anterior, se houver.
        data: { ...data, updatedById: ctx.userId, ...(status === "ACTIVE" ? { inactivatedAt: null } : {}) },
      });
      return { rowNumber: row.rowNumber, label, status: "update", errors: [] };
    }
    const created = await ctx.tx.employee.create({
      data: {
        ...data,
        inactivatedAt: status === "TERMINATED" ? new Date() : null,
        tenantId: ctx.tenantId,
        companyId,
        createdById: ctx.userId,
        updatedById: ctx.userId,
      },
      select: { id: true },
    });
    ctx.employeesByKey.set(key, created.id);
    return { rowNumber: row.rowNumber, label, status: "new", errors: [] };
  }
}

function requiredErrors(row: RawRow, required: Record<string, string>): string[] {
  return Object.entries(required)
    .filter(([key]) => !row[key])
    .map(([, header]) => `${header} é obrigatório.`);
}

function splitCityState(value: string): [string, string | undefined] {
  const m = value.match(/^(.*?)\s*[/\-]\s*([A-Za-z]{2})$/);
  return m ? [m[1]!.trim(), m[2]!.toUpperCase()] : [value.trim(), undefined];
}
