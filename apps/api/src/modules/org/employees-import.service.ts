import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { EmployeesService, normalizeCpf } from "./employees.service";
import { hasTenantWideAccess, isCompanyInScope } from "./scope.util";
import { isValidCpf, parseEmployeeImportSheet, type ParsedImportRow } from "./employees-import.util";

export type ImportRowStatus = "new" | "update" | "error" | "duplicate";

export interface ImportRowResult {
  rowNumber: number;
  data: ParsedImportRow;
  status: ImportRowStatus;
  errors: string[];
  companyWillBeCreated?: boolean;
}

export interface ImportResult {
  fileName?: string;
  totalRows: number;
  newCount: number;
  updatedCount: number;
  errorCount: number;
  duplicateCount: number;
  rows: ImportRowResult[];
}

@Injectable()
export class EmployeesImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employees: EmployeesService,
  ) {}

  parseFile(buffer: Buffer) {
    return parseEmployeeImportSheet(buffer);
  }

  async preview(
    tenantId: string,
    assignments: RoleAssignmentClaim[],
    rows: ParsedImportRow[],
    fileName?: string,
  ): Promise<ImportResult> {
    return this.process(tenantId, assignments, rows, undefined, true, fileName);
  }

  async confirm(
    tenantId: string,
    assignments: RoleAssignmentClaim[],
    rows: ParsedImportRow[],
    userId: string,
    fileName?: string,
  ): Promise<ImportResult> {
    const result = await this.process(tenantId, assignments, rows, userId, false, fileName);
    await this.prisma.employeeImportLog.create({
      data: {
        tenantId,
        userId,
        fileName,
        totalRows: result.totalRows,
        created: result.newCount,
        updated: result.updatedCount,
        errors: result.errorCount,
      },
    });
    return result;
  }

  private async process(
    tenantId: string,
    assignments: RoleAssignmentClaim[],
    rows: ParsedImportRow[],
    userId: string | undefined,
    dryRun: boolean,
    fileName?: string,
  ): Promise<ImportResult> {
    const seenCpf = new Set<string>();
    const results: ImportRowResult[] = [];

    for (const row of rows) {
      const errors: string[] = [];
      if (!row.name?.trim()) errors.push("Nome é obrigatório.");
      if (!row.companyName?.trim()) errors.push("Empresa é obrigatória.");
      if (!row.departmentName?.trim()) errors.push("Setor é obrigatório.");
      if (!row.positionName?.trim()) errors.push("Cargo é obrigatório.");
      // Nascimento/admissão/CPF ficam a critério de quem importa — só reprovamos se veio
      // preenchido e não deu pra entender (data ilegível, CPF com dígitos inválidos).
      if (row.birthDate === "__invalid__") errors.push("Data de nascimento em formato inválido.");
      if (row.admittedAt === "__invalid__") errors.push("Data de admissão em formato inválido.");
      if (row.inactivatedAt === "__invalid__") errors.push("Data de inativação em formato inválido.");

      let cpfDigits: string | undefined;
      if (row.cpf?.trim()) {
        cpfDigits = normalizeCpf(row.cpf);
        if (!cpfDigits || !isValidCpf(cpfDigits)) errors.push(`CPF inválido: "${row.cpf}".`);
      }

      let status: "ACTIVE" | "TERMINATED" = "ACTIVE";
      const situacaoNorm = (row.situacao ?? "ativo").trim().toLowerCase();
      if (situacaoNorm === "ativo" || situacaoNorm === "") status = "ACTIVE";
      else if (situacaoNorm === "inativo") status = "TERMINATED";
      else errors.push(`Situação inválida: "${row.situacao}" (use "Ativo" ou "Inativo").`);

      if (cpfDigits) {
        if (seenCpf.has(cpfDigits)) {
          results.push({ rowNumber: row.rowNumber, data: row, status: "duplicate", errors: ["CPF duplicado nesta planilha."] });
          continue;
        }
        seenCpf.add(cpfDigits);
      }

      if (errors.length > 0) {
        results.push({ rowNumber: row.rowNumber, data: row, status: "error", errors });
        continue;
      }

      const company = await this.resolveCompany(tenantId, assignments, row.companyName!.trim(), dryRun);
      if (company.error) {
        results.push({ rowNumber: row.rowNumber, data: row, status: "error", errors: [company.error] });
        continue;
      }
      if (!company.id) {
        // dryRun, empresa nova — não dá para resolver filial/setor/cargo sem um companyId real ainda.
        results.push({ rowNumber: row.rowNumber, data: row, status: "new", errors: [], companyWillBeCreated: true });
        continue;
      }

      const branchId = row.branchName
        ? (await this.resolveNamed(tenantId, "branch", company.id, row.branchName, dryRun)).id
        : undefined;
      const departmentId = row.departmentName
        ? (await this.resolveNamed(tenantId, "department", company.id, row.departmentName, dryRun)).id
        : undefined;
      const positionId = row.positionName
        ? (await this.resolveNamed(tenantId, "position", company.id, row.positionName, dryRun)).id
        : undefined;

      // Sem CPF não dá pra casar com um colaborador já existente com segurança — trata sempre como novo
      // (senão um `cpf: undefined` no Prisma cai pro primeiro colaborador da empresa, casamento errado).
      const existing = cpfDigits
        ? await this.prisma.employee.findFirst({
            where: { tenantId, companyId: company.id, cpf: cpfDigits, deletedAt: null },
          })
        : null;

      if (dryRun) {
        results.push({ rowNumber: row.rowNumber, data: row, status: existing ? "update" : "new", errors: [] });
        continue;
      }

      const payload = {
        companyId: company.id,
        branchId,
        departmentId,
        positionId,
        name: row.name!.trim(),
        cpf: row.cpf,
        registration: row.matricula,
        birthDate: row.birthDate,
        admittedAt: row.admittedAt,
        inactivatedAt: row.inactivatedAt,
        sex: row.sex || undefined,
        status,
      };

      if (existing) {
        await this.employees.update(tenantId, existing.id, payload, userId!, assignments);
        results.push({ rowNumber: row.rowNumber, data: row, status: "update", errors: [] });
      } else {
        await this.employees.create(tenantId, payload as Parameters<EmployeesService["create"]>[1], userId!, assignments);
        results.push({ rowNumber: row.rowNumber, data: row, status: "new", errors: [] });
      }
    }

    return {
      fileName,
      totalRows: rows.length,
      newCount: results.filter((r) => r.status === "new").length,
      updatedCount: results.filter((r) => r.status === "update").length,
      errorCount: results.filter((r) => r.status === "error").length,
      duplicateCount: results.filter((r) => r.status === "duplicate").length,
      rows: results,
    };
  }

  private async resolveCompany(
    tenantId: string,
    assignments: RoleAssignmentClaim[],
    name: string,
    dryRun: boolean,
  ): Promise<{ id?: string; error?: string }> {
    const existing = await this.prisma.company.findFirst({
      where: { tenantId, deletedAt: null, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      if (!isCompanyInScope(assignments, PERMISSIONS.ORG_EMPLOYEE_WRITE, existing.id)) {
        return { error: `Empresa "${name}" está fora do seu escopo de acesso.` };
      }
      return { id: existing.id };
    }
    if (!hasTenantWideAccess(assignments, PERMISSIONS.ORG_COMPANY_WRITE)) {
      return { error: `Empresa "${name}" não encontrada — peça a um administrador para cadastrá-la antes.` };
    }
    if (dryRun) return {};
    const created = await this.prisma.company.create({ data: { tenantId, name } });
    return { id: created.id };
  }

  private async resolveNamed(
    tenantId: string,
    kind: "branch" | "department" | "position",
    companyId: string,
    name: string,
    dryRun: boolean,
  ): Promise<{ id?: string }> {
    const trimmed = name.trim();
    if (kind === "branch") {
      const existing = await this.prisma.branch.findFirst({
        where: { tenantId, companyId, deletedAt: null, name: { equals: trimmed, mode: "insensitive" } },
      });
      if (existing) return { id: existing.id };
      if (dryRun) return {};
      const created = await this.prisma.branch.create({ data: { tenantId, companyId, name: trimmed } });
      return { id: created.id };
    }
    if (kind === "department") {
      const existing = await this.prisma.department.findFirst({
        where: { tenantId, companyId, deletedAt: null, name: { equals: trimmed, mode: "insensitive" } },
      });
      if (existing) return { id: existing.id };
      if (dryRun) return {};
      const created = await this.prisma.department.create({ data: { tenantId, companyId, name: trimmed } });
      return { id: created.id };
    }
    const existing = await this.prisma.position.findFirst({
      where: { tenantId, companyId, deletedAt: null, name: { equals: trimmed, mode: "insensitive" } },
    });
    if (existing) return { id: existing.id };
    if (dryRun) return {};
    const created = await this.prisma.position.create({ data: { tenantId, companyId, name: trimmed } });
    return { id: created.id };
  }
}
