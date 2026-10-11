import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateInvoiceDto } from "./dto/finance.dto";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], companyId?: string) {
    const where = companyScopeWhere(assignments, PERMISSIONS.FINANCE_READ, tenantId);
    return this.prisma.invoice.findMany({
      where: { ...where, ...(companyId ? { companyId } : {}) },
      orderBy: { dueDate: "asc" },
    });
  }

  create(tenantId: string, dto: CreateInvoiceDto, userId: string, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.FINANCE_WRITE, dto.companyId);
    return this.prisma.invoice.create({
      data: { ...dto, dueDate: new Date(dto.dueDate), tenantId, createdById: userId },
    });
  }

  async markPaid(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.FINANCE_WRITE, tenantId);
    const invoice = await this.prisma.invoice.findFirst({ where: { ...where, id } });
    if (!invoice) throw new NotFoundException("Fatura não encontrada.");
    return this.prisma.invoice.update({ where: { id }, data: { status: "PAID", paidAt: new Date() } });
  }

  async remove(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.FINANCE_WRITE, tenantId);
    const invoice = await this.prisma.invoice.findFirst({ where: { ...where, id } });
    if (!invoice) throw new NotFoundException("Fatura não encontrada.");
    await this.prisma.invoice.delete({ where: { id } });
    return { success: true };
  }
}
