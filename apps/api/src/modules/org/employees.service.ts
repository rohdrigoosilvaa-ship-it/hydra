import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateEmployeeDto } from "./dto/org.dto";
import { assertCompanyInScope, employeeScopeWhere } from "./scope.util";

/** Só dígitos — evita duplicidade por formatação diferente (com/sem pontuação). */
export function normalizeCpf(cpf?: string | null): string | undefined {
  if (!cpf) return undefined;
  const digits = cpf.replace(/\D/g, "");
  return digits || undefined;
}

function toDateFields(dto: Partial<CreateEmployeeDto>) {
  return {
    birthDate: dto.birthDate !== undefined ? (dto.birthDate ? new Date(dto.birthDate) : undefined) : undefined,
    admittedAt: dto.admittedAt !== undefined ? (dto.admittedAt ? new Date(dto.admittedAt) : undefined) : undefined,
    inactivatedAt:
      dto.inactivatedAt !== undefined ? (dto.inactivatedAt ? new Date(dto.inactivatedAt) : undefined) : undefined,
    rgIssueDate: dto.rgIssueDate !== undefined ? (dto.rgIssueDate ? new Date(dto.rgIssueDate) : undefined) : undefined,
    rgExpiryDate:
      dto.rgExpiryDate !== undefined ? (dto.rgExpiryDate ? new Date(dto.rgExpiryDate) : undefined) : undefined,
    ctpsIssueDate:
      dto.ctpsIssueDate !== undefined ? (dto.ctpsIssueDate ? new Date(dto.ctpsIssueDate) : undefined) : undefined,
  };
}

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], companyId?: string) {
    const where = employeeScopeWhere(assignments, PERMISSIONS.ORG_EMPLOYEE_READ, tenantId);
    return this.prisma.employee.findMany({
      where: { ...where, ...(companyId ? { companyId } : {}) },
      include: { company: true, branch: true, unit: true, department: true, position: true },
      orderBy: { name: "asc" },
    });
  }

  async get(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = employeeScopeWhere(assignments, PERMISSIONS.ORG_EMPLOYEE_READ, tenantId);
    const employee = await this.prisma.employee.findFirst({
      where: { ...where, id },
      include: { company: true, branch: true, unit: true, department: true, position: true },
    });
    if (!employee) throw new NotFoundException("Colaborador não encontrado.");
    return this.attachAuditNames(employee);
  }

  create(tenantId: string, dto: CreateEmployeeDto, userId: string, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.ORG_EMPLOYEE_WRITE, dto.companyId);
    return this.prisma.employee.create({
      data: {
        ...dto,
        ...toDateFields(dto),
        cpf: normalizeCpf(dto.cpf),
        tenantId,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: Partial<CreateEmployeeDto>,
    userId: string,
    assignments: RoleAssignmentClaim[],
  ) {
    await this.assertWritable(tenantId, id, assignments);
    return this.prisma.employee.update({
      where: { id },
      data: {
        ...dto,
        ...toDateFields(dto),
        cpf: dto.cpf !== undefined ? normalizeCpf(dto.cpf) : undefined,
        updatedById: userId,
      },
    });
  }

  async remove(tenantId: string, id: string, userId: string, assignments: RoleAssignmentClaim[]) {
    await this.assertWritable(tenantId, id, assignments);
    return this.prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: userId },
    });
  }

  /**
   * Além de existir no tenant, o colaborador precisa estar dentro do escopo
   * (empresa/filial/unidade) que o vínculo do usuário concede para ORG_EMPLOYEE_WRITE —
   * sem isso, qualquer perfil com a permissão editaria colaboradores de fora do seu escopo.
   */
  private async assertWritable(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = employeeScopeWhere(assignments, PERMISSIONS.ORG_EMPLOYEE_WRITE, tenantId);
    const employee = await this.prisma.employee.findFirst({ where: { ...where, id } });
    if (!employee) throw new NotFoundException("Colaborador não encontrado.");
    return employee;
  }

  /** Mesmo padrão do CompaniesService — createdById/updatedById são strings soltas. */
  private async attachAuditNames<T extends { createdById: string | null; updatedById: string | null }>(
    employee: T,
  ) {
    const ids = [employee.createdById, employee.updatedById].filter((v): v is string => !!v);
    if (ids.length === 0) return { ...employee, createdByName: null, updatedByName: null };

    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    const nameOf = (id: string | null) => (id ? (users.find((u) => u.id === id)?.name ?? null) : null);

    return {
      ...employee,
      createdByName: nameOf(employee.createdById),
      updatedByName: nameOf(employee.updatedById),
    };
  }
}
