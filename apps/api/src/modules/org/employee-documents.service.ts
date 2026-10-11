import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateEmployeeDocumentDto } from "./dto/employee-documents.dto";
import { assertCompanyInScope, companyScopeWhere } from "./scope.util";

@Injectable()
export class EmployeeDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Usada tanto pela aba de documentos do colaborador quanto pelo Controle de Vencimentos. */
  list(tenantId: string, assignments: RoleAssignmentClaim[], employeeId?: string, companyId?: string) {
    const where = companyScopeWhere(assignments, PERMISSIONS.EMPLOYEE_DOCUMENT_READ, tenantId);
    return this.prisma.employeeDocument.findMany({
      where: {
        ...where,
        ...(employeeId ? { employeeId } : {}),
        ...(companyId ? { companyId } : {}),
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            company: { select: { id: true, name: true } },
            branch: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
            position: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { expiryDate: "asc" },
    });
  }

  async create(
    tenantId: string,
    dto: CreateEmployeeDocumentDto,
    userId: string,
    assignments: RoleAssignmentClaim[],
  ) {
    const employee = await this.prisma.employee.findFirst({ where: { id: dto.employeeId, tenantId } });
    if (!employee) throw new NotFoundException("Colaborador não encontrado.");
    assertCompanyInScope(assignments, PERMISSIONS.EMPLOYEE_DOCUMENT_WRITE, employee.companyId);

    return this.prisma.employeeDocument.create({
      data: {
        tenantId,
        companyId: employee.companyId,
        employeeId: employee.id,
        type: dto.type,
        name: dto.name,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        notes: dto.notes,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: Partial<CreateEmployeeDocumentDto>,
    userId: string,
    assignments: RoleAssignmentClaim[],
  ) {
    const doc = await this.assertWritable(tenantId, id, assignments);
    return this.prisma.employeeDocument.update({
      where: { id: doc.id },
      data: {
        type: dto.type,
        name: dto.name,
        issueDate: dto.issueDate !== undefined ? (dto.issueDate ? new Date(dto.issueDate) : null) : undefined,
        expiryDate: dto.expiryDate !== undefined ? (dto.expiryDate ? new Date(dto.expiryDate) : null) : undefined,
        notes: dto.notes,
        updatedById: userId,
      },
    });
  }

  async remove(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const doc = await this.assertWritable(tenantId, id, assignments);
    return this.prisma.employeeDocument.delete({ where: { id: doc.id } });
  }

  private async assertWritable(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.EMPLOYEE_DOCUMENT_WRITE, tenantId);
    const doc = await this.prisma.employeeDocument.findFirst({ where: { ...where, id } });
    if (!doc) throw new NotFoundException("Documento não encontrado.");
    return doc;
  }
}
